import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useUserId } from '@/features/auth/AuthProvider';
import { isDemo } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/types/database';

const messageKey = (connectionId: string) => ['messages', connectionId] as const;

/** Ajoute un message en tête (liste du plus récent au plus ancien), sans doublon. */
function prepend(list: Message[] | undefined, message: Message): Message[] {
  const current = list ?? [];
  if (current.some((m) => m.id === message.id)) return current;
  return [message, ...current];
}

/** Messages d'une conversation, du plus récent au plus ancien, mis à jour en temps réel. */
export function useMessages(connectionId: string, enabled = true) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: messageKey(connectionId),
    enabled: enabled && !!connectionId,
    refetchInterval: isDemo ? 3_000 : false,
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('connection_id', connectionId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!enabled || !connectionId || isDemo) return;
    const channel = supabase
      .channel(`messages:${connectionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `connection_id=eq.${connectionId}`,
        },
        (payload) => {
          queryClient.setQueryData<Message[]>(messageKey(connectionId), (list) =>
            prepend(list, payload.new as Message),
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [connectionId, enabled, queryClient]);

  return query;
}

export function useSendMessage(connectionId: string) {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string): Promise<Message> => {
      const { data, error } = await supabase
        .from('messages')
        .insert({ connection_id: connectionId, sender_id: userId, body: body.trim() })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (message) => {
      queryClient.setQueryData<Message[]>(messageKey(connectionId), (list) => prepend(list, message));
    },
  });
}
