-- Données de démonstration pour le développement local uniquement
-- (chargées par `supabase db reset`). Ne jamais exécuter en production.
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'rav.levy@example.com', '{"display_name":"Rav Levy"}', now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'myriam@example.com', '{"display_name":"Myriam"}', now(), now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'yossef@example.com', '{"display_name":"Yossef"}', now(), now(), now())
on conflict (id) do nothing;

update public.profiles set
  bio = 'Enseigne la Guemara depuis 15 ans. Patient avec les débutants !',
  gender = 'male', city = 'Paris', country = 'FR', languages = '{fr,he}',
  wants_to_teach = true, onboarded_at = now()
where id = '11111111-1111-1111-1111-111111111111';

update public.profiles set
  bio = 'Professeure de Tanakh et de Halakha pour femmes.',
  gender = 'female', city = 'Lyon', country = 'FR', languages = '{fr,en}',
  wants_to_teach = true, onboarded_at = now()
where id = '22222222-2222-2222-2222-222222222222';

update public.profiles set
  bio = 'Je cherche une havrouta pour avancer en Michna.',
  gender = 'male', city = 'Jérusalem', country = 'IL', languages = '{fr,he}',
  wants_to_learn = true, onboarded_at = now()
where id = '33333333-3333-3333-3333-333333333333';

insert into public.listings (owner_id, kind, topic_id, title, description, level, format, audience, languages, city, availability) values
  ('11111111-1111-1111-1111-111111111111', 'offer', 'guemara', 'Guemara Berakhot pour débutants',
   'On lit le texte ensemble, mot à mot, avec Rachi.', 'beginner', 'both', 'men', '{fr}', 'Paris', 'Soirs en semaine'),
  ('11111111-1111-1111-1111-111111111111', 'offer', 'parasha', 'La Paracha en 30 minutes',
   'Une idée forte de la paracha chaque semaine.', 'all', 'video', 'all', '{fr,he}', null, 'Jeudi soir'),
  ('22222222-2222-2222-2222-222222222222', 'offer', 'halakha', 'Halakhot de Chabbat',
   'Cours pratique, avec les sources.', 'intermediate', 'video', 'women', '{fr,en}', null, 'Dimanche matin'),
  ('33333333-3333-3333-3333-333333333333', 'request', 'michna', 'Havrouta Michna Pirké Avot',
   'Un chapitre par semaine, en visio.', 'beginner', 'video', 'men', '{fr}', null, 'Tôt le matin');
