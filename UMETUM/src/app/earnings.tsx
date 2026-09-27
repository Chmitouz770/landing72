import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useFormattedRate, useMyPayouts, useMyTaughtSessions, useTeacherRate } from '@/features/earnings/api';
import { formatMoney, locale } from '@/lib/format';
import { spacing, useTheme } from '@/theme';
import { Badge, Card, Icon, Screen, Section, Text } from '@/ui';

function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default function Earnings() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rate = useTeacherRate();
  const rateLabel = useFormattedRate();
  const sessions = useMyTaughtSessions(startOfMonth());
  const payouts = useMyPayouts();

  const list = sessions.data ?? [];
  const validated = list.filter((s) => s.status === 'completed');
  const awaiting = list.filter((s) => s.status === 'scheduled' && s.teacher_confirmed_at);
  const minutes = validated.reduce((sum, s) => sum + s.duration_minutes, 0);
  const unpaidMinutes = validated.filter((s) => !s.payout_id).reduce((sum, s) => sum + s.duration_minutes, 0);
  const due = Math.round((unpaidMinutes * rate.amount_cents) / 60);

  const hours = new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(minutes / 60);
  const monthName = new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric' });

  return (
    <Screen
      refreshing={sessions.isRefetching}
      onRefresh={() => {
        sessions.refetch();
        payouts.refetch();
      }}
    >
      <Card tone="accent">
        <View style={styles.row}>
          <Icon name="wallet" size={24} color={colors.accent} />
          <Text variant="heading" style={styles.flex}>
            {t('earnings.rate', { rate: rateLabel })}
          </Text>
        </View>
        <Text variant="small">{t('earnings.explainer')}</Text>
      </Card>

      <Section title={t('earnings.thisMonth')}>
        <View style={styles.stats}>
          <Stat label={t('earnings.confirmedSessions')} value={String(validated.length)} />
          <Stat label={t('earnings.hoursLabel')} value={t('earnings.hours', { hours })} />
          <Stat label={t('earnings.amountDue')} value={formatMoney(due, rate.currency)} highlight />
        </View>
        {awaiting.length > 0 ? (
          <View style={styles.row}>
            <Icon name="time-outline" size={16} color={colors.textMuted} />
            <Text variant="small" tone="muted">
              {t('earnings.awaiting')} : {awaiting.length}
            </Text>
          </View>
        ) : null}
      </Section>

      <Section title={t('earnings.history')}>
        {(payouts.data ?? []).length === 0 ? (
          <Text tone="muted">{t('earnings.noPayouts')}</Text>
        ) : (
          payouts.data!.map((p) => (
            <View key={p.id} style={[styles.payout, { borderBottomColor: colors.border }]}>
              <View style={styles.flex}>
                <Text>{monthName.format(new Date(`${p.period_start}T12:00:00`))}</Text>
                <Text variant="caption" tone="muted">
                  {t('earnings.hours', {
                    hours: new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(p.minutes / 60),
                  })}
                </Text>
              </View>
              <Text bold>{formatMoney(p.amount_cents, p.currency)}</Text>
              <Badge
                label={p.status === 'paid' ? t('earnings.paid') : t('earnings.pendingPayout')}
                tone={p.status === 'paid' ? 'success' : 'warning'}
              />
            </View>
          ))
        )}
      </Section>
    </Screen>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.stat,
        { backgroundColor: highlight ? colors.accentSoft : colors.surface, borderColor: colors.border },
      ]}
    >
      <Text variant="heading" style={styles.tabular}>
        {value}
      </Text>
      <Text variant="caption" tone="muted" numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, borderWidth: 1, borderRadius: 14, padding: spacing.md, gap: spacing.xs },
  tabular: { fontVariant: ['tabular-nums'] },
  payout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
