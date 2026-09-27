// Suppression définitive du compte, demandée depuis l'app (exigence App Store
// et Google Play). Arrête d'abord les abonnements Stripe en cours.
import { json, serve } from '../_shared/http.ts';
import { findCustomer, stripe } from '../_shared/stripe.ts';
import { adminClient, requireUser } from '../_shared/supabase.ts';

serve(async (req) => {
  const { user } = await requireUser(req);
  const admin = adminClient();

  const customer = await findCustomer(admin, user.id);
  if (customer) {
    const subscriptions = await stripe.subscriptions.list({ customer, status: 'all', limit: 100 });
    for (const subscription of subscriptions.data) {
      if (['active', 'trialing', 'past_due', 'unpaid', 'incomplete'].includes(subscription.status)) {
        await stripe.subscriptions.cancel(subscription.id);
      }
    }
  }

  // Supprime l'utilisateur : profil, annonces, conversations suivent en cascade.
  // L'historique des dons est conservé (comptabilité) mais anonymisé (user_id = null).
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw error;

  return json({ deleted: true });
});
