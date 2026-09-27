import { invokeFunction, supabase } from '@/lib/supabase';

/** Supprime définitivement le compte (exigé par l'App Store et Google Play). */
export async function deleteMyAccount(): Promise<void> {
  await invokeFunction('delete-account');
  await supabase.auth.signOut();
}
