import { useQuery } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/AuthProvider';
import type { SessionWithPeople } from '@/features/sessions/api';
import { formatMoney } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Payout } from '@/types/database';

export type HourlyRate = { amount_cents: number; currency: string };

/** Tarif de lancement, utilisé tant que le réglage n'est pas chargé. */
const DEFAULT_RATE: HourlyRate = { amount_cents: 4000, currency: 'ils' };

/** Tarif horaire des enseignants (réglage `teacher_hourly_rate` en base). */
export function useTeacherRate(): HourlyRate {
  const { data } = useQuery({
    queryKey: ['app_settings', 'teacher_hourly_rate'],
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<HourlyRate> => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'teacher_hourly_rate')
        .maybeSingle();
      if (error) throw error;
      return (data?.value as HourlyRate | undefined) ?? DEFAULT_RATE;
    },
  });
  return data ?? DEFAULT_RATE;
}

/** « 40 ₪ » formaté dans la langue de l'app. */
export function useFormattedRate(): string {
  const rate = useTeacherRate();
  return formatMoney(rate.amount_cents, rate.currency);
}

const SESSION_SELECT =
  '*, connection:connections!study_sessions_connection_id_fkey(id, teacher_id, student_id, teacher:profiles!connections_teacher_id_fkey(id, display_name, avatar_url), student:profiles!connections_student_id_fkey(id, display_name, avatar_url))';

/** Séances données par moi depuis une date (validées ou en attente de validation). */
export function useMyTaughtSessions(since: Date) {
  const userId = useUserId();
  return useQuery({
    queryKey: ['earnings', 'sessions', userId, since.toISOString()],
    enabled: !!userId,
    queryFn: async (): Promise<SessionWithPeople[]> => {
      const { data, error } = await supabase
        .from('study_sessions')
        .select(SESSION_SELECT)
        .gte('starts_at', since.toISOString())
        .neq('status', 'cancelled')
        .order('starts_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data.filter((s) => s.connection?.teacher_id === userId);
    },
  });
}

export function useMyPayouts() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['earnings', 'payouts', userId],
    enabled: !!userId,
    queryFn: async (): Promise<Payout[]> => {
      const { data, error } = await supabase
        .from('payouts')
        .select('*')
        .order('period_start', { ascending: false })
        .limit(24);
      if (error) throw error;
      return data;
    },
  });
}
