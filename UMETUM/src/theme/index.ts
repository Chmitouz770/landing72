import { useColorScheme } from 'react-native';

/**
 * Identité visuelle UMETUM : bleu nuit (le ciel, le talith) et or (la couronne
 * du Sefer Torah), sur un fond parchemin.
 */
const light = {
  background: '#FAF7F2',
  surface: '#FFFFFF',
  surfaceMuted: '#F1ECE3',
  border: '#E4DDD0',
  text: '#1B2A4A',
  textMuted: '#5B6478',
  primary: '#1B2A4A',
  onPrimary: '#FFFFFF',
  accent: '#B8901C',
  accentSoft: '#F6ECCD',
  success: '#2E7D5B',
  successSoft: '#E1F2E9',
  danger: '#B3261E',
  dangerSoft: '#FBE4E2',
  warning: '#8A5A00',
  warningSoft: '#FFF1D6',
  overlay: 'rgba(15, 21, 36, 0.55)',
};

export type ThemeColors = typeof light;

const dark: ThemeColors = {
  background: '#0E1524',
  surface: '#172036',
  surfaceMuted: '#1F2A44',
  border: '#2A3654',
  text: '#F2EEE6',
  textMuted: '#A6AEC2',
  primary: '#E3C766',
  onPrimary: '#1B2A4A',
  accent: '#E3C766',
  accentSoft: '#3A3420',
  success: '#6CC59A',
  successSoft: '#18352A',
  danger: '#F2A09A',
  dangerSoft: '#3D1F1E',
  warning: '#F0C36A',
  warningSoft: '#3A2E14',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export const palettes = { light, dark };

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
} as const;

export const typography = {
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  subheading: { fontSize: 17, lineHeight: 23, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
} as const;

/** Largeur max du contenu (web / tablette). */
export const MAX_CONTENT_WIDTH = 720;

export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return { colors: isDark ? dark : light, isDark };
}
