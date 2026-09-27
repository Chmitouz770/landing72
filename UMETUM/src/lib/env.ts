/**
 * Variables d'environnement publiques (inlinées au build par Expo).
 * Accès statique obligatoire : `process.env.EXPO_PUBLIC_X`.
 */
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '',
  livekitUrl: process.env.EXPO_PUBLIC_LIVEKIT_URL ?? '',
  defaultCurrency: (process.env.EXPO_PUBLIC_DEFAULT_CURRENCY ?? 'eur').toLowerCase(),
  contactEmail: process.env.EXPO_PUBLIC_CONTACT_EMAIL ?? '',
};

/** Mode démo : faux backend en mémoire, aucune donnée ne quitte l'appareil. */
export const isDemo = process.env.EXPO_PUBLIC_DEMO === '1';

export const isBackendConfigured = isDemo || Boolean(env.supabaseUrl && env.supabaseKey);
