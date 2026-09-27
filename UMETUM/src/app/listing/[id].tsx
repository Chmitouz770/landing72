import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useUserId } from '@/features/auth/AuthProvider';
import { useMyOpenRequest, useRequestConnection } from '@/features/connections/api';
import { useListing, useSetListingStatus } from '@/features/listings/api';
import { FORMAT_ICONS, languageLabel } from '@/features/listings/options';
import { topicIcon, useTopicLabel } from '@/features/topics/api';
import { notify } from '@/lib/dialogs';
import { spacing, useTheme } from '@/theme';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ChevronIcon,
  EmptyState,
  ErrorView,
  Icon,
  LoadingView,
  Screen,
  Text,
  TextField,
} from '@/ui';

export default function ListingDetail() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const myId = useUserId();
  const listing = useListing(id);
  const openRequest = useMyOpenRequest(id);
  const requestConnection = useRequestConnection();
  const setStatus = useSetListingStatus();
  const topicLabel = useTopicLabel();
  const [message, setMessage] = useState('');

  if (listing.isPending) return <LoadingView />;
  if (listing.isError) return <ErrorView onRetry={() => listing.refetch()} />;
  if (!listing.data) {
    return (
      <Screen>
        <EmptyState icon="alert-circle-outline" title={t('listing.notFound')} />
      </Screen>
    );
  }

  const l = listing.data;
  const isMine = l.owner_id === myId;
  const existing = openRequest.data;

  const send = () =>
    requestConnection.mutate(
      { listingId: l.id, message },
      {
        onSuccess: () => openRequest.refetch(),
        onError: () => notify(t('errors.generic')),
      },
    );

  const footer = isMine ? (
    <View style={styles.row}>
      <Button
        title={t('common.edit')}
        icon="create-outline"
        variant="secondary"
        style={styles.flex}
        onPress={() => router.push({ pathname: '/listing/new', params: { id: l.id } })}
      />
      <Button
        title={l.status === 'active' ? t('listing.pause') : t('listing.resume')}
        variant="outline"
        style={styles.flex}
        loading={setStatus.isPending}
        onPress={() => setStatus.mutate({ id: l.id, status: l.status === 'active' ? 'paused' : 'active' })}
      />
    </View>
  ) : existing ? (
    <>
      <View style={styles.sentRow}>
        <Icon name="checkmark-circle" size={20} color={colors.success} />
        <Text tone="success" bold>
          {t('listing.alreadyRequested')}
        </Text>
      </View>
      <Button
        title={t('listing.openConversation')}
        size="lg"
        block
        icon="chatbubbles-outline"
        onPress={() => router.push({ pathname: '/connection/[id]', params: { id: existing.id } })}
      />
    </>
  ) : (
    <Button
      title={l.kind === 'offer' ? t('listing.requestToLearn') : t('listing.offerToTeach')}
      size="lg"
      block
      icon="hand-right-outline"
      loading={requestConnection.isPending}
      onPress={send}
    />
  );

  return (
    <Screen footer={footer}>
      <Stack.Screen options={{ title: topicLabel(l.topic) }} />

      <View style={styles.row}>
        <View style={[styles.topicIcon, { backgroundColor: colors.accentSoft }]}>
          <Icon name={topicIcon(l.topic)} size={22} color={colors.accent} />
        </View>
        <Badge label={t(`kind.${l.kind}`)} tone="accent" />
        {l.status !== 'active' ? (
          <Badge
            label={t(l.status === 'paused' ? 'listing.status_paused' : 'listing.status_closed')}
            tone="warning"
          />
        ) : null}
      </View>

      <Text variant="title">{l.title}</Text>

      <View style={styles.badges}>
        <Badge label={t(`format.${l.format}`)} icon={FORMAT_ICONS[l.format]} />
        <Badge label={t(`level.${l.level}`)} />
        {l.languages.map((code) => (
          <Badge key={code} label={languageLabel(t, code)} />
        ))}
      </View>

      {l.description ? <Text>{l.description}</Text> : null}

      {l.availability ? (
        <InfoLine icon="time-outline" label={t('listing.availabilityLabel')} value={l.availability} />
      ) : null}
      {l.city ? <InfoLine icon="location-outline" label={t('listing.cityLabel')} value={l.city} /> : null}

      {l.owner ? (
        <Card onPress={() => router.push({ pathname: '/user/[id]', params: { id: l.owner!.id } })}>
          <View style={styles.row}>
            <Avatar name={l.owner.display_name} uri={l.owner.avatar_url} size={48} />
            <View style={styles.flex}>
              <Text variant="subheading">{l.owner.display_name}</Text>
              <Text variant="small" tone="muted">
                {isMine ? t('listing.yours') : t('listing.viewProfile')}
              </Text>
            </View>
            <ChevronIcon color={colors.textMuted} />
          </View>
        </Card>
      ) : null}

      {!isMine && !existing ? (
        <TextField
          label={`${t('listing.messageLabel')} (${t('common.optional')})`}
          placeholder={t('listing.messagePlaceholder')}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={1000}
        />
      ) : null}

      {isMine && l.status !== 'closed' ? (
        <Button
          title={t('listing.closeListing')}
          variant="ghost"
          onPress={() => setStatus.mutate({ id: l.id, status: 'closed' }, { onSuccess: () => router.back() })}
        />
      ) : null}

      {!isMine ? (
        <Button
          title={t('report.title')}
          variant="ghost"
          icon="flag-outline"
          onPress={() =>
            router.push({ pathname: '/report', params: { listingId: l.id, userId: l.owner_id } })
          }
        />
      ) : null}
    </Screen>
  );
}

function InfoLine({ icon, label, value }: { icon: 'time-outline' | 'location-outline'; label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Icon name={icon} size={20} color={colors.textMuted} />
      <View style={styles.flex}>
        <Text variant="caption" tone="muted">
          {label}
        </Text>
        <Text>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  topicIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  sentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center' },
});
