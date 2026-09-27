import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'accent' | 'muted';
  accessibilityLabel?: string;
};

export function Card({ children, onPress, style, tone = 'default', accessibilityLabel }: Props) {
  const { colors } = useTheme();
  const backgroundColor =
    tone === 'accent' ? colors.accentSoft : tone === 'muted' ? colors.surfaceMuted : colors.surface;
  const containerStyle = [
    styles.card,
    { backgroundColor, borderColor: tone === 'default' ? colors.border : backgroundColor },
    style,
  ];

  if (!onPress) return <View style={containerStyle}>{children}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [containerStyle, pressed && { opacity: 0.85 }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
});
