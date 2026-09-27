import { Text as RNText, type TextProps } from 'react-native';

import { typography, useTheme, type ThemeColors } from '@/theme';

type Variant = keyof typeof typography;
type Tone = 'default' | 'muted' | 'primary' | 'accent' | 'danger' | 'success' | 'onPrimary';

const toneToColor: Record<Tone, keyof ThemeColors> = {
  default: 'text',
  muted: 'textMuted',
  primary: 'primary',
  accent: 'accent',
  danger: 'danger',
  success: 'success',
  onPrimary: 'onPrimary',
};

type Props = TextProps & {
  variant?: Variant;
  tone?: Tone;
  center?: boolean;
  bold?: boolean;
};

export function Text({ variant = 'body', tone = 'default', center, bold, style, ...props }: Props) {
  const { colors } = useTheme();
  return (
    <RNText
      {...props}
      style={[
        typography[variant],
        { color: colors[toneToColor[tone]] },
        center && { textAlign: 'center' },
        bold && { fontWeight: '700' },
        style,
      ]}
    />
  );
}
