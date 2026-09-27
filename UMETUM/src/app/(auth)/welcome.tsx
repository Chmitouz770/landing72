import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useFormattedRate } from '@/features/earnings/api';
import { spacing, useTheme } from '@/theme';
import { Button, Icon, Screen, Text, type IconName } from '@/ui';

export default function Welcome() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rate = useFormattedRate();

  const points: { icon: IconName; text: string }[] = [
    { icon: 'search-outline', text: t('auth.point1') },
    { icon: 'school-outline', text: t('auth.point2', { rate }) },
    { icon: 'heart-outline', text: t('auth.point3') },
  ];

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <Button title={t('auth.start')} size="lg" block onPress={() => router.push('/sign-in')} />
      }
    >
      <View style={styles.hero}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.logo}
          accessibilityIgnoresInvertColors
        />
        <Text variant="title" center style={styles.wordmark}>
          UMETUM
        </Text>
        <Text variant="heading" center tone="accent">
          אומעטום
        </Text>
      </View>

      <View style={styles.block}>
        <Text variant="title" center>
          {t('auth.welcomeTitle')}
        </Text>
        <Text center tone="muted">
          {t('auth.welcomeSubtitle')}
        </Text>
      </View>

      <View style={styles.points}>
        {points.map((p) => (
          <View key={p.icon} style={styles.point}>
            <View style={[styles.pointIcon, { backgroundColor: colors.accentSoft }]}>
              <Icon name={p.icon} size={20} color={colors.accent} />
            </View>
            <Text style={styles.flex}>{p.text}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.xs, marginTop: spacing.xxl },
  logo: { width: 96, height: 96, borderRadius: 26, marginBottom: spacing.md },
  wordmark: { letterSpacing: 6 },
  block: { gap: spacing.sm, marginTop: spacing.lg },
  points: { gap: spacing.md, marginTop: spacing.md },
  point: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pointIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
});
