import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useUserId } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import type { Connection, Listing, Profile } from '@/types/database';

export type PersonLite = Pick<Profile, 'id' | 'display_name' | 'avatar_url'>;
export type ConnectionWithPeople = Connection & {
  teacher: PersonLite | null;
  student: PersonLite | null;
  listing: Pick<Listing, 'id' | 'title' | 'topic_id' | 'kind'> | null;
};

const CONNECTION_SELECT =
  '*, teacher:profiles!connections_teacher_id_fkey(id, display_name, avatar_url), student:profiles!connections_student_id_fkey(id, display_name, avatar_url), listing:listings!connections_listing_id_fkey(id, title, topic_id, kind)';

export const connectionKeys = {
  all: ['connections'] as const,
  mine: ['connections', 'mine'] as const,
  detail: (id: string) => ['connections', 'detail', id] as const,
  forListing: (listingId: string) => ['connections', 'listing', listingId] as const,
};

export function getMyRole(connection: Connection, myId: string): 'teacher' | 'student' {
  return connection.teacher_id === myId ? 'teacher' : 'student';
}

export function getPeer(connection: ConnectionWithPeople, myId: string): PersonLite | null {
  return connection.teacher_id === myId ? connection.student : connection.teacher;
}

/** La demande attend MA réponse. */
export function isAwaitingMe(connection: Connection, myId: string): boolean {
  return connection.status === 'pending' && connection.requested_by !== myId;
}

export function useMyConnections() {
  return useQuery({
    queryKey: connectionKeys.mine,
    queryFn: async (): Promise<ConnectionWithPeople[]> => {
      const { data, error } = await supabase
        .from('connections')
        .select(CONNECTION_SELECT)
        .order('updated_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });
}

export function useConnection(id: string | undefined) {
  return useQuery({
    queryKey: connectionKeys.detail(id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<ConnectionWithPeople | null> => {
      const { data, error } = await supabase
        .from('connections')
        .select(CONNECTION_SELECT)
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Ma demande en cours pour une annonce (pour afficher « Demande envoyée »). */
export function useMyOpenRequest(listingId: string | undefined) {
  const userId = useUserId();
  return useQuery({
    queryKey: connectionKeys.forListing(listingId ?? ''),
    enabled: !!listingId && !!userId,
    queryFn: async (): Promise<Connection | null> => {
      const { data, error } = await supabase
        .from('connections')
        .select('*')
        .eq('listing_id', listingId!)
        .eq('requested_by', userId)
        .in('status', ['pending', 'accepted'])
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useRequestConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ listingId, message }: { listingId: string; message?: string }) => {
      const { data, error } = await supabase.rpc('request_connection', {
        p_listing_id: listingId,
        p_message: message ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: connectionKeys.all }),
  });
}

export function useRespondConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'accept' | 'decline' | 'cancel' }) => {
      const { data, error } = await supabase.rpc('respond_connection', {
        p_connection_id: id,
        p_action: action,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: connectionKeys.all }),
  });
}

/** Rafraîchit les mises en relation en temps réel (nouvelle demande, acceptation...). */
export function useConnectionsRealtime() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`connections:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, () => {
        queryClient.invalidateQueries({ queryKey: connectionKeys.all });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
