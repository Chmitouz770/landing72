import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useUserId } from '@/features/auth/AuthProvider';
import { useListingFeed, type ListingFilters } from '@/features/listings/api';
import { ListingCard } from '@/features/listings/ListingCard';
import { FORMAT_ICONS } from '@/features/listings/options';
import { topicIcon, useTopicLabel, useTopics } from '@/features/topics/api';
import { MAX_CONTENT_WIDTH, spacing, useTheme } from '@/theme';
import type { ListingKind } from '@/types/database';
import {
  Button,
  ChoiceChips,
  EmptyState,
  ErrorView,
  SegmentedControl,
  Text,
  TextField,
  type ChoiceOption,
} from '@/ui';

const ALL = 'all';
type FormatFilter = typeof ALL | 'video' | 'in_person';

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function Explore() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ kind?: ListingKind }>();
  const myId = useUserId();
  const { data: topics } = useTopics();
  const topicLabel = useTopicLabel();

  const [kind, setKind] = useState<ListingKind>(params.kind === 'request' ? 'request' : 'offer');
  const [topicId, setTopicId] = useState<string>(ALL);
  const [format, setFormat] = useState<FormatFilter>(ALL);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search);

  // Suit le paramètre `kind` quand on arrive depuis l'accueil (« Je veux apprendre »).
  const [paramKind, setParamKind] = useState(params.kind);
  if (params.kind !== paramKind) {
    setParamKind(params.kind);
    if (params.kind === 'offer' || params.kind === 'request') setKind(params.kind);
  }

  const filters: ListingFilters = {
    kind,
    topicId: topicId === ALL ? null : topicId,
    format: format === ALL ? null : format,
    search: debouncedSearch,
    excludeOwnerId: myId,
  };
  const feed = useListingFeed(filters);
  const listings = useMemo(() => feed.data?.pages.flat() ?? [], [feed.data]);

  const topicOptions: ChoiceOption<string>[] = [
    { value: ALL, label: t('explore.allTopics') },
    ...(topics ?? []).map((topic) => ({ value: topic.id, label: topicLabel(topic), icon: topicIcon(topic) })),
  ];
  const formatChoices: ChoiceOption<FormatFilter>[] = [
    { value: ALL, label: t('explore.allFormats') },
    { value: 'video', label: t('format.video'), icon: FORMAT_ICONS.video },
    { value: 'in_person', label: t('format.in_person'), icon: FORMAT_ICONS.in_person },
  ];

  // Sur l'onglet « cours proposés », l'action naturelle est de publier une demande, et inversement.
  const publishKind: ListingKind = kind === 'offer' ? 'request' : 'offer';
  const publish = () => router.push({ pathname: '/listing/new', params: { kind: publishKind } });

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text variant="title" style={styles.flex}>
          {t('explore.title')}
        </Text>
        <Button title={t('explore.publish')} icon="add" variant="secondary" onPress={publish} />
      </View>
      <SegmentedControl
        options={[
          { value: 'offer', label: t('explore.offers') },
          { value: 'request', label: t('explore.requests') },
        ]}
        value={kind}
        onChange={setKind}
      />
      <TextField
        placeholder={t('explore.searchPlaceholder')}
        value={search}
        onChangeText={setSearch}
        returnKeyType="search"
        autoCorrect={false}
        clearButtonMode="while-editing"
        accessibilityLabel={t('explore.searchPlaceholder')}
      />
      <ChoiceChips options={topicOptions} value={topicId} onChange={setTopicId} scroll />
      <ChoiceChips options={formatChoices} value={format} onChange={setFormat} scroll />
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ListingCard listing={item} />}
        ListHeaderComponent={header}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshing={feed.isRefetching && !feed.isFetchingNextPage}
        onRefresh={() => feed.refetch()}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
        }}
        ListEmptyComponent={
          feed.isPending ? (
            <ActivityIndicator style={styles.loader} color={colors.textMuted} />
          ) : feed.isError ? (
            <ErrorView onRetry={() => feed.refetch()} />
          ) : (
            <EmptyState
              icon="search-outline"
              title={t('explore.empty')}
              message={kind === 'offer' ? t('explore.emptyOffersHint') : t('explore.emptyRequestsHint')}
              actionLabel={kind === 'offer' ? t('explore.publishRequest') : t('explore.publishOffer')}
              onAction={publish}
            />
          )
        }
        ListFooterComponent={
          feed.isFetchingNextPage ? <ActivityIndicator style={styles.loader} color={colors.textMuted} /> : null
        }
      />
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={{ height: spacing.md }} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  header: { gap: spacing.md, marginBottom: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  loader: { marginVertical: spacing.xl },
});
