// Reçoit les événements Stripe et enregistre dons et abonnements.
// Appelé par Stripe (pas par l'app) : verify_jwt = false dans config.toml,
// l'authenticité est garantie par la signature Stripe.
import { json, requireEnv } from '../_shared/http.ts';
import { cryptoProvider, stripe, type Stripe } from '../_shared/stripe.ts';
import { adminClient } from '../_shared/supabase.ts';

const admin = adminClient();
const webhookSecret = requireEnv('STRIPE_WEBHOOK_SECRET');

async function userIdForCustomer(customer: string | { id: string } | null): Promise<string | null> {
  const customerId = typeof customer === 'string' ? customer : customer?.id;
  if (!customerId) return null;
  const { data } = await admin
    .from('stripe_customers')
    .select('user_id')
    .eq('customer_id', customerId)
    .maybeSingle();
  return (data?.user_id as string | undefined) ?? null;
}

async function recordOneTimeDonation(session: Stripe.Checkout.Session) {
  if (session.mode !== 'payment' || session.payment_status !== 'paid') return;
  const { error } = await admin.from('donations').upsert(
    {
      user_id: session.metadata?.user_id ?? session.client_reference_id,
      kind: 'one_time',
      amount_cents: session.amount_total ?? 0,
      currency: session.currency ?? 'eur',
      dedication: session.metadata?.dedication || null,
      stripe_checkout_session_id: session.id,
    },
    { onConflict: 'stripe_checkout_session_id', ignoreDuplicates: true },
  );
  if (error) throw error;
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  const userId =
    subscription.metadata?.user_id ?? (await userIdForCustomer(subscription.customer));

  const { error } = await admin.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id:
        typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
      stripe_subscription_id: subscription.id,
      amount_cents: (item?.price.unit_amount ?? 0) * (item?.quantity ?? 1),
      currency: item?.price.currency ?? 'eur',
      status: subscription.status,
      current_period_end: item ? new Date(item.current_period_end * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      dedication: subscription.metadata?.dedication || null,
    },
    { onConflict: 'stripe_subscription_id' },
  );
  if (error) throw error;
}

async function recordMonthlyDonation(invoice: Stripe.Invoice) {
  const details = invoice.parent?.subscription_details;
  if (!details || invoice.amount_paid <= 0) return;
  const subscriptionId =
    typeof details.subscription === 'string' ? details.subscription : details.subscription.id;

  const { error } = await admin.from('donations').upsert(
    {
      user_id: details.metadata?.user_id ?? (await userIdForCustomer(invoice.customer)),
      kind: 'monthly',
      amount_cents: invoice.amount_paid,
      currency: invoice.currency,
      dedication: details.metadata?.dedication || null,
      stripe_invoice_id: invoice.id,
      stripe_subscription_id: subscriptionId,
    },
    { onConflict: 'stripe_invoice_id', ignoreDuplicates: true },
  );
  if (error) throw error;
}

Deno.serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  if (!signature) return json({ error: 'missing_signature' }, 400);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(),
      signature,
      webhookSecret,
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    console.error('Invalid Stripe signature', err);
    return json({ error: 'invalid_signature' }, 400);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object;
        if (session.mode === 'payment') {
          await recordOneTimeDonation(session);
        } else if (session.mode === 'subscription' && session.subscription) {
          const id =
            typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
          await syncSubscription(await stripe.subscriptions.retrieve(id));
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(event.data.object);
        break;
      case 'invoice.paid':
        await recordMonthlyDonation(event.data.object);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error(`Error handling ${event.type}`, err);
    // 500 => Stripe réessaiera plus tard.
    return json({ error: 'handler_failed' }, 500);
  }

  return json({ received: true });
});
