import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { spacing, useTheme } from '@/theme';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export function LoadingView() {
  const { colors } = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.textMuted} />
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <Icon name="cloud-offline-outline" size={40} color={colors.textMuted} />
      <Text center tone="muted">
        {message ?? t('errors.generic')}
      </Text>
      {onRetry ? <Button title={t('common.retry')} variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

type EmptyProps = {
  icon: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.accentSoft }]}>
        <Icon name={icon} size={28} color={colors.accent} />
      </View>
      <Text variant="subheading" center>
        {title}
      </Text>
      {message ? (
        <Text center tone="muted">
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});
