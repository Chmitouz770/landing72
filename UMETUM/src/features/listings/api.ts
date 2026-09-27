import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import type {
  Database,
  Listing,
  ListingKind,
  ListingStatus,
  Profile,
  Topic,
} from '@/types/database';

export type ListingOwner = Pick<Profile, 'id' | 'display_name' | 'avatar_url' | 'city'>;
export type ListingWithOwner = Listing & { owner: ListingOwner | null; topic: Topic | null };

const LISTING_SELECT =
  '*, owner:profiles!listings_owner_id_fkey(id, display_name, avatar_url, city), topic:topics!listings_topic_id_fkey(*)';

const PAGE_SIZE = 20;

export type ListingFilters = {
  kind: ListingKind;
  topicId?: string | null;
  format?: 'video' | 'in_person' | null;
  search?: string;
  excludeOwnerId?: string;
};

export const listingKeys = {
  all: ['listings'] as const,
  feed: (filters: ListingFilters) => ['listings', 'feed', filters] as const,
  detail: (id: string) => ['listings', 'detail', id] as const,
  byOwner: (ownerId: string) => ['listings', 'owner', ownerId] as const,
};

/** Retire les caractères qui ont un sens dans la syntaxe de filtre PostgREST. */
function sanitizeSearch(input: string): string {
  return input.replace(/[%,()*\\"'.:]/g, ' ').trim();
}

export function useListingFeed(filters: ListingFilters) {
  return useInfiniteQuery({
    queryKey: listingKeys.feed(filters),
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<ListingWithOwner[]> => {
      const from = pageParam * PAGE_SIZE;
      let query = supabase
        .from('listings')
        .select(LISTING_SELECT)
        .eq('status', 'active')
        .eq('kind', filters.kind)
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (filters.topicId) query = query.eq('topic_id', filters.topicId);
      if (filters.format) query = query.in('format', [filters.format, 'both']);
      if (filters.excludeOwnerId) query = query.neq('owner_id', filters.excludeOwnerId);
      const search = sanitizeSearch(filters.search ?? '');
      if (search) query = query.or(`title.ilike.*${search}*,description.ilike.*${search}*`);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    getNextPageParam: (lastPage, pages) => (lastPage.length === PAGE_SIZE ? pages.length : undefined),
  });
}

export function useListing(id: string | undefined) {
  return useQuery({
    queryKey: listingKeys.detail(id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<ListingWithOwner | null> => {
      const { data, error } = await supabase
        .from('listings')
        .select(LISTING_SELECT)
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Annonces d'un membre (toutes si c'est moi, actives sinon — via la RLS). */
export function useListingsByOwner(ownerId: string | undefined) {
  return useQuery({
    queryKey: listingKeys.byOwner(ownerId ?? ''),
    enabled: !!ownerId,
    queryFn: async (): Promise<ListingWithOwner[]> => {
      const { data, error } = await supabase
        .from('listings')
        .select(LISTING_SELECT)
        .eq('owner_id', ownerId!)
        .neq('status', 'closed')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export type ListingDraft = Pick<
  Listing,
  | 'kind'
  | 'topic_id'
  | 'title'
  | 'description'
  | 'level'
  | 'format'
  | 'languages'
  | 'city'
  | 'availability'
>;

export function useSaveListing() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, draft }: { id?: string; draft: ListingDraft }): Promise<Listing> => {
      if (id) {
        const { data, error } = await supabase
          .from('listings')
          .update(draft)
          .eq('id', id)
          .select('*')
          .single();
        if (error) throw error;
        return data;
      }
      const insert: Database['public']['Tables']['listings']['Insert'] = { ...draft, owner_id: userId };
      const { data, error } = await supabase.from('listings').insert(insert).select('*').single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listingKeys.all }),
  });
}

export function useSetListingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ListingStatus }) => {
      const { error } = await supabase.from('listings').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listingKeys.all }),
  });
}
