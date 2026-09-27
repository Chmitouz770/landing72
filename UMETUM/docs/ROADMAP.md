# Feuille de route

## ✅ v0.1 : socle (ce dépôt)

- Connexion par code e-mail, onboarding en 3 étapes
- Annonces « je propose » / « je cherche », exploration avec filtres
- Mise en relation, chat en temps réel, planification de séances (sans le Chabbat)
- Visio intégrée (LiveKit), « Visio maintenant »
- Dons ponctuels et maasser mensuel au montant libre (Stripe), dédicaces, historique
- Signaler, bloquer, supprimer son compte
- 9 langues : français, anglais, hébreu, yiddish, russe, espagnol, portugais, italien, allemand (RTL pour l'hébreu et le yiddish), mode sombre
- Non-mixité imposée par la base, app fermée le samedi
- Enseignants rémunérés 40 ₪/h : double confirmation des séances, écran « Mes gains », versements mensuels
- Devises selon le pays (€, $, £, ₪…)

## 🎯 v0.2 : avant le lancement public

- [ ] **Notifications push** (expo-notifications) : nouvelle demande, demande acceptée, nouveau message, rappel 15 min avant une séance
- [ ] **Politique de confidentialité et CGU** publiées sur le site, liens dans l'app
- [ ] **Tableau de modération** (signalements, masquage d'une annonce, suspension d'un compte)
- [ ] Liste des membres bloqués et possibilité de débloquer
- [ ] Modifier le montant de son maasser sans l'annuler
- [ ] Tests end-to-end (Maestro) sur les parcours clés
- [ ] Suivi des erreurs (Sentry) et statistiques anonymes

## 🌱 v0.3 : faire grandir la communauté

- [ ] **Cours collectifs** : un enseignant, plusieurs élèves (salles LiveKit à N participants)
- [ ] **Séances récurrentes** (« tous les mardis à 20 h ») et ajout au calendrier
- [ ] **Horaires juifs précis** : fermeture dès l'entrée du Chabbat le vendredi et jusqu'à sa sortie, plus les jours de fête (API Hebcal, selon la ville)
- [ ] **Recherche par distance** pour le présentiel (PostGIS)
- [ ] **Avis et remerciements** après une séance
- [ ] Profils d'enseignants vérifiés (badge « Rav », « Morah »…)
- [ ] Textes intégrés (Sefaria) pendant la visio

## 💛 v0.4 : financement

- [ ] **Reçus fiscaux Cerfa** automatiques. L'adresse des donateurs est déjà collectée ; il manque les infos de l'association. Ensuite : section 46 en Israël, 501(c)(3) aux États-Unis.
- [ ] **Virements automatiques aux enseignants** (Stripe Connect), avec l'écran « Mes gains » déjà en place
- [ ] Durée réelle des visios (webhook LiveKit) pour contrôler les heures déclarées
- [ ] **Soutenir un enseignant en particulier** (Stripe Connect), si l'association le souhaite
- [ ] Campagnes (« Parrainer 100 heures d'étude avant Chavouot »)
- [ ] Page « Impact » : heures étudiées, nombre de havroutot créées

## 🔐 À surveiller

- Utilisateurs mineurs : définir une politique (âge minimum, accord parental)
- Données personnelles (RGPD) : export des données, durée de conservation
- Charge vidéo : surveiller les minutes LiveKit, auto-héberger si besoin
