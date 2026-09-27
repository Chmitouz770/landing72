import { useQuery } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform } from 'react-native';

import { useUserId } from '@/features/auth/AuthProvider';
import { invokeFunction, supabase } from '@/lib/supabase';
import type { Donation, DonationKind, Subscription } from '@/types/database';

/** Montants suggérés (en unités) — multiples de 18 (« Haï », la vie). */
export const SUGGESTED_AMOUNTS: Record<DonationKind, number[]> = {
  monthly: [18, 36, 54, 100],
  one_time: [36, 72, 180, 360],
};

export const MIN_AMOUNT_CENTS = 100;

export const donationKeys = {
  subscription: (userId: string) => ['donations', 'subscription', userId] as const,
  history: (userId: string) => ['donations', 'history', userId] as const,
};

/**
 * Ouvre une page de paiement Stripe.
 * iOS : Safari (les dons doivent se faire hors de l'app, règle App Store 3.2.2).
 * Android : navigateur intégré. Web : même onglet.
 */
async function openPaymentPage(url: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.location.assign(url);
  } else if (Platform.OS === 'ios') {
    await Linking.openURL(url);
  } else {
    await WebBrowser.openBrowserAsync(url);
  }
}

export async function startDonation(params: {
  kind: DonationKind;
  amountCents: number;
  currency: string;
  dedication?: string;
}): Promise<void> {
  const { url } = await invokeFunction<{ url: string }>('create-checkout', params);
  await openPaymentPage(url);
}

export async function openBillingPortal(): Promise<void> {
  const { url } = await invokeFunction<{ url: string }>('billing-portal');
  await openPaymentPage(url);
}

export function useMySubscription() {
  const userId = useUserId();
  return useQuery({
    queryKey: donationKeys.subscription(userId),
    enabled: !!userId,
    queryFn: async (): Promise<Subscription | null> => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .in('status', ['active', 'trialing', 'past_due'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useMyDonations() {
  const userId = useUserId();
  return useQuery({
    queryKey: donationKeys.history(userId),
    enabled: !!userId,
    queryFn: async (): Promise<Donation[]> => {
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}
