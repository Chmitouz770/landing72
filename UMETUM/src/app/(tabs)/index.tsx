import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useUserId } from '@/features/auth/AuthProvider';
import { isAwaitingMe, useMyConnections } from '@/features/connections/api';
import { useMySubscription } from '@/features/donations/api';
import { useListingFeed } from '@/features/listings/api';
import { ListingCard } from '@/features/listings/ListingCard';
import { useMyProfile } from '@/features/profile/api';
import { useFormattedRate } from '@/features/earnings/api';
import { useSessionsToConfirm, useUpcomingSessions } from '@/features/sessions/api';
import { SessionCard } from '@/features/sessions/SessionCard';
import { radius, spacing, useTheme } from '@/theme';
import { Avatar, Button, Card, ChevronIcon, Icon, Screen, Section, Text, type IconName } from '@/ui';

export default function Home() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const myId = useUserId();
  const { data: profile } = useMyProfile();
  const connections = useMyConnections();
  const sessions = useUpcomingSessions();
  const subscription = useMySubscription();
  const toConfirm = useSessionsToConfirm();
  const rate = useFormattedRate();
  const latest = useListingFeed({
    kind: 'offer',
    excludeOwnerId: myId,
  });

  const awaiting = (connections.data ?? []).filter((c) => isAwaitingMe(c, myId)).length;
  const latestOffers = latest.data?.pages[0]?.slice(0, 3) ?? [];
  const upcoming = sessions.data?.slice(0, 3) ?? [];

  const refresh = () => {
    connections.refetch();
    sessions.refetch();
    latest.refetch();
    subscription.refetch();
    toConfirm.refetch();
  };

  return (
    <Screen edges={['top']} refreshing={latest.isRefetching} onRefresh={refresh}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text variant="title">{t('home.greeting', { name: profile?.display_name ?? '' })}</Text>
          <Text tone="muted">{t('home.subtitle')}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/profile')}>
          <Avatar name={profile?.display_name ?? '?'} uri={profile?.avatar_url} size={48} />
        </Pressable>
      </View>

      <View style={styles.ctas}>
        <BigAction
          icon="book"
          title={t('home.learnCta')}
          description={t('home.learnCtaDesc')}
          onPress={() => router.push({ pathname: '/explore', params: { kind: 'offer' } })}
          primary
        />
        <BigAction
          icon="school"
          title={t('home.teachCta')}
          description={t('home.teachCtaDesc', { rate })}
          onPress={() => router.push({ pathname: '/listing/new', params: { kind: 'offer' } })}
        />
      </View>

      {awaiting > 0 ? (
        <Card tone="accent" onPress={() => router.push('/studies')}>
          <View style={styles.row}>
            <Icon name="notifications" size={22} color={colors.accent} />
            <Text variant="subheading" style={styles.flex}>
              {t('home.pending', { count: awaiting })}
            </Text>
            <ChevronIcon color={colors.text} />
          </View>
        </Card>
      ) : null}

      {(toConfirm.data ?? []).length > 0 ? (
        <Section title={t('home.toConfirm')}>
          {toConfirm.data!.slice(0, 3).map((s) => (
            <SessionCard key={s.id} session={s} />
          ))}
        </Section>
      ) : null}

      {upcoming.length > 0 ? (
        <Section title={t('home.upcoming')}>
          {upcoming.map((s) => (
            <SessionCard key={s.id} session={s} />
          ))}
        </Section>
      ) : null}

      {latestOffers.length > 0 ? (
        <Section
          title={t('home.latestOffers')}
          action={t('common.seeAll')}
          onAction={() => router.push({ pathname: '/explore', params: { kind: 'offer' } })}
        >
          {latestOffers.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </Section>
      ) : null}

      {subscription.data ? (
        <Card tone="muted">
          <View style={styles.row}>
            <Icon name="heart" size={20} color={colors.accent} />
            <Text variant="small" style={styles.flex}>
              {t('home.supporter')}
            </Text>
          </View>
        </Card>
      ) : (
        <Card tone="accent">
          <View style={styles.row}>
            <Icon name="heart" size={22} color={colors.accent} />
            <Text variant="subheading" style={styles.flex}>
              {t('home.supportTitle')}
            </Text>
          </View>
          <Text variant="small">{t('home.supportText')}</Text>
          <Button title={t('home.supportCta')} icon="heart-outline" onPress={() => router.push('/donate')} />
        </Card>
      )}
    </Screen>
  );
}

function BigAction({
  icon,
  title,
  description,
  onPress,
  primary,
}: {
  icon: IconName;
  title: string;
  description: string;
  onPress: () => void;
  primary?: boolean;
}) {
  const { colors } = useTheme();
  const fg = primary ? colors.onPrimary : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.bigAction,
        {
          backgroundColor: primary ? colors.primary : colors.surface,
          borderColor: primary ? colors.primary : colors.border,
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Icon name={icon} size={30} color={primary ? colors.onPrimary : colors.accent} />
      <Text variant="subheading" style={{ color: fg }}>
        {title}
      </Text>
      <Text variant="small" style={{ color: fg, opacity: 0.85 }}>
        {description}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  flex: { flex: 1 },
  ctas: { flexDirection: 'row', gap: spacing.md },
  bigAction: {
    flex: 1,
    minHeight: 150,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
