import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useUserId } from '@/features/auth/AuthProvider';
import { useMessages, useSendMessage } from '@/features/chat/api';
import {
  getMyRole,
  getPeer,
  isAwaitingMe,
  useConnection,
  useRespondConnection,
} from '@/features/connections/api';
import {
  isShabbatError,
  JOIN_LATE_HOURS,
  needsMyConfirmation,
  useCancelSession,
  useConnectionSessions,
  useCreateSession,
} from '@/features/sessions/api';
import { SessionCard } from '@/features/sessions/SessionCard';
import { confirm, notify } from '@/lib/dialogs';
import { formatTime } from '@/lib/format';
import { useNow } from '@/lib/useNow';
import { MAX_CONTENT_WIDTH, radius, spacing, typography, useTheme } from '@/theme';
import type { Message } from '@/types/database';
import { Badge, Button, Card, EmptyState, ErrorView, Icon, LoadingView, Text } from '@/ui';

export default function ConnectionScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const headerHeight = useHeaderHeight();
  const { id } = useLocalSearchParams<{ id: string }>();
  const myId = useUserId();

  const connection = useConnection(id);
  const accepted = connection.data?.status === 'accepted';
  const messages = useMessages(id, accepted);
  const sessions = useConnectionSessions(id, accepted);
  const respond = useRespondConnection();
  const createSession = useCreateSession();
  const cancelSession = useCancelSession();
  const now = useNow();

  if (connection.isPending) return <LoadingView />;
  if (connection.isError) return <ErrorView onRetry={() => connection.refetch()} />;
  if (!connection.data) return <EmptyState icon="alert-circle-outline" title={t('errors.generic')} />;

  const c = connection.data;
  const peer = getPeer(c, myId);
  const peerName = peer?.display_name ?? '';
  const role = getMyRole(c, myId);
  const awaitingMe = isAwaitingMe(c, myId);
  const isOpen = c.status === 'pending' || c.status === 'accepted';

  const nextSession = (sessions.data ?? [])
    .filter((s) => s.status === 'scheduled' && new Date(s.starts_at).getTime() + JOIN_LATE_HOURS * 3_600_000 > now)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];

  const endConnection = async () => {
    const ok = await confirm(t('connection.endConfirm'), undefined, {
      confirmLabel: t('connection.end'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (ok) respond.mutate({ id: c.id, action: 'cancel' });
  };

  const callNow = () =>
    createSession.mutate(
      { connectionId: c.id, startsAt: new Date(), durationMinutes: 45, mode: 'video' },
      {
        onSuccess: (session) =>
          router.push({ pathname: '/call/[sessionId]', params: { sessionId: session.id } }),
        onError: (e) => notify(isShabbatError(e) ? t('session.shabbat') : t('errors.generic')),
      },
    );

  const cancelNext = async () => {
    if (!nextSession) return;
    const ok = await confirm(t('session.cancelConfirm'), undefined, {
      confirmLabel: t('session.cancel'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (ok) cancelSession.mutate(nextSession.id);
  };

  return (
    <SafeAreaView edges={['bottom']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: peerName,
          headerRight: () => (
            <View style={styles.headerActions}>
              {peer ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('connection.viewProfile')}
                  onPress={() => router.push({ pathname: '/user/[id]', params: { id: peer.id } })}
                  hitSlop={10}
                >
                  <Icon name="person-circle-outline" size={26} color={colors.text} />
                </Pressable>
              ) : null}
              {isOpen ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('connection.end')}
                  onPress={endConnection}
                  hitSlop={10}
                >
                  <Icon name="close-circle-outline" size={26} color={colors.text} />
                </Pressable>
              ) : null}
            </View>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={headerHeight}
      >
        <View style={[styles.flex, styles.column]}>
          <View style={styles.top}>
            <View style={styles.row}>
              <Badge
                label={t(role === 'teacher' ? 'studies.asTeacher' : 'studies.asStudent')}
                tone="accent"
                icon={role === 'teacher' ? 'school-outline' : 'book-outline'}
              />
              {c.listing ? (
                <Text variant="small" tone="muted" numberOfLines={1} style={styles.flex}>
                  {c.listing.title}
                </Text>
              ) : null}
            </View>

            {accepted ? (
              <View style={styles.row}>
                <Button
                  title={t('connection.schedule')}
                  icon="calendar-outline"
                  variant="secondary"
                  style={styles.flex}
                  onPress={() =>
                    router.push({ pathname: '/schedule/[connectionId]', params: { connectionId: c.id } })
                  }
                />
                <Button
                  title={t('connection.callNow')}
                  icon="videocam"
                  style={styles.flex}
                  loading={createSession.isPending}
                  onPress={callNow}
                />
              </View>
            ) : null}

            {accepted && nextSession ? (
              <SessionCard session={nextSession} showPeer={false} onCancel={cancelNext} compact />
            ) : null}

            {(sessions.data ?? [])
              .filter((s) => needsMyConfirmation(s, myId, now))
              .slice(0, 2)
              .map((s) => (
                <SessionCard key={s.id} session={s} showPeer={false} />
              ))}
          </View>

          {accepted ? (
            <Chat messages={messages.data ?? []} myId={myId} connectionId={c.id} />
          ) : (
            <View style={styles.status}>
              {awaitingMe ? (
                <Card>
                  <Text variant="subheading">{t('connection.pendingRecipient', { name: peerName })}</Text>
                  {c.intro_message ? <Text tone="muted">« {c.intro_message} »</Text> : null}
                  <View style={styles.row}>
                    <Button
                      title={t('studies.decline')}
                      variant="outline"
                      style={styles.flex}
                      disabled={respond.isPending}
                      onPress={() => respond.mutate({ id: c.id, action: 'decline' })}
                    />
                    <Button
                      title={t('studies.accept')}
                      icon="checkmark"
                      style={styles.flex}
                      loading={respond.isPending}
                      onPress={() => respond.mutate({ id: c.id, action: 'accept' })}
                    />
                  </View>
                </Card>
              ) : (
                <EmptyState
                  icon={c.status === 'pending' ? 'time-outline' : 'checkmark-done-outline'}
                  title={c.status === 'pending' ? t('connection.pendingRequester') : t('connection.closedInfo')}
                />
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Chat({ messages, myId, connectionId }: { messages: Message[]; myId: string; connectionId: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const send = useSendMessage(connectionId);
  const [draft, setDraft] = useState('');

  const submit = () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    send.mutate(body, {
      onError: () => {
        setDraft(body);
        notify(t('errors.generic'));
      },
    });
  };

  return (
    <>
      <FlatList
        style={styles.flex}
        data={messages}
        inverted={messages.length > 0}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.messages}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text tone="muted" center style={{ padding: spacing.xl }}>
            {t('connection.chatEmpty')}
          </Text>
        }
        renderItem={({ item }) => {
          const mine = item.sender_id === myId;
          return (
            <View
              style={[
                styles.bubble,
                mine
                  ? [styles.mine, { backgroundColor: colors.primary }]
                  : [styles.theirs, { backgroundColor: colors.surface, borderColor: colors.border }],
              ]}
            >
              <Text style={{ color: mine ? colors.onPrimary : colors.text }}>{item.body}</Text>
              <Text variant="caption" style={{ color: mine ? colors.onPrimary : colors.textMuted, opacity: 0.7 }}>
                {formatTime(item.created_at)}
              </Text>
            </View>
          );
        }}
      />
      <View style={[styles.composer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={t('connection.chatPlaceholder')}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={t('connection.chatPlaceholder')}
          multiline
          maxLength={4000}
          style={[
            styles.input,
            typography.body,
            { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.send')}
          onPress={submit}
          disabled={!draft.trim()}
          style={[styles.send, { backgroundColor: colors.primary, opacity: draft.trim() ? 1 : 0.4 }]}
        >
          <Icon name="send" size={20} color={colors.onPrimary} />
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  column: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  top: { padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  status: { flex: 1, padding: spacing.lg },
  messages: { padding: spacing.lg, gap: spacing.sm },
  bubble: { maxWidth: '80%', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 2 },
  mine: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', borderWidth: 1, borderBottomLeftRadius: 4 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
