/**
 * Données fictives du mode démo (EXPO_PUBLIC_DEMO=1).
 * Tout vit en mémoire : un rechargement de la page remet la démo à zéro.
 * Deux « mondes » séparés (hommes / femmes) : la démo respecte la non-mixité.
 */
import type {
  Connection,
  Donation,
  Gender,
  Listing,
  Message,
  Payout,
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

export const audienceFor = (gender: Gender) => (gender === 'male' ? 'men' : 'women');

function person(
  id: string,
  display_name: string,
  city: string,
  gender: Gender,
  bio: string,
  teaches = true,
): Profile {
  return {
    id,
    display_name,
    bio,
    avatar_url: null,
    gender,
    city,
    country: 'FR',
    languages: ['fr', 'he'],
    wants_to_learn: !teaches,
    wants_to_teach: teaches,
    onboarded_at: iso(now - 300 * DAY),
    created_at: iso(now - 400 * DAY),
    updated_at: iso(now - DAY),
  };
}

// Hommes
const LEVY = person('d1000000-0000-4000-8000-000000000001', 'Rav Levy', 'Paris', 'male', 'Enseigne la Guemara depuis 15 ans. Patient avec les débutants.');
const ELI = person('d1000000-0000-4000-8000-000000000002', 'Eliyahou Benhamou', 'Marseille', 'male', 'Une idée de la paracha chaque semaine, en 30 minutes.');
const YOSSEF = person('d1000000-0000-4000-8000-000000000003', 'Yossef Azoulay', 'Jérusalem', 'male', 'Je cherche des havroutot pour avancer en Michna.', false);
const NATHAN = person('d1000000-0000-4000-8000-000000000004', 'Nathan Sebag', 'Bruxelles', 'male', 'Étudiant, curieux de tout.', false);
// Femmes
const MYRIAM = person('d1000000-0000-4000-8000-000000000011', 'Myriam Cohen', 'Lyon', 'female', 'Professeure de Tanakh et de Halakha.');
const HANNA = person('d1000000-0000-4000-8000-000000000012', 'Hanna Attal', 'Nice', 'female', 'Téfila et lecture de l’hébreu, pour débutantes.');
const RIVKA = person('d1000000-0000-4000-8000-000000000013', 'Rivka Dahan', 'Netanya', 'female', 'Je voudrais approfondir la Paracha.', false);
const SARAH = person('d1000000-0000-4000-8000-000000000014', 'Sarah Benichou', 'Montréal', 'female', 'Étudiante en droit, je reprends l’étude.', false);

export const profiles: Profile[] = [LEVY, ELI, YOSSEF, NATHAN, MYRIAM, HANNA, RIVKA, SARAH];

const TOPICS: [string, string, string, string, string, number, Record<string, string>][] = [
  ['parasha', 'Paracha de la semaine', 'Weekly Parasha', 'פרשת השבוע', 'calendar-outline', 10, { yi: 'די וואָכיקע סדרה', ru: 'Недельная глава', es: 'Parashá de la semana', pt: 'Parashá da semana', it: 'Parashà della settimana', de: 'Wochenabschnitt' }],
  ['tanakh', 'Tanakh', 'Tanakh', 'תנ"ך', 'book-outline', 20, { yi: 'תּנ״ך', ru: 'Танах', es: 'Tanaj', pt: 'Tanach', it: 'Tanakh', de: 'Tanach' }],
  ['guemara', 'Guemara', 'Gemara', 'גמרא', 'library-outline', 30, { yi: 'גמרא', ru: 'Гемара', es: 'Guemará', pt: 'Guemará', it: 'Ghemarà', de: 'Gemara' }],
  ['michna', 'Michna', 'Mishnah', 'משנה', 'reader-outline', 40, { yi: 'משנה', ru: 'Мишна', es: 'Mishná', pt: 'Mishná', it: 'Mishnà', de: 'Mischna' }],
  ['halakha', 'Halakha', 'Halacha', 'הלכה', 'checkmark-done-outline', 50, { yi: 'הלכה', ru: 'Алаха', es: 'Halajá', pt: 'Halachá', it: 'Halakhà', de: 'Halacha' }],
  ['moussar', 'Moussar', 'Mussar', 'מוסר', 'heart-outline', 60, { yi: 'מוסר', ru: 'Мусар', es: 'Musar', pt: 'Mussar', it: 'Musar', de: 'Mussar' }],
  ['hassidout', 'Hassidout', 'Chassidut', 'חסידות', 'flame-outline', 70, { yi: 'חסידות', ru: 'Хасидут', es: 'Jasidut', pt: 'Chassidut', it: 'Chassidut', de: 'Chassidut' }],
  ['emouna', 'Émouna & pensée juive', 'Emunah & Jewish thought', 'אמונה ומחשבה', 'sparkles-outline', 80, { yi: 'אמונה און יידישע מחשבה', ru: 'Эмуна и еврейская мысль', es: 'Emuná y pensamiento judío', pt: 'Emuná e pensamento judaico', it: 'Emunà e pensiero ebraico', de: 'Emuna und jüdisches Denken' }],
  ['pirke_avot', 'Pirké Avot', 'Pirkei Avot', 'פרקי אבות', 'leaf-outline', 90, { yi: 'פּרקי אָבֿות', ru: 'Пиркей Авот', es: 'Pirké Avot', pt: 'Pirkê Avot', it: 'Pirkè Avot', de: 'Pirke Awot' }],
  ['tefila', 'Téfila', 'Tefillah (prayer)', 'תפילה', 'sunny-outline', 100, { yi: 'תּפֿילה', ru: 'Молитва', es: 'Tefilá (rezo)', pt: 'Tefilá (reza)', it: 'Tefillà (preghiera)', de: 'Tefila (Gebet)' }],
  ['hebrew_reading', 'Lecture de l’hébreu', 'Hebrew reading', 'קריאה בעברית', 'text-outline', 110, { yi: 'לייענען לשון־קודש', ru: 'Чтение на иврите', es: 'Lectura del hebreo', pt: 'Leitura do hebraico', it: 'Lettura dell’ebraico', de: 'Hebräisch lesen' }],
  ['kabbala', 'Kabbale', 'Kabbalah', 'קבלה', 'star-outline', 120, { yi: 'קבלה', ru: 'Каббала', es: 'Cábala', pt: 'Cabalá', it: 'Qabbalà', de: 'Kabbala' }],
  ['other', 'Autre', 'Other', 'אחר', 'ellipsis-horizontal', 999, { yi: 'אַנדערש', ru: 'Другое', es: 'Otro', pt: 'Outro', it: 'Altro', de: 'Anderes' }],
];

const topics: Topic[] = TOPICS.map(([id, name_fr, name_en, name_he, icon, sort_order, others]) => ({
  id,
  name_fr,
  name_en,
  name_he,
  icon,
  sort_order,
  is_active: true,
  names: { fr: name_fr, en: name_en, he: name_he, ...others },
}));

function listing(
  owner: Profile,
  kind: Listing['kind'],
  topic_id: string,
  title: string,
  extra: Partial<Listing>,
  hoursAgo: number,
): Listing {
  return {
    id: newId(),
    owner_id: owner.id,
    kind,
    topic_id,
    title,
    description: null,
    level: 'all',
    format: 'video',
    audience: audienceFor(owner.gender ?? 'male'),
    languages: ['fr'],
    city: null,
    availability: null,
    status: 'active',
    created_at: iso(now - hoursAgo * 3_600_000),
    updated_at: iso(now - hoursAgo * 3_600_000),
    ...extra,
  };
}

const levyGuemara = listing(LEVY, 'offer', 'guemara', 'Guemara Berakhot pour débutants', {
  description: 'On lit le texte ensemble, mot à mot, avec Rachi. Rythme tranquille, questions bienvenues.',
  level: 'beginner', format: 'both', languages: ['fr', 'he'], city: 'Paris', availability: 'Soirs en semaine, 20h–21h',
}, 2);
const myriamHalakha = listing(MYRIAM, 'offer', 'halakha', 'Halakhot de Chabbat, pas à pas', {
  description: 'Cours pratique, avec les sources du Choulhan Aroukh.', level: 'intermediate', languages: ['fr', 'en'], availability: 'Dimanche 10h',
}, 3);

const listings: Listing[] = [
  levyGuemara,
  listing(ELI, 'offer', 'parasha', 'La Paracha en 30 minutes', {
    description: 'Une idée forte de la paracha, à emporter pour la table du Chabbat.', availability: 'Jeudi soir',
  }, 6),
  listing(LEVY, 'offer', 'pirke_avot', 'Pirké Avot : une michna par jour', {
    description: '15 minutes par jour pour travailler ses middot.', availability: 'Chaque matin, 7h30',
  }, 20),
  listing(YOSSEF, 'request', 'michna', 'Je cherche une havrouta en Michna', {
    description: 'Seder Moed, une michna par jour, en visio.', availability: 'Tôt le matin',
  }, 3),
  listing(NATHAN, 'request', 'emouna', 'Découvrir la pensée juive', {
    description: 'Je débute complètement et j’aimerais un guide patient.', level: 'beginner', availability: 'Le dimanche',
  }, 12),
  myriamHalakha,
  listing(HANNA, 'offer', 'hebrew_reading', 'Apprendre à lire l’hébreu en 10 séances', {
    description: 'De l’alef-beit à la lecture du siddour. Aucun prérequis.', level: 'beginner', availability: 'Mardi et jeudi, 18h',
  }, 9),
  listing(MYRIAM, 'offer', 'tanakh', 'Tehilim : lire et comprendre', { languages: ['fr'] }, 40),
  listing(HANNA, 'offer', 'tefila', 'Comprendre la Amida', { description: 'Les 19 bénédictions, une par séance.' }, 26),
  listing(RIVKA, 'request', 'parasha', 'Havrouta sur la Paracha', {
    description: 'En visio, avant Chabbat.', availability: 'Jeudi soir',
  }, 5),
  listing(SARAH, 'request', 'moussar', 'Cours de Moussar pour débutante', { level: 'beginner' }, 14),
];

export const db = {
  profiles,
  topics,
  listings,
  connections: [] as Connection[],
  messages: [] as Message[],
  study_sessions: [] as StudySession[],
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
  payouts: [] as Payout[],
  app_settings: [
    { key: 'teacher_hourly_rate', value: { amount_cents: 4000, currency: 'ils' }, updated_at: iso(now) },
  ],
  reports: [] as Record<string, unknown>[],
  blocks: [] as { blocker_id: string; blocked_id: string; created_at: string }[],
};

export type DemoTable = keyof typeof db;

/** Réponse simulée d'un membre quand il accepte une demande envoyée pendant la démo. */
export const AUTO_REPLY = 'Chalom ! Avec plaisir 🙂 Quand es-tu disponible cette semaine ?';

/** Un jour (décalé de `offsetDays`) à l'heure donnée, en évitant le samedi. */
function dayAt(offsetDays: number, hour: number, minute: number): string {
  const d = new Date(now + offsetDays * DAY);
  if (d.getDay() === 6) d.setDate(d.getDate() + (offsetDays < 0 ? -1 : 1));
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function session(connection: Connection, extra: Partial<StudySession>): StudySession {
  return {
    id: newId(),
    connection_id: connection.id,
    created_by: DEMO_USER_ID,
    starts_at: iso(now),
    duration_minutes: 45,
    mode: 'video',
    location: null,
    room_name: `umetum-demo-${seq}`,
    status: 'scheduled',
    notes: null,
    timezone: 'Europe/Paris',
    teacher_confirmed_at: null,
    student_confirmed_at: null,
    payout_id: null,
    created_at: iso(now - DAY),
    updated_at: iso(now - DAY),
    ...extra,
  };
}

let seeded = false;

/**
 * Crée l'historique personnel du visiteur une fois son genre choisi :
 * un enseignant qui l'accompagne, un élève à qui il enseigne, une demande
 * à traiter, des séances (à venir, à confirmer, validées) et un versement.
 */
export function seedPersonalData(gender: Gender) {
  if (seeded) return;
  seeded = true;
  const male = gender === 'male';
  const teacher = male ? LEVY : MYRIAM;
  const teacherListing = male ? levyGuemara : myriamHalakha;
  const student = male ? NATHAN : SARAH;
  const requester = male ? YOSSEF : RIVKA;

  const myListing = listing({ id: DEMO_USER_ID, gender } as Profile, 'offer', 'tanakh', 'Tanakh : le livre de Yona', {
    description: 'Le livre de Yona avant Kippour, un chapitre par séance.', languages: ['fr', 'he'], availability: 'Dimanche matin',
  }, 30);
  db.listings.push(myListing);

  const learning: Connection = {
    id: newId(), listing_id: teacherListing.id, teacher_id: teacher.id, student_id: DEMO_USER_ID,
    requested_by: DEMO_USER_ID, status: 'accepted', intro_message: 'Bonjour, je débute.',
    responded_at: iso(now - 9 * DAY), created_at: iso(now - 10 * DAY), updated_at: iso(now - 600_000),
  };
  const teaching: Connection = {
    id: newId(), listing_id: myListing.id, teacher_id: DEMO_USER_ID, student_id: student.id,
    requested_by: student.id, status: 'accepted', intro_message: 'J’aimerais étudier Yona avec toi.',
    responded_at: iso(now - 12 * DAY), created_at: iso(now - 12 * DAY), updated_at: iso(now - 2 * DAY),
  };
  const request: Connection = {
    id: newId(), listing_id: myListing.id, teacher_id: DEMO_USER_ID, student_id: requester.id,
    requested_by: requester.id, status: 'pending', intro_message: 'Chalom ! J’aimerais beaucoup étudier Yona avec toi avant Kippour.',
    responded_at: null, created_at: iso(now - 3_600_000), updated_at: iso(now - 3_600_000),
  };
  db.connections.push(learning, teaching, request);

  const msg = (connection: Connection, sender: string, body: string, minutesAgo: number): Message => ({
    id: newId(), connection_id: connection.id, sender_id: sender, body, created_at: iso(now - minutesAgo * 60_000),
  });
  db.messages.push(
    msg(learning, DEMO_USER_ID, 'Chalom, merci d’avoir accepté !', 2880),
    msg(learning, teacher.id, 'Bienvenue ! On commence par le début, tranquillement.', 2860),
    msg(learning, DEMO_USER_ID, 'Avec plaisir ! Ce soir, ça vous va ?', 60),
    msg(learning, teacher.id, 'Parfait, à tout à l’heure 🙂', 10),
    msg(teaching, student.id, 'Merci pour le cours d’hier, c’était passionnant !', 900),
  );

  const lastMonth = new Date(now);
  lastMonth.setDate(1);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const payout: Payout = {
    id: newId(), teacher_id: DEMO_USER_ID, period_start: lastMonth.toISOString().slice(0, 10),
    minutes: 180, amount_cents: 12000, currency: 'ils', status: 'paid', paid_at: iso(now - 20 * DAY),
    reference: null, created_at: iso(now - 25 * DAY),
  };
  db.payouts.push(payout);

  db.study_sessions.push(
    // J'apprends : une visio dans 25 minutes, un cours en présentiel, une séance passée à confirmer.
    session(learning, { starts_at: iso(now + 25 * 60_000), notes: 'Premier chapitre' }),
    session(learning, {
      starts_at: dayAt(2, 20, 30), duration_minutes: 60, mode: 'in_person',
      location: male ? 'Synagogue de la Victoire, Paris 9e' : 'Centre communautaire, Lyon 6e', created_by: teacher.id,
    }),
    session(learning, { starts_at: dayAt(-1, 19, 0), teacher_confirmed_at: iso(now - 20 * 3_600_000) }),
    // J'enseigne : deux séances validées ce mois-ci, une qui attend la confirmation de l'élève.
    session(teaching, {
      starts_at: dayAt(-6, 10, 0), duration_minutes: 60, status: 'completed',
      teacher_confirmed_at: iso(now - 6 * DAY), student_confirmed_at: iso(now - 6 * DAY),
    }),
    session(teaching, {
      starts_at: dayAt(-3, 10, 0), duration_minutes: 45, status: 'completed',
      teacher_confirmed_at: iso(now - 3 * DAY), student_confirmed_at: iso(now - 3 * DAY),
    }),
    session(teaching, { starts_at: dayAt(-1, 10, 0), teacher_confirmed_at: iso(now - DAY) }),
  );
}
