import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { openBillingPortal, startDonation, useMyDonations, useMySubscription } from '@/features/donations/api';
import { useFormattedRate } from '@/features/earnings/api';
import { CURRENCIES, CURRENCY_CODES, detectCurrency, type CurrencyCode } from '@/lib/currency';
import { notify } from '@/lib/dialogs';
import { currencySymbol, formatMoney, formatShortDate } from '@/lib/format';
import { AppFunctionError } from '@/lib/supabase';
import { spacing, useTheme } from '@/theme';
import type { DonationKind } from '@/types/database';
import {
  Badge,
  Button,
  Card,
  Chip,
  ChoiceChips,
  Field,
  Icon,
  Screen,
  Section,
  SegmentedControl,
  Text,
  TextField,
} from '@/ui';

const CUSTOM = 'custom';

export default function Donate() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const subscription = useMySubscription();
  const donations = useMyDonations();
  const rate = useFormattedRate();

  const hasSubscription = !!subscription.data;
  const [currency, setCurrency] = useState<CurrencyCode>(detectCurrency);
  const [kind, setKind] = useState<DonationKind>('monthly');
  const [preset, setPreset] = useState<number | typeof CUSTOM>(CURRENCIES[currency].monthly[1]);
  const [custom, setCustom] = useState('');
  const [dedication, setDedication] = useState('');
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const effectiveKind: DonationKind = hasSubscription ? 'one_time' : kind;

  // Au retour de la page de paiement, on rafraîchit l'abonnement et l'historique.
  const { refetch: refetchSubscription } = subscription;
  const { refetch: refetchDonations } = donations;
  useFocusEffect(
    useCallback(() => {
      refetchSubscription();
      refetchDonations();
    }, [refetchSubscription, refetchDonations]),
  );

  const amountCents =
    preset === CUSTOM ? Math.round(Number(custom.replace(',', '.')) * 100) || 0 : preset * 100;
  const minAmount = CURRENCIES[currency].min;
  const validAmount = amountCents >= minAmount;
  const amountLabel = formatMoney(Math.max(amountCents, 0), currency);

  const changeKind = (next: DonationKind) => {
    setKind(next);
    setPreset(CURRENCIES[currency][next][1]);
  };

  const changeCurrency = (next: CurrencyCode) => {
    setCurrency(next);
    setPreset(CURRENCIES[next][hasSubscription ? 'one_time' : kind][1]);
  };

  const give = async () => {
    if (!validAmount) return;
    setLoading(true);
    try {
      await startDonation({ kind: effectiveKind, amountCents, currency, dedication });
    } catch (e) {
      const code = e instanceof AppFunctionError ? e.code : '';
      notify(
        code === 'already_subscribed'
          ? t('donate.already_subscribed')
          : code === 'demo_mode'
            ? t('demo.payment')
            : t('errors.generic'),
      );
    } finally {
      setLoading(false);
    }
  };

  const manage = async () => {
    setPortalLoading(true);
    try {
      await openBillingPortal();
    } catch (e) {
      notify(e instanceof AppFunctionError && e.code === 'demo_mode' ? t('demo.payment') : t('errors.generic'));
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <Screen
      footer={
        <>
          <Button
            title={
              effectiveKind === 'monthly'
                ? t('donate.ctaMonthly', { amount: amountLabel })
                : t('donate.ctaOnce', { amount: amountLabel })
            }
            icon="heart"
            size="lg"
            block
            disabled={!validAmount}
            loading={loading}
            onPress={give}
          />
          <View style={styles.secure}>
            <Icon name="lock-closed-outline" size={14} color={colors.textMuted} />
            <Text variant="caption" tone="muted">
              {t('donate.secure')}
            </Text>
          </View>
        </>
      }
    >
      <Text tone="muted">{t('donate.intro', { rate })}</Text>

      {subscription.data ? (
        <Card tone="accent">
          <View style={styles.row}>
            <Icon name="heart" size={22} color={colors.accent} />
            <Text variant="subheading" style={styles.flex}>
              {t('donate.activeTitle')}
            </Text>
          </View>
          <Text>
            {t('donate.activeText', {
              amount: formatMoney(subscription.data.amount_cents, subscription.data.currency),
            })}
          </Text>
          {subscription.data.current_period_end ? (
            <Text variant="small" tone="muted">
              {t(subscription.data.cancel_at_period_end ? 'donate.endsOn' : 'donate.renewsOn', {
                date: formatShortDate(subscription.data.current_period_end),
              })}
            </Text>
          ) : null}
          <Button title={t('donate.manage')} variant="outline" loading={portalLoading} onPress={manage} />
        </Card>
      ) : (
        <SegmentedControl
          options={[
            { value: 'monthly', label: `${t('donate.monthly')} · ${t('donate.monthlyTag')}` },
            { value: 'one_time', label: t('donate.oneTime') },
          ]}
          value={kind}
          onChange={changeKind}
        />
      )}

      <Field label={t('donate.currencyLabel')}>
        <ChoiceChips
          scroll
          options={CURRENCY_CODES.map((code) => ({
            value: code,
            label: `${currencySymbol(code)} ${code.toUpperCase()}`,
          }))}
          value={currency}
          onChange={changeCurrency}
        />
      </Field>

      <Field label={t('donate.amountLabel')}>
        <View style={styles.amounts}>
          {CURRENCIES[currency][effectiveKind].map((amount) => (
            <Chip
              key={amount}
              label={formatMoney(amount * 100, currency)}
              selected={preset === amount}
              onPress={() => setPreset(amount)}
            />
          ))}
          <Chip label={t('donate.customAmount')} selected={preset === CUSTOM} onPress={() => setPreset(CUSTOM)} />
        </View>
        {preset === CUSTOM ? (
          <TextField
            value={custom}
            onChangeText={setCustom}
            keyboardType="decimal-pad"
            prefix={currencySymbol(currency)}
            autoFocus
            error={
              custom && !validAmount
                ? t('donate.minAmount', { amount: formatMoney(minAmount, currency) })
                : null
            }
          />
        ) : null}
      </Field>

      <TextField
        label={`${t('donate.dedicationLabel')} (${t('common.optional')})`}
        placeholder={t('donate.dedicationPlaceholder')}
        value={dedication}
        onChangeText={setDedication}
        maxLength={200}
      />

      <Section title={t('donate.history')}>
        {(donations.data ?? []).length === 0 ? (
          <Text tone="muted">{t('donate.historyEmpty')}</Text>
        ) : (
          donations.data!.map((d) => (
            <View key={d.id} style={[styles.historyRow, { borderBottomColor: colors.border }]}>
              <View style={styles.flex}>
                <Text>{d.kind === 'monthly' ? t('donate.monthlyDonation') : t('donate.oneTimeDonation')}</Text>
                <Text variant="caption" tone="muted">
                  {formatShortDate(d.created_at)}
                  {d.dedication ? ` · ${d.dedication}` : ''}
                </Text>
              </View>
              <Badge label={formatMoney(d.amount_cents, d.currency)} tone="success" />
            </View>
          ))
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  amounts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
