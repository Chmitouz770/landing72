import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { spacing, useTheme } from '@/theme';

import { ChevronIcon, Icon, type IconName } from './Icon';
import { Text } from './Text';

export function Section({
  title,
  action,
  onAction,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text variant="heading" style={styles.flex}>
          {title}
        </Text>
        {action && onAction ? (
          <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
            <Text variant="small" tone="primary" bold>
              {action}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text variant="small" bold>
        {label}
      </Text>
      {children}
    </View>
  );
}

export function ListRow({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  const color = danger ? colors.danger : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Icon name={icon} size={20} color={color} />
      <Text style={[styles.flex, { color }]}>{label}</Text>
      <ChevronIcon color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  field: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 14,
    borderWidth: 1,
  },
});
