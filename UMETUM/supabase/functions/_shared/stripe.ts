import Stripe from 'npm:stripe@22';

import type { SupabaseClient, User } from 'npm:@supabase/supabase-js@2';

import { requireEnv } from './http.ts';

export { Stripe };

export const stripe = new Stripe(requireEnv('STRIPE_SECRET_KEY'), {
  httpClient: Stripe.createFetchHttpClient(),
  appInfo: { name: 'UMETUM' },
});

export const cryptoProvider = Stripe.createSubtleCryptoProvider();

/** URL publique de l'app web (pages de retour après paiement). */
export function siteUrl(): string {
  return requireEnv('PUBLIC_SITE_URL').replace(/\/$/, '');
}

export const SUPPORTED_CURRENCIES = ['eur', 'ils', 'usd', 'gbp', 'chf', 'cad'] as const;

/** Retrouve (ou crée) le client Stripe associé à un utilisateur UMETUM. */
export async function getOrCreateCustomer(admin: SupabaseClient, user: User): Promise<string> {
  const { data: existing } = await admin
    .from('stripe_customers')
    .select('customer_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (existing?.customer_id) return existing.customer_id as string;

  const customer = await stripe.customers.create(
    { email: user.email ?? undefined, metadata: { user_id: user.id } },
    { idempotencyKey: `customer-${user.id}` },
  );

  const { error } = await admin
    .from('stripe_customers')
    .upsert({ user_id: user.id, customer_id: customer.id }, { onConflict: 'user_id', ignoreDuplicates: true });
  if (error) throw error;

  return customer.id;
}

export async function findCustomer(admin: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await admin
    .from('stripe_customers')
    .select('customer_id')
    .eq('user_id', userId)
    .maybeSingle();
  return (data?.customer_id as string | undefined) ?? null;
}
