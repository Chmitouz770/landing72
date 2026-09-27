// Ouvre le portail client Stripe : l'utilisateur gère ou arrête son maasser
// mensuel, met à jour sa carte, télécharge ses reçus.
import { HttpError, json, serve } from '../_shared/http.ts';
import { findCustomer, siteUrl, stripe } from '../_shared/stripe.ts';
import { adminClient, requireUser } from '../_shared/supabase.ts';

serve(async (req) => {
  const { user } = await requireUser(req);
  const customer = await findCustomer(adminClient(), user.id);
  if (!customer) throw new HttpError(404, 'no_customer');

  const portal = await stripe.billingPortal.sessions.create({
    customer,
    return_url: `${siteUrl()}/donate`,
  });

  return json({ url: portal.url });
});
