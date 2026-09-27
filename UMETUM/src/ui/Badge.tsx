import { StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: Tone; icon?: IconName }) {
  const { colors } = useTheme();
  const palette: Record<Tone, { bg: string; fg: string }> = {
    neutral: { bg: colors.surfaceMuted, fg: colors.textMuted },
    accent: { bg: colors.accentSoft, fg: colors.text },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  };
  const { bg, fg } = palette[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon ? <Icon name={icon} size={12} color={fg} /> : null}
      <Text variant="caption" style={{ color: fg }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
});
