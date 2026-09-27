import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: 'md' | 'lg';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  block?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  disabled,
  block,
  style,
  accessibilityHint,
}: Props) {
  const { colors } = useTheme();

  const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: colors.primary, fg: colors.onPrimary },
    secondary: { bg: colors.surfaceMuted, fg: colors.text },
    outline: { bg: 'transparent', fg: colors.text, border: colors.border },
    ghost: { bg: 'transparent', fg: colors.primary },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  };
  const { bg, fg, border } = palette[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        { backgroundColor: bg, borderColor: border ?? bg },
        block && styles.block,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <Icon name={icon} size={size === 'lg' ? 20 : 18} color={fg} /> : null}
          <Text variant={size === 'lg' ? 'subheading' : 'small'} bold style={{ color: fg }}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  md: { minHeight: 44 },
  lg: { minHeight: 54, paddingHorizontal: spacing.xl },
  block: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
});
