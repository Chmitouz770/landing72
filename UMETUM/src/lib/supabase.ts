import './polyfills';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, FunctionsHttpError } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from '@/types/database';

import { demoFetch } from './demo/fetch';
import { env, isBackendConfigured, isDemo } from './env';

/** Stockage en mémoire (démo) : chaque visite repart de zéro. */
const memory = new Map<string, string>();
const memoryStorage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value);
  },
  removeItem: (key: string) => {
    memory.delete(key);
  },
};

export const supabase = createClient<Database>(
  // Valeurs factices si non configuré : l'app affiche alors l'écran de configuration.
  isDemo ? 'https://demo.umetum.app' : isBackendConfigured ? env.supabaseUrl : 'https://not-configured.supabase.co',
  isDemo ? 'demo' : isBackendConfigured ? env.supabaseKey : 'not-configured',
  {
    auth: {
      storage: isDemo ? memoryStorage : AsyncStorage,
      autoRefreshToken: !isDemo,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: isDemo ? { fetch: demoFetch } : undefined,
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
