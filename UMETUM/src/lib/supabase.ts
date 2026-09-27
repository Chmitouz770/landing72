import './polyfills';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, FunctionsHttpError } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from '@/types/database';

import { env, isBackendConfigured } from './env';

export const supabase = createClient<Database>(
  // Valeurs factices si non configuré : l'app affiche alors l'écran de configuration.
  isBackendConfigured ? env.supabaseUrl : 'https://not-configured.supabase.co',
  isBackendConfigured ? env.supabaseKey : 'not-configured',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// Sur mobile, on ne rafraîchit le jeton que lorsque l'app est au premier plan.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** Erreur « métier » renvoyée par une Edge Function (`{ error: code }`). */
export class AppFunctionError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

/** Appelle une Edge Function et renvoie son JSON, ou lève AppFunctionError(code). */
export async function invokeFunction<T>(name: string, body?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body: body ?? {} });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null);
      throw new AppFunctionError(payload?.error ?? 'unknown_error');
    }
    throw new AppFunctionError('network_error');
  }
  return data as T;
}
