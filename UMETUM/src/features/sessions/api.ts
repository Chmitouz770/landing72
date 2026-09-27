import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/AuthProvider';
import type { PersonLite } from '@/features/connections/api';
import { supabase } from '@/lib/supabase';
import type { Connection, SessionMode, StudySession } from '@/types/database';

export type SessionWithPeople = StudySession & {
  connection:
    | (Pick<Connection, 'id' | 'teacher_id' | 'student_id'> & {
        teacher: PersonLite | null;
        student: PersonLite | null;
      })
    | null;
};

const SESSION_SELECT =
  '*, connection:connections!study_sessions_connection_id_fkey(id, teacher_id, student_id, teacher:profiles!connections_teacher_id_fkey(id, display_name, avatar_url), student:profiles!connections_student_id_fkey(id, display_name, avatar_url))';

/** Fenêtre d'ouverture de la visio (identique à l'Edge Function livekit-token). */
export const JOIN_EARLY_MINUTES = 60;
export const JOIN_LATE_HOURS = 6;

export const sessionKeys = {
  all: ['sessions'] as const,
  upcoming: ['sessions', 'upcoming'] as const,
  forConnection: (connectionId: string) => ['sessions', 'connection', connectionId] as const,
  detail: (id: string) => ['sessions', 'detail', id] as const,
};

export function canJoinSession(session: StudySession, now = Date.now()): boolean {
  if (session.mode !== 'video' || session.status !== 'scheduled') return false;
  const start = new Date(session.starts_at).getTime();
  return now >= start - JOIN_EARLY_MINUTES * 60_000 && now <= start + JOIN_LATE_HOURS * 3_600_000;
}

/** Erreur renvoyée par la base quand on planifie un samedi. */
export function isShabbatError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { message?: string }).message === 'shabbat';
}

/** La séance est terminée (heure de fin passée). */
export function sessionEnded(session: StudySession, now = Date.now()): boolean {
  return new Date(session.starts_at).getTime() + session.duration_minutes * 60_000 <= now;
}

/** La séance est finie et attend MA confirmation (enseignant ou élève). */
export function needsMyConfirmation(session: SessionWithPeople, myId: string, now = Date.now()): boolean {
  if (session.status !== 'scheduled' || !sessionEnded(session, now) || !session.connection) return false;
  return session.connection.teacher_id === myId ? !session.teacher_confirmed_at : !session.student_confirmed_at;
}

export function sessionPeer(session: SessionWithPeople, myId: string): PersonLite | null {
  const c = session.connection;
  if (!c) return null;
  return c.teacher_id === myId ? c.student : c.teacher;
}

export function useUpcomingSessions() {
  return useQuery({
    queryKey: sessionKeys.upcoming,
    queryFn: async (): Promise<SessionWithPeople[]> => {
      const since = new Date(Date.now() - JOIN_LATE_HOURS * 3_600_000).toISOString();
      const { data, error } = await supabase
        .from('study_sessions')
        .select(SESSION_SELECT)
        .eq('status', 'scheduled')
        .gte('starts_at', since)
        .order('starts_at', { ascending: true })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });
}

export function useConnectionSessions(connectionId: string, enabled = true) {
  return useQuery({
    queryKey: sessionKeys.forConnection(connectionId),
    enabled: enabled && !!connectionId,
    queryFn: async (): Promise<SessionWithPeople[]> => {
      const { data, error } = await supabase
        .from('study_sessions')
        .select(SESSION_SELECT)
        .eq('connection_id', connectionId)
        .order('starts_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}

export function useSession(id: string | undefined) {
  return useQuery({
    queryKey: sessionKeys.detail(id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<SessionWithPeople | null> => {
      const { data, error } = await supabase
        .from('study_sessions')
        .select(SESSION_SELECT)
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Séances terminées qui attendent ma confirmation (pour rémunérer l'enseignant). */
export function useSessionsToConfirm() {
  const myId = useUserId();
  return useQuery({
    queryKey: [...sessionKeys.all, 'to-confirm', myId],
    enabled: !!myId,
    queryFn: async (): Promise<SessionWithPeople[]> => {
      const { data, error } = await supabase
        .from('study_sessions')
        .select(SESSION_SELECT)
        .eq('status', 'scheduled')
        .lte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data.filter((s) => needsMyConfirmation(s, myId));
    },
  });
}

export function useConfirmSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc('confirm_session', { p_session_id: id });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      queryClient.invalidateQueries({ queryKey: ['earnings'] });
    },
  });
}

/** Fuseau horaire de l'appareil (sert à appliquer la règle du Chabbat). */
export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jerusalem';
  } catch {
    return 'Asia/Jerusalem';
  }
}

export type SessionDraft = {
  connectionId: string;
  startsAt: Date;
  durationMinutes: number;
  mode: SessionMode;
  location?: string | null;
  notes?: string | null;
};

export function useCreateSession() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (draft: SessionDraft): Promise<StudySession> => {
      const { data, error } = await supabase
        .from('study_sessions')
        .insert({
          connection_id: draft.connectionId,
          created_by: userId,
          starts_at: draft.startsAt.toISOString(),
          duration_minutes: draft.durationMinutes,
          mode: draft.mode,
          location: draft.mode === 'in_person' ? draft.location?.trim() || null : null,
          notes: draft.notes?.trim() || null,
          timezone: deviceTimezone(),
        })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
  });
}

export function useCancelSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('study_sessions').update({ status: 'cancelled' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
  });
}
