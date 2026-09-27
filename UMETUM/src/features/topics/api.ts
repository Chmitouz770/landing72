import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { supabase } from '@/lib/supabase';
import type { Topic } from '@/types/database';
import { isIconName, type IconName } from '@/ui';

export function useTopics() {
  return useQuery({
    queryKey: ['topics'],
    staleTime: Infinity,
    queryFn: async (): Promise<Topic[]> => {
      const { data, error } = await supabase.from('topics').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}

export function useTopicsById(): Record<string, Topic> {
  const { data } = useTopics();
  return useMemo(() => Object.fromEntries((data ?? []).map((t) => [t.id, t])), [data]);
}

/** Nom d'une matière dans la langue de l'app. */
export function useTopicLabel() {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  return useCallback(
    (topic: Topic | null | undefined): string => {
      if (!topic) return '';
      return topic.names?.[lang] ?? topic.names?.en ?? topic.name_en ?? topic.name_fr;
    },
    [lang],
  );
}

export function topicIcon(topic: Topic | null | undefined): IconName {
  return topic && isIconName(topic.icon) ? topic.icon : 'book-outline';
}
