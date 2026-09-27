import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useUserId } from '@/features/auth/AuthProvider';
import { relativeDayLabel } from '@/lib/dates';
import { formatTime } from '@/lib/format';
import { useNow } from '@/lib/useNow';
import { spacing, useTheme } from '@/theme';
import { Avatar, Badge, Button, Card, Icon, Text } from '@/ui';

import { canJoinSession, sessionPeer, type SessionWithPeople } from './api';

type Props = {
  session: SessionWithPeople;
  /** Affiche le nom de l'autre participant (liste globale). */
  showPeer?: boolean;
  onCancel?: () => void;
  /** Version sur une ligne (en tête de conversation). */
  compact?: boolean;
};

export function SessionCard({ session, showPeer = true, onCancel, compact }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const myId = useUserId();
  const now = useNow();
  const peer = sessionPeer(session, myId);
  const start = new Date(session.starts_at);
  const isFuture = start.getTime() > now;
  const joinable = canJoinSession(session, now);
  const cancelled = session.status === 'cancelled';
  const join = () => router.push({ pathname: '/call/[sessionId]', params: { sessionId: session.id } });

  if (compact) {
    return (
      <View style={[styles.compact, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {!joinable ? (
          <Icon
            name={session.mode === 'video' ? 'videocam-outline' : 'location-outline'}
            size={20}
            color={colors.accent}
          />
        ) : null}
        <View style={styles.flex}>
          <Text variant="small" bold numberOfLines={1}>
            {relativeDayLabel(start)} · {formatTime(session.starts_at)}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {session.mode === 'in_person' && session.location
              ? session.location
              : session.notes || t('session.minutes', { count: session.duration_minutes })}
          </Text>
        </View>
        {joinable ? <Button title={t('session.joinShort')} icon="videocam" onPress={join} /> : null}
        {onCancel && !cancelled && isFuture ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('session.cancel')} onPress={onCancel} hitSlop={8}>
            <Icon name="close-circle-outline" size={24} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <Card
      onPress={
        showPeer && session.connection
          ? () => router.push({ pathname: '/connection/[id]', params: { id: session.connection_id } })
          : undefined
      }
    >
      <View style={styles.row}>
        <View style={[styles.date, { backgroundColor: colors.accentSoft }]}>
          <Text variant="caption" center numberOfLines={1}>
            {relativeDayLabel(start)}
          </Text>
          <Text variant="subheading" center>
            {formatTime(session.starts_at)}
          </Text>
        </View>
        <View style={styles.flex}>
          {showPeer && peer ? (
            <View style={styles.peer}>
              <Avatar name={peer.display_name} uri={peer.avatar_url} size={22} />
              <Text variant="small" bold numberOfLines={1} style={styles.flex}>
                {t('session.withName', { name: peer.display_name })}
              </Text>
            </View>
          ) : null}
          <View style={styles.badges}>
            <Badge
              label={session.mode === 'video' ? t('format.video') : t('session.inPerson')}
              icon={session.mode === 'video' ? 'videocam-outline' : 'location-outline'}
            />
            <Badge label={t('session.minutes', { count: session.duration_minutes })} />
            {cancelled ? <Badge label={t('session.cancelled')} tone="danger" /> : null}
          </View>
          {session.mode === 'in_person' && session.location ? (
            <Text variant="small" tone="muted" numberOfLines={2}>
              {session.location}
            </Text>
          ) : null}
          {session.notes ? (
            <Text variant="small" tone="muted" numberOfLines={2}>
              {session.notes}
            </Text>
          ) : null}
        </View>
      </View>

      {joinable ? (
        <Button
          title={t('session.join')}
          icon="videocam"
          onPress={join}
        />
      ) : session.mode === 'video' && !cancelled && isFuture ? (
        <Text variant="caption" tone="muted">
          {t('session.joinSoon')}
        </Text>
      ) : null}

      {onCancel && !cancelled && isFuture ? (
        <Button title={t('session.cancel')} variant="ghost" onPress={onCancel} />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  date: { width: 84, paddingVertical: spacing.sm, borderRadius: 12, alignItems: 'center' },
  flex: { flex: 1, gap: spacing.xs },
  peer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
