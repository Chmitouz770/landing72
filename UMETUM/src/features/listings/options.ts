import type { TFunction } from 'i18next';

import type { Gender, StudyFormat, StudyLevel } from '@/types/database';
import type { ChoiceOption, IconName } from '@/ui';

/** Langues proposées pour les cours (code ISO 639-1). */
export const STUDY_LANGUAGES = ['fr', 'he', 'en', 'yi', 'ru', 'es', 'pt', 'it', 'de'] as const;
export type StudyLanguage = (typeof STUDY_LANGUAGES)[number];

export const FORMAT_ICONS: Record<StudyFormat, IconName> = {
  video: 'videocam-outline',
  in_person: 'people-outline',
  both: 'swap-horizontal-outline',
};

export function languageOptions(t: TFunction): ChoiceOption<StudyLanguage>[] {
  return STUDY_LANGUAGES.map((code) => ({ value: code, label: t(`languages.${code}`) }));
}

export function formatOptions(t: TFunction): ChoiceOption<StudyFormat>[] {
  return (['video', 'in_person', 'both'] as const).map((value) => ({
    value,
    label: t(`format.${value}`),
    icon: FORMAT_ICONS[value],
  }));
}

export function levelOptions(t: TFunction): ChoiceOption<StudyLevel>[] {
  return (['all', 'beginner', 'intermediate', 'advanced'] as const).map((value) => ({
    value,
    label: t(`level.${value}`),
  }));
}

export function genderOptions(t: TFunction): ChoiceOption<Gender>[] {
  return (['male', 'female'] as const).map((value) => ({ value, label: t(`gender.${value}`) }));
}

export function languageLabel(t: TFunction, code: string): string {
  return (STUDY_LANGUAGES as readonly string[]).includes(code)
    ? t(`languages.${code as StudyLanguage}`)
    : code.toUpperCase();
}
