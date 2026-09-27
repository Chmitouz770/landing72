// Crée une page de paiement Stripe Checkout pour un don ponctuel
// ou un « maasser » mensuel (abonnement au montant libre).
import { HttpError, json, readJson, serve } from '../_shared/http.ts';
import {
  getOrCreateCustomer,
  siteUrl,
  stripe,
  SUPPORTED_CURRENCIES,
  type Stripe,
} from '../_shared/stripe.ts';
import { adminClient, requireUser } from '../_shared/supabase.ts';

type Body = {
  kind?: 'one_time' | 'monthly';
  amountCents?: number;
  currency?: string;
  dedication?: string;
};

const MIN_AMOUNT_CENTS = 100;
const MAX_AMOUNT_CENTS = 1_000_000;

serve(async (req) => {
  const { user } = await requireUser(req);
  const body = await readJson<Body>(req);

  const kind = body.kind;
  if (kind !== 'one_time' && kind !== 'monthly') throw new HttpError(400, 'invalid_kind');

  const amount = body.amountCents;
  if (
    typeof amount !== 'number' ||
    !Number.isInteger(amount) ||
    amount < MIN_AMOUNT_CENTS ||
    amount > MAX_AMOUNT_CENTS
  ) {
    throw new HttpError(400, 'invalid_amount');
  }

  const currency = (body.currency ?? 'eur').toLowerCase();
  if (!(SUPPORTED_CURRENCIES as readonly string[]).includes(currency)) {
    throw new HttpError(400, 'invalid_currency');
  }

  const dedication = body.dedication?.trim().slice(0, 200) ?? '';
  const admin = adminClient();

  if (kind === 'monthly') {
    const { data: active } = await admin
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing', 'past_due'])
      .limit(1);
    if (active && active.length > 0) throw new HttpError(409, 'already_subscribed');
  }

  const customer = await getOrCreateCustomer(admin, user);
  const metadata = { user_id: user.id, kind, dedication };
  const site = siteUrl();

  const common: Stripe.Checkout.SessionCreateParams = {
    customer,
    client_reference_id: user.id,
    success_url: `${site}/donate/thanks?kind=${kind}`,
    cancel_url: `${site}/donate`,
    locale: 'auto',
    metadata,
  };

  const session =
    kind === 'one_time'
      ? await stripe.checkout.sessions.create({
          ...common,
          mode: 'payment',
          submit_type: 'donate',
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency,
                unit_amount: amount,
                product_data: { name: 'Don à UMETUM' },
              },
            },
          ],
          payment_intent_data: { metadata },
        })
      : await stripe.checkout.sessions.create({
          ...common,
          mode: 'subscription',
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency,
                unit_amount: amount,
                recurring: { interval: 'month' },
                product_data: { name: 'Maasser mensuel – UMETUM' },
              },
            },
          ],
          subscription_data: { metadata },
        });

  if (!session.url) throw new HttpError(500, 'checkout_unavailable');
  return json({ url: session.url });
});
