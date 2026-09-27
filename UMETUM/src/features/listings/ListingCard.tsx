import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { topicIcon, useTopicLabel } from '@/features/topics/api';
import { spacing, useTheme } from '@/theme';
import { Avatar, Badge, Card, Icon, Text } from '@/ui';

import type { ListingWithOwner } from './api';
import { FORMAT_ICONS } from './options';

export function ListingCard({ listing, showOwner = true }: { listing: ListingWithOwner; showOwner?: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const topicLabel = useTopicLabel();

  return (
    <Card
      onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing.id } })}
      accessibilityLabel={listing.title}
    >
      <View style={styles.topRow}>
        <View style={[styles.topicIcon, { backgroundColor: colors.accentSoft }]}>
          <Icon name={topicIcon(listing.topic)} size={18} color={colors.accent} />
        </View>
        <Text variant="caption" tone="muted" style={styles.flex} numberOfLines={1}>
          {topicLabel(listing.topic).toUpperCase()}
        </Text>
        {listing.status !== 'active' ? (
          <Badge
            label={t(listing.status === 'paused' ? 'listing.status_paused' : 'listing.status_closed')}
            tone="warning"
          />
        ) : null}
      </View>

      <Text variant="subheading" numberOfLines={2}>
        {listing.title}
      </Text>

      <View style={styles.badges}>
        <Badge label={t(`format.${listing.format}`)} icon={FORMAT_ICONS[listing.format]} />
        <Badge label={t(`level.${listing.level}`)} />
        {listing.languages.slice(0, 3).map((code) => (
          <Badge key={code} label={code.toUpperCase()} />
        ))}
      </View>

      {showOwner && listing.owner ? (
        <View style={styles.owner}>
          <Avatar name={listing.owner.display_name} uri={listing.owner.avatar_url} size={28} />
          <Text variant="small" tone="muted" style={styles.flex} numberOfLines={1}>
            {listing.owner.display_name}
            {listing.owner.city ? ` · ${listing.owner.city}` : ''}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  topicIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  owner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
});
