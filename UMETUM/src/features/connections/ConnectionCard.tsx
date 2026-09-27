import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useUserId } from '@/features/auth/AuthProvider';
import { notify } from '@/lib/dialogs';
import { spacing } from '@/theme';
import { Avatar, Badge, Button, Card, Text } from '@/ui';

import {
  getMyRole,
  getPeer,
  isAwaitingMe,
  useRespondConnection,
  type ConnectionWithPeople,
} from './api';

export function ConnectionCard({ connection }: { connection: ConnectionWithPeople }) {
  const { t } = useTranslation();
  const myId = useUserId();
  const respond = useRespondConnection();
  const peer = getPeer(connection, myId);
  const role = getMyRole(connection, myId);
  const awaitingMe = isAwaitingMe(connection, myId);
  const peerName = peer?.display_name ?? '—';

  const open = () => router.push({ pathname: '/connection/[id]', params: { id: connection.id } });

  const answer = (action: 'accept' | 'decline') =>
    respond.mutate(
      { id: connection.id, action },
      {
        onSuccess: () => {
          if (action === 'accept') open();
        },
        onError: () => notify(t('errors.generic')),
      },
    );

  return (
    <Card onPress={open} accessibilityLabel={peerName}>
      <View style={styles.row}>
        <Avatar name={peerName} uri={peer?.avatar_url} size={48} />
        <View style={styles.flex}>
          <Text variant="subheading" numberOfLines={2}>
            {awaitingMe
              ? t(role === 'teacher' ? 'studies.wantsToLearn' : 'studies.wantsToTeach', { name: peerName })
              : peerName}
          </Text>
          {connection.listing ? (
            <Text variant="small" tone="muted" numberOfLines={1}>
              {connection.listing.title}
            </Text>
          ) : null}
          <View style={styles.badges}>
            <Badge
              label={t(role === 'teacher' ? 'studies.asTeacher' : 'studies.asStudent')}
              tone="accent"
              icon={role === 'teacher' ? 'school-outline' : 'book-outline'}
            />
            {connection.status === 'pending' && !awaitingMe ? (
              <Badge label={t('studies.waiting')} tone="warning" icon="time-outline" />
            ) : null}
            {connection.status === 'declined' || connection.status === 'cancelled' ? (
              <Badge label={t(`connectionStatus.${connection.status}`)} />
            ) : null}
          </View>
        </View>
      </View>

      {awaitingMe && connection.intro_message ? (
        <Text variant="small" tone="muted" numberOfLines={3}>
          « {connection.intro_message} »
        </Text>
      ) : null}

      {awaitingMe ? (
        <View style={styles.actions}>
          <Button
            title={t('studies.decline')}
            variant="outline"
            onPress={() => answer('decline')}
            disabled={respond.isPending}
            style={styles.flex}
          />
          <Button
            title={t('studies.accept')}
            icon="checkmark"
            onPress={() => answer('accept')}
            loading={respond.isPending && respond.variables?.action === 'accept'}
            style={styles.flex}
          />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  flex: { flex: 1, gap: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
