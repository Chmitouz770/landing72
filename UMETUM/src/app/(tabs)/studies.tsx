import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useUserId } from '@/features/auth/AuthProvider';
import { ConnectionCard } from '@/features/connections/ConnectionCard';
import { isAwaitingMe, useMyConnections } from '@/features/connections/api';
import { useListingsByOwner } from '@/features/listings/api';
import { ListingCard } from '@/features/listings/ListingCard';
import { Button, EmptyState, ErrorView, LoadingView, Screen, Section, Text } from '@/ui';

export default function Studies() {
  const { t } = useTranslation();
  const myId = useUserId();
  const connections = useMyConnections();
  const myListings = useListingsByOwner(myId);

  if (connections.isPending) return <LoadingView />;
  if (connections.isError) return <ErrorView onRetry={() => connections.refetch()} />;

  const all = connections.data;
  const toReview = all.filter((c) => isAwaitingMe(c, myId));
  const active = all.filter((c) => c.status === 'accepted');
  const sent = all.filter((c) => c.status === 'pending' && c.requested_by === myId);
  const listings = myListings.data ?? [];
  const isEmpty = toReview.length + active.length + sent.length === 0;

  return (
    <Screen
      edges={['top']}
      refreshing={connections.isRefetching}
      onRefresh={() => {
        connections.refetch();
        myListings.refetch();
      }}
    >
      <Text variant="title">{t('studies.title')}</Text>

      {isEmpty ? (
        <EmptyState
          icon="people-outline"
          title={t('studies.empty')}
          actionLabel={t('studies.emptyCta')}
          onAction={() => router.push('/explore')}
        />
      ) : null}

      {toReview.length > 0 ? (
        <Section title={t('studies.toReview')}>
          {toReview.map((c) => (
            <ConnectionCard key={c.id} connection={c} />
          ))}
        </Section>
      ) : null}

      {active.length > 0 ? (
        <Section title={t('studies.active')}>
          {active.map((c) => (
            <ConnectionCard key={c.id} connection={c} />
          ))}
        </Section>
      ) : null}

      {sent.length > 0 ? (
        <Section title={t('studies.sent')}>
          {sent.map((c) => (
            <ConnectionCard key={c.id} connection={c} />
          ))}
        </Section>
      ) : null}

      <Section title={t('studies.myListings')}>
        {listings.length === 0 ? (
          <Text tone="muted">{t('studies.noListings')}</Text>
        ) : (
          listings.map((l) => <ListingCard key={l.id} listing={l} showOwner={false} />)
        )}
        <Button
          title={t('explore.publishOffer')}
          icon="add"
          variant="secondary"
          onPress={() => router.push({ pathname: '/listing/new', params: { kind: 'offer' } })}
        />
      </Section>
    </Screen>
  );
}
