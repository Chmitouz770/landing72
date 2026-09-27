# Mise en place et mise en production

Ce guide va de zéro à l'app publiée sur l'App Store, Google Play et le web.
Compte environ une demi-journée la première fois.

## 0. Comptes nécessaires

| Service | Rôle | Coût de départ |
|---|---|---|
| [Supabase](https://supabase.com) | Base de données, connexion, temps réel, fichiers, fonctions serveur | Gratuit, puis 25 $/mois (Pro) |
| [LiveKit Cloud](https://cloud.livekit.io) | Visioconférence | Palier gratuit, puis à l'usage |
| [Stripe](https://stripe.com) | Dons et abonnements | Commission par transaction (tarif réduit possible pour les associations) |
| [Expo / EAS](https://expo.dev) | Compilation et publication des apps | Palier gratuit |
| Apple Developer Program | Publication iOS | 99 $/an (exonération possible pour les associations, sur demande, selon le pays) |
| Google Play Console | Publication Android | 25 $ une fois |
| Service d'e-mails (Resend, Brevo, Postmark…) | Envoi des codes de connexion | Palier gratuit |

> 💡 Idéalement, créer les comptes Stripe, Apple et Google **au nom de l'association** qui reçoit les dons.

## 1. Supabase

1. Créer un projet (région recommandée : `eu-west-3` Paris ou `eu-central-1`).
2. Dans ce dossier :
   ```bash
   npx supabase login
   npx supabase link --project-ref <REF_DU_PROJET>
   npx supabase db push          # applique supabase/migrations (tables, sécurité, matières)
   ```
3. **Authentication > Sign In / Providers > Email** : activer Email et désactiver « Confirm email ». La connexion se fait par code, ce qui vaut confirmation.
4. **Authentication > Emails > Templates** : remplacer les modèles **Magic Link** et **Confirm signup** par le contenu de `supabase/templates/magic_link.html`. Il contient `{{ .Token }}`, c'est-à-dire le code à 6 chiffres.
5. **Authentication > Emails > SMTP** : brancher un vrai service d'e-mails. Le service intégré de Supabase est limité à quelques e-mails par heure, il ne convient qu'aux tests.
6. **Authentication > URL Configuration** : Site URL = l'adresse de l'app web (étape 5), plus `umetum://` dans les Redirect URLs.
7. **Project Settings > API** : copier l'URL du projet et la clé *publishable* (ou *anon*) dans `.env.local` :
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_...
   ```

## 2. LiveKit (visio)

1. Créer un projet sur LiveKit Cloud. Le serveur open source peut aussi être auto-hébergé plus tard.
2. Récupérer **l'URL WebSocket**, **l'API key** et **l'API secret**.
3. Mettre l'URL dans `.env.local` : `EXPO_PUBLIC_LIVEKIT_URL=wss://...livekit.cloud`.

## 3. Stripe (dons)

1. Récupérer la **clé secrète** (`sk_live_...`, ou `sk_test_...` pour les essais).
2. **Developers > Webhooks > Add endpoint** :
   - URL : `https://<ref>.supabase.co/functions/v1/stripe-webhook`
   - Événements : `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `invoice.paid`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copier le **signing secret** (`whsec_...`).
3. **Settings > Billing > Customer portal** : autoriser l'annulation d'abonnement, la mise à jour du moyen de paiement et l'historique des factures.
4. (Recommandé) Activer Apple Pay et Google Pay dans les moyens de paiement.

## 4. Fonctions serveur (Edge Functions)

```bash
npx supabase secrets set \
  LIVEKIT_URL=wss://...livekit.cloud \
  LIVEKIT_API_KEY=... \
  LIVEKIT_API_SECRET=... \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  PUBLIC_SITE_URL=https://app.umetum.org

npx supabase functions deploy
```

| Fonction | Rôle |
|---|---|
| `livekit-token` | Donne l'accès à la visio d'une séance, uniquement aux deux participants et à partir d'une heure avant le début. |
| `create-checkout` | Crée la page de paiement Stripe (don ponctuel ou maasser mensuel au montant libre). |
| `billing-portal` | Ouvre le portail Stripe pour gérer ou arrêter le maasser. |
| `stripe-webhook` | Enregistre dons et abonnements, sécurisé par la signature Stripe. |
| `delete-account` | Suppression définitive du compte, exigée par les stores. |

## 5. Version web

La version web sert aux utilisateurs sur ordinateur et aux **pages de retour après paiement** (`/donate/thanks`).

```bash
npm run build:web             # génère dist/
npx eas-cli deploy            # EAS Hosting (ou Vercel/Netlify en mode SPA)
```

L'adresse obtenue doit correspondre à `PUBLIC_SITE_URL` (étape 4) et à la Site URL Supabase (étape 1.6).

## 6. Apps iOS et Android

```bash
npx eas-cli login
npx eas-cli init                                  # crée le projet EAS (renseigner EAS_PROJECT_ID)
npx eas-cli env:create                            # déclarer les EXPO_PUBLIC_* pour chaque environnement

# Build de développement (installe « l'app de dev » sur votre téléphone)
npx eas-cli build --profile development --platform ios      # ou android
npm start

# Production
npx eas-cli build --profile production --platform all
npx eas-cli submit --platform all
```

> La visio utilise des modules natifs. Elle ne fonctionne pas dans **Expo Go**, il faut un build de développement. Tout le reste fonctionne dans Expo Go.

## 7. Règles des stores : ce qui est déjà prévu

| Règle | Où c'est géré |
|---|---|
| **Dons (Apple 3.2.2)** : une association non « approuvée » par Apple doit collecter les dons hors de l'app. | Sur iOS, le paiement s'ouvre dans **Safari** (`src/features/donations/api.ts`). Si l'association devient *Apple-approved nonprofit*, le don pourra se faire dans l'app avec Apple Pay. |
| **Dons (Google Play)** : les dons à une organisation exonérée ne passent pas par la facturation Google Play. | Stripe, dans un navigateur intégré. |
| **Suppression du compte depuis l'app** | Réglages > Supprimer mon compte. |
| **Contenu entre utilisateurs (Apple 1.2)** : signaler, bloquer, publier un contact. | Boutons *Signaler* et *Bloquer* sur les profils et annonces, *Nous contacter* dans les réglages (`EXPO_PUBLIC_CONTACT_EMAIL`). |
| **Politique de confidentialité** | ⚠️ À rédiger et publier sur le site, puis renseigner son URL dans App Store Connect et la Play Console. |

## 8. Rémunération des enseignants (chaque mois)

Le tarif est stocké en base, et peut changer sans mettre à jour l'app :
```sql
update app_settings set value = '{"amount_cents": 4000, "currency": "ils"}' where key = 'teacher_hourly_rate';
```

En début de mois, dans le SQL Editor de Supabase :
```sql
select generate_payouts('2026-10-01');   -- crée les versements d'octobre pour les séances validées
select p.*, pr.display_name from payouts p join profiles pr on pr.id = p.teacher_id where p.status = 'pending';
-- après les virements :
update payouts set status = 'paid', paid_at = now(), reference = 'VIR-2026-10' where status = 'pending';
```

> Une séance n'est comptée que si **l'enseignant et l'élève** l'ont confirmée dans l'app.
> Plus tard, les virements pourront être automatisés avec Stripe Connect (voir la feuille de route).

## 9. Reçus fiscaux (Cerfa)

Stripe collecte déjà le nom et l'adresse de chaque donateur. La génération automatique des reçus Cerfa n° 11580 sera branchée dès que l'on aura les informations de l'association : nom, numéro RNA ou SIREN, adresse, objet, et habilitation à délivrer des reçus.

## 10. Développement local complet (optionnel)

Avec Docker installé :

```bash
npx supabase start          # Postgres + Auth + Realtime + Studio en local
npx supabase db reset       # migrations + données de démo (supabase/seed.sql)
npx supabase functions serve --env-file supabase/.env.local
```

Les e-mails de connexion sont visibles sur http://127.0.0.1:54324.
