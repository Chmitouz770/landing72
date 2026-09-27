import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import type { ReportReason } from '@/types/database';

export const REPORT_REASONS: ReportReason[] = ['inappropriate', 'spam', 'safety', 'other'];

export function useReport() {
  const userId = useUserId();
  return useMutation({
    mutationFn: async (report: {
      reason: ReportReason;
      reportedUserId?: string | null;
      listingId?: string | null;
      details?: string;
    }) => {
      const { error } = await supabase.from('reports').insert({
        reporter_id: userId,
        reason: report.reason,
        reported_user_id: report.reportedUserId ?? null,
        listing_id: report.listingId ?? null,
        details: report.details?.trim() || null,
      });
      if (error) throw error;
    },
  });
}

/** Bloque un membre : ses annonces disparaissent et les échanges en cours sont terminés. */
export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('block_user', { p_user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });
}
