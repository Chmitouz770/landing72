import { getLocales } from 'expo-localization';

import { env } from './env';

/**
 * Devises acceptées pour les dons, avec des montants suggérés adaptés
 * (en unités, pas en centimes) et un minimum (en centimes).
 * Garder en phase avec supabase/functions/_shared/stripe.ts.
 */
export const CURRENCIES = {
  eur: { monthly: [18, 36, 54, 100], one_time: [36, 72, 180, 360], min: 100 },
  usd: { monthly: [18, 36, 54, 100], one_time: [36, 72, 180, 360], min: 100 },
  gbp: { monthly: [18, 36, 54, 100], one_time: [36, 72, 180, 360], min: 100 },
  ils: { monthly: [72, 180, 360, 500], one_time: [100, 180, 360, 1000], min: 500 },
  cad: { monthly: [18, 36, 54, 100], one_time: [36, 72, 180, 360], min: 100 },
  aud: { monthly: [18, 36, 54, 100], one_time: [36, 72, 180, 360], min: 100 },
  chf: { monthly: [18, 36, 54, 100], one_time: [36, 72, 180, 360], min: 100 },
  zar: { monthly: [180, 360, 540, 1000], one_time: [360, 720, 1800, 3600], min: 2000 },
  brl: { monthly: [36, 72, 180, 360], one_time: [72, 180, 360, 720], min: 500 },
  mxn: { monthly: [180, 360, 540, 1000], one_time: [360, 720, 1800, 3600], min: 2000 },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;
export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

export function isCurrency(code: string | null | undefined): code is CurrencyCode {
  return !!code && code in CURRENCIES;
}

const EURO_ZONE = ['FR', 'BE', 'LU', 'DE', 'AT', 'IT', 'ES', 'PT', 'NL', 'IE', 'FI', 'GR', 'MC', 'SK', 'SI', 'EE', 'LV', 'LT', 'MT', 'CY', 'HR'];

/** Devise d'après le pays (utile sur le web, où la devise n'est pas fournie). */
const REGION_CURRENCY: Record<string, CurrencyCode> = {
  ...Object.fromEntries(EURO_ZONE.map((region) => [region, 'eur' as const])),
  US: 'usd',
  GB: 'gbp',
  IL: 'ils',
  CA: 'cad',
  AU: 'aud',
  CH: 'chf',
  ZA: 'zar',
  BR: 'brl',
  MX: 'mxn',
};

/** Devise du pays de l'utilisateur (réglages du téléphone ou du navigateur), sinon dollar. */
export function detectCurrency(): CurrencyCode {
  const locale = getLocales()[0];
  const fromDevice = locale?.currencyCode?.toLowerCase();
  if (isCurrency(fromDevice)) return fromDevice;
  const fromRegion = locale?.regionCode ? REGION_CURRENCY[locale.regionCode.toUpperCase()] : undefined;
  if (fromRegion) return fromRegion;
  if (isCurrency(env.defaultCurrency)) return env.defaultCurrency;
  return 'usd';
}
