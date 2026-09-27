import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { spacing, useTheme } from '@/theme';
import { Button, Icon, Screen, Text } from '@/ui';

/** Page de retour après un paiement Stripe réussi (web et mobile). */
export default function DonationThanks() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['donations'] });
  }, [queryClient]);

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={<Button title={t('donate.backToApp')} size="lg" block onPress={() => router.replace('/')} />}
    >
      <View style={styles.center}>
        <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
          <Icon name="heart" size={44} color={colors.accent} />
        </View>
        <Text variant="title" center>
          {t('donate.thanksTitle')}
        </Text>
        <Text center>{t('donate.thanksText')}</Text>
        <Text center variant="small" tone="muted">
          {t('donate.thanksProcessing')}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: spacing.md, marginTop: spacing.xxxl },
  icon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
});
