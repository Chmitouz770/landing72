/**
 * Données fictives du mode démo (EXPO_PUBLIC_DEMO=1).
 * Tout vit en mémoire : un rechargement de la page remet la démo à zéro.
 */
import type {
  Connection,
  Donation,
  Listing,
  Message,
  Profile,
  StudySession,
  Subscription,
  Topic,
} from '@/types/database';

export const DEMO_USER_ID = 'd0000000-0000-4000-8000-000000000001';

const now = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();
const DAY = 86_400_000;
let seq = 0;
export const newId = () =>
  `d${(now + ++seq).toString(16).padStart(7, '0').slice(-7)}-0000-4000-8000-${String(seq).padStart(12, '0')}`;

function person(id: string, display_name: string, city: string, gender: 'male' | 'female', bio: string): Profile {
  return {
    id,
    display_name,
    bio,
    avatar_url: null,
    gender,
    city,
    country: 'FR',
    languages: ['fr', 'he'],
    wants_to_learn: false,
    wants_to_teach: true,
    onboarded_at: iso(now - 300 * DAY),
    created_at: iso(now - 400 * DAY),
    updated_at: iso(now - DAY),
  };
}

const LEVY = person('d1000000-0000-4000-8000-000000000001', 'Rav Levy', 'Paris', 'male', 'Enseigne la Guemara depuis 15 ans. Patient avec les débutants.');
const MYRIAM = person('d1000000-0000-4000-8000-000000000002', 'Myriam Cohen', 'Lyon', 'female', 'Professeure de Tanakh et de Halakha.');
const ELI = person('d1000000-0000-4000-8000-000000000003', 'Eliyahou Benhamou', 'Marseille', 'male', 'Une idée de la paracha chaque semaine, en 30 minutes.');
const YOSSEF = { ...person('d1000000-0000-4000-8000-000000000004', 'Yossef Azoulay', 'Jérusalem', 'male', 'Je cherche des havroutot pour avancer en Michna.'), wants_to_learn: true, wants_to_teach: false };
const HANNA = person('d1000000-0000-4000-8000-000000000005', 'Hanna Attal', 'Nice', 'female', 'Téfila et lecture de l’hébreu, pour débutantes.');
const NATHAN = { ...person('d1000000-0000-4000-8000-000000000006', 'Nathan Sebag', 'Bruxelles', 'male', 'Étudiant, curieux de tout.'), wants_to_learn: true, wants_to_teach: false };

const topics: Topic[] = (
  [
    ['parasha', 'Paracha de la semaine', 'Weekly Parasha', 'פרשת השבוע', 'calendar-outline', 10],
    ['tanakh', 'Tanakh', 'Tanakh', 'תנ"ך', 'book-outline', 20],
    ['guemara', 'Guemara', 'Gemara', 'גמרא', 'library-outline', 30],
    ['michna', 'Michna', 'Mishnah', 'משנה', 'reader-outline', 40],
    ['halakha', 'Halakha', 'Halacha', 'הלכה', 'checkmark-done-outline', 50],
    ['moussar', 'Moussar', 'Mussar', 'מוסר', 'heart-outline', 60],
    ['hassidout', 'Hassidout', 'Chassidut', 'חסידות', 'flame-outline', 70],
    ['emouna', 'Émouna & pensée juive', 'Emunah & Jewish thought', 'אמונה ומחשבה', 'sparkles-outline', 80],
    ['pirke_avot', 'Pirké Avot', 'Pirkei Avot', 'פרקי אבות', 'leaf-outline', 90],
    ['tefila', 'Téfila', 'Tefillah (prayer)', 'תפילה', 'sunny-outline', 100],
    ['hebrew_reading', 'Lecture de l’hébreu', 'Hebrew reading', 'קריאה בעברית', 'text-outline', 110],
    ['kabbala', 'Kabbale', 'Kabbalah', 'קבלה', 'star-outline', 120],
    ['other', 'Autre', 'Other', 'אחר', 'ellipsis-horizontal', 999],
  ] as const
).map(([id, name_fr, name_en, name_he, icon, sort_order]) => ({
  id,
  name_fr,
  name_en,
  name_he,
  icon,
  sort_order,
  is_active: true,
}));

function listing(owner: Profile, kind: Listing['kind'], topic_id: string, title: string, extra: Partial<Listing>, hoursAgo: number): Listing {
  return {
    id: newId(),
    owner_id: owner.id,
    kind,
    topic_id,
    title,
    description: null,
    level: 'all',
    format: 'video',
    audience: 'all',
    languages: ['fr'],
    city: null,
    availability: null,
    status: 'active',
    created_at: iso(now - hoursAgo * 3_600_000),
    updated_at: iso(now - hoursAgo * 3_600_000),
    ...extra,
  };
}

const guemara = listing(LEVY, 'offer', 'guemara', 'Guemara Berakhot pour débutants', {
  description: 'On lit le texte ensemble, mot à mot, avec Rachi. Rythme tranquille, questions bienvenues.',
  level: 'beginner', format: 'both', audience: 'men', languages: ['fr', 'he'], city: 'Paris', availability: 'Soirs en semaine, 20h–21h',
}, 2);
const myListing = listing({ id: DEMO_USER_ID } as Profile, 'offer', 'tanakh', 'Tanakh : le livre de Yona', {
  description: 'Le livre de Yona avant Kippour, un chapitre par séance.', languages: ['fr', 'he'], availability: 'Dimanche matin',
}, 30);

const listings: Listing[] = [
  guemara,
  listing(MYRIAM, 'offer', 'halakha', 'Halakhot de Chabbat, pas à pas', {
    description: 'Cours pratique, avec les sources du Choulhan Aroukh.', level: 'intermediate', audience: 'women', languages: ['fr', 'en'], availability: 'Dimanche 10h',
  }, 4),
  listing(ELI, 'offer', 'parasha', 'La Paracha en 30 minutes', {
    description: 'Une idée forte de la paracha, à emporter pour la table du Chabbat.', availability: 'Jeudi soir',
  }, 6),
  listing(HANNA, 'offer', 'hebrew_reading', 'Apprendre à lire l’hébreu en 10 séances', {
    description: 'De l’alef-beit à la lecture du siddour. Aucun prérequis.', level: 'beginner', audience: 'women', availability: 'Mardi et jeudi, 18h',
  }, 9),
  listing(LEVY, 'offer', 'pirke_avot', 'Pirké Avot : une michna par jour', {
    description: '15 minutes par jour pour travailler ses middot.', availability: 'Chaque matin, 7h30',
  }, 20),
  listing(MYRIAM, 'offer', 'tanakh', 'Tehilim : lire et comprendre', { level: 'all', languages: ['fr'] }, 40),
  listing(YOSSEF, 'request', 'michna', 'Je cherche une havrouta en Michna', {
    description: 'Seder Moed, une michna par jour, en visio.', audience: 'men', availability: 'Tôt le matin',
  }, 3),
  listing(NATHAN, 'request', 'emouna', 'Découvrir la pensée juive', {
    description: 'Je débute complètement et j’aimerais un guide patient.', level: 'beginner', availability: 'Le week-end (hors Chabbat)',
  }, 12),
  listing(ELI, 'request', 'kabbala', 'Havrouta Ramhal, Derekh Hachem', { level: 'advanced', audience: 'men' }, 50),
  myListing,
];

export const profiles: Profile[] = [LEVY, MYRIAM, ELI, YOSSEF, HANNA, NATHAN];

const withLevy: Connection = {
  id: newId(),
  listing_id: guemara.id,
  teacher_id: LEVY.id,
  student_id: DEMO_USER_ID,
  requested_by: DEMO_USER_ID,
  status: 'accepted',
  intro_message: 'Bonjour Rav, je débute en Guemara.',
  responded_at: iso(now - 2 * DAY),
  created_at: iso(now - 3 * DAY),
  updated_at: iso(now - 600_000),
};
const fromYossef: Connection = {
  id: newId(),
  listing_id: myListing.id,
  teacher_id: DEMO_USER_ID,
  student_id: YOSSEF.id,
  requested_by: YOSSEF.id,
  status: 'pending',
  intro_message: 'Chalom ! J’aimerais beaucoup étudier Yona avec toi avant Kippour.',
  responded_at: null,
  created_at: iso(now - 3_600_000),
  updated_at: iso(now - 3_600_000),
};

const message = (sender: string, body: string, minutesAgo: number): Message => ({
  id: newId(),
  connection_id: withLevy.id,
  sender_id: sender,
  body,
  created_at: iso(now - minutesAgo * 60_000),
});

function nextNonSaturday(daysAhead: number, hour: number, minute: number): string {
  const d = new Date(now + daysAhead * DAY);
  if (d.getDay() === 6) d.setDate(d.getDate() + 1);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const db = {
  profiles,
  topics,
  listings,
  connections: [withLevy, fromYossef] as Connection[],
  messages: [
    message(DEMO_USER_ID, 'Chalom Rav, merci d’avoir accepté !', 2880),
    message(LEVY.id, 'Bienvenue ! On commence par Berakhot 2a : « Méémataï korin et Chema bearvit ».', 2860),
    message(DEMO_USER_ID, 'Avec plaisir ! Ce soir à 20h, ça vous va ?', 60),
    message(LEVY.id, 'Parfait. Prends ton Artscroll si tu l’as 🙂', 10),
  ] as Message[],
  study_sessions: [
    {
      id: newId(),
      connection_id: withLevy.id,
      created_by: DEMO_USER_ID,
      starts_at: iso(now + 25 * 60_000),
      duration_minutes: 45,
      mode: 'video',
      location: null,
      room_name: 'umetum-demo-1',
      status: 'scheduled',
      notes: 'Berakhot 2a',
      created_at: iso(now - DAY),
      updated_at: iso(now - DAY),
    },
    {
      id: newId(),
      connection_id: withLevy.id,
      created_by: LEVY.id,
      starts_at: nextNonSaturday(2, 20, 30),
      duration_minutes: 60,
      mode: 'in_person',
      location: 'Synagogue de la Victoire, Paris 9e',
      room_name: 'umetum-demo-2',
      status: 'scheduled',
      notes: null,
      created_at: iso(now - DAY),
      updated_at: iso(now - DAY),
    },
  ] as StudySession[],
  donations: [
    {
      id: newId(),
      user_id: DEMO_USER_ID,
      kind: 'one_time',
      amount_cents: 3600,
      currency: 'eur',
      status: 'paid',
      dedication: 'Leïlouy nichmat Rahel bat Sarah',
      stripe_checkout_session_id: null,
      stripe_invoice_id: null,
      stripe_subscription_id: null,
      created_at: iso(now - 20 * DAY),
    },
  ] as Donation[],
  subscriptions: [] as Subscription[],
  reports: [] as Record<string, unknown>[],
  blocks: [] as { blocker_id: string; blocked_id: string; created_at: string }[],
};

export type DemoTable = keyof typeof db;

/** Réponse simulée d'un membre quand il accepte une demande envoyée pendant la démo. */
export const AUTO_REPLY = 'Chalom ! Avec plaisir 🙂 Quand es-tu disponible cette semaine ?';
