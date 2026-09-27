import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager, Platform } from 'react-native';

import de from './locales/de';
import en from './locales/en';
import es from './locales/es';
import fr from './locales/fr';
import he from './locales/he';
import it from './locales/it';
import pt from './locales/pt';
import ru from './locales/ru';
import yi from './locales/yi';

/**
 * Langues de l'interface. Pour en ajouter une : créer locales/<code>.ts
 * (même clés que fr.ts, vérifié par TypeScript) et l'ajouter ci-dessous.
 */
export const SUPPORTED_LANGUAGES = ['fr', 'en', 'he', 'yi', 'ru', 'es', 'pt', 'it', 'de'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_NAMES: Record<AppLanguage, string> = {
  fr: 'Français',
  en: 'English',
  he: 'עברית',
  yi: 'ייִדיש',
  ru: 'Русский',
  es: 'Español',
  pt: 'Português',
  it: 'Italiano',
  de: 'Deutsch',
};

const RTL_LANGUAGES: AppLanguage[] = ['he', 'yi'];
const STORAGE_KEY = 'umetum.language';

export const resources = {
  fr: { translation: fr },
  en: { translation: en },
  he: { translation: he },
  yi: { translation: yi },
  ru: { translation: ru },
  es: { translation: es },
  pt: { translation: pt },
  it: { translation: it },
  de: { translation: de },
} as const;

function isSupported(lang: string | null | undefined): lang is AppLanguage {
  return !!lang && (SUPPORTED_LANGUAGES as readonly string[]).includes(lang);
}

function deviceLanguage(): AppLanguage {
  const code = getLocales()[0]?.languageCode;
  return isSupported(code) ? code : 'fr';
}

export function isRTL(lang: string): boolean {
  return RTL_LANGUAGES.includes(lang as AppLanguage);
}

function applyWebDirection(lang: string) {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRTL(lang) ? 'rtl' : 'ltr';
  }
}

const i18n = createInstance();
i18n.use(initReactI18next).init({
  resources,
  lng: deviceLanguage(),
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
  returnNull: false,
});
applyWebDirection(i18n.language);

/** Recharge la langue choisie par l'utilisateur (si différente de celle de l'appareil). */
export async function restoreLanguage(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (isSupported(saved) && saved !== i18n.language) {
      await i18n.changeLanguage(saved);
      applyWebDirection(saved);
    }
  } catch {
    // Stockage indisponible : on garde la langue de l'appareil.
  }
}

/**
 * Change la langue de l'app.
 * Renvoie `true` si le sens de lecture (RTL/LTR) change et qu'un redémarrage
 * de l'app mobile est nécessaire pour l'appliquer.
 */
export async function setLanguage(lang: AppLanguage): Promise<boolean> {
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem(STORAGE_KEY, lang).catch(() => undefined);
  applyWebDirection(lang);

  if (Platform.OS === 'web') return false;
  const wantsRTL = isRTL(lang);
  if (I18nManager.isRTL !== wantsRTL) {
    I18nManager.allowRTL(wantsRTL);
    I18nManager.forceRTL(wantsRTL);
    return true;
  }
  return false;
}

export default i18n;
