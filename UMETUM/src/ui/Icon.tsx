import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { I18nManager, Platform, type ColorValue } from 'react-native';

import { isRTL } from '@/i18n';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  name: IconName;
  size?: number;
  color: ColorValue;
};

export function Icon({ name, size = 20, color }: Props) {
  return <Ionicons name={name} size={size} color={color} />;
}

/** Chevron « suivant » qui s'adapte au sens de lecture (hébreu = RTL). */
export function ChevronIcon({ color, size = 18 }: { color: string; size?: number }) {
  const { i18n } = useTranslation();
  // Sur le web, le sens de lecture suit la langue (attribut dir du document).
  const rtl = Platform.OS === 'web' ? isRTL(i18n.language) : I18nManager.isRTL;
  return <Ionicons name={rtl ? 'chevron-back' : 'chevron-forward'} size={size} color={color} />;
}

export function isIconName(name: string): name is IconName {
  return name in Ionicons.glyphMap;
}
