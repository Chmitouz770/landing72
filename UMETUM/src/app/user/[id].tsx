import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useUserId } from '@/features/auth/AuthProvider';
import { useListingsByOwner } from '@/features/listings/api';
import { ListingCard } from '@/features/listings/ListingCard';
import { languageLabel } from '@/features/listings/options';
import { useProfile } from '@/features/profile/api';
import { useBlockUser } from '@/features/reports/api';
import { confirm, notify } from '@/lib/dialogs';
import { formatShortDate } from '@/lib/format';
import { spacing } from '@/theme';
import { Avatar, Badge, Button, ErrorView, LoadingView, Screen, Section, Text } from '@/ui';

export default function UserProfile() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const myId = useUserId();
  const profile = useProfile(id);
  const listings = useListingsByOwner(id);
  const block = useBlockUser();

  if (profile.isPending) return <LoadingView />;
  if (profile.isError) return <ErrorView onRetry={() => profile.refetch()} />;

  const p = profile.data;
  const isMe = p.id === myId;
  const items = (listings.data ?? []).filter((l) => isMe || l.status === 'active');

  const blockUser = async () => {
    const ok = await confirm(t('profile.blockConfirmTitle', { name: p.display_name }), t('profile.blockConfirmText'), {
      confirmLabel: t('profile.block'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    block.mutate(p.id, {
      onSuccess: () => (router.canGoBack() ? router.back() : router.replace('/')),
      onError: () => notify(t('errors.generic')),
    });
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: p.display_name }} />
      <View style={styles.header}>
        <Avatar name={p.display_name} uri={p.avatar_url} size={88} />
        <Text variant="title" center>
          {p.display_name}
        </Text>
        {p.city ? (
          <Text tone="muted" center>
            {p.city}
          </Text>
        ) : null}
        <View style={styles.badges}>
          {p.wants_to_teach ? <Badge label={t('profile.wantsToTeach')} icon="school-outline" tone="accent" /> : null}
          {p.wants_to_learn ? <Badge label={t('profile.wantsToLearn')} icon="book-outline" tone="accent" /> : null}
          {p.languages.map((code) => (
            <Badge key={code} label={languageLabel(t, code)} />
          ))}
        </View>
        {p.bio ? <Text center>{p.bio}</Text> : null}
        <Text variant="caption" tone="muted">
          {t('profile.memberSince', { date: formatShortDate(p.created_at) })}
        </Text>
      </View>

      <Section title={t('profile.listingsOf', { name: p.display_name })}>
        {items.length === 0 ? (
          <Text tone="muted">{t('profile.noPublicListings')}</Text>
        ) : (
          items.map((l) => <ListingCard key={l.id} listing={l} showOwner={false} />)
        )}
      </Section>

      {!isMe ? (
        <View>
          <Button
            title={t('profile.report')}
            variant="ghost"
            icon="flag-outline"
            onPress={() => router.push({ pathname: '/report', params: { userId: p.id } })}
          />
          <Button
            title={t('profile.block')}
            variant="ghost"
            icon="ban-outline"
            loading={block.isPending}
            onPress={blockUser}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, justifyContent: 'center' },
});
