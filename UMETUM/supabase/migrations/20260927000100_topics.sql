-- Matières proposées au lancement. Pour en ajouter : nouvelle migration
-- (ou insertion directe depuis le dashboard Supabase), sans mise à jour de l'app.
insert into public.topics (id, name_fr, name_en, name_he, icon, sort_order) values
  ('parasha',        'Paracha de la semaine',     'Weekly Parasha',            'פרשת השבוע',        'calendar-outline',         10),
  ('tanakh',         'Tanakh',                    'Tanakh',                    'תנ"ך',              'book-outline',             20),
  ('guemara',        'Guemara',                   'Gemara',                    'גמרא',              'library-outline',          30),
  ('michna',         'Michna',                    'Mishnah',                   'משנה',              'reader-outline',           40),
  ('halakha',        'Halakha',                   'Halacha',                   'הלכה',              'checkmark-done-outline',   50),
  ('moussar',        'Moussar',                   'Mussar',                    'מוסר',              'heart-outline',            60),
  ('hassidout',      'Hassidout',                 'Chassidut',                 'חסידות',            'flame-outline',            70),
  ('emouna',         'Émouna & pensée juive',     'Emunah & Jewish thought',   'אמונה ומחשבה',      'sparkles-outline',         80),
  ('pirke_avot',     'Pirké Avot',                'Pirkei Avot',               'פרקי אבות',         'leaf-outline',             90),
  ('tefila',         'Téfila',                    'Tefillah (prayer)',         'תפילה',             'sunny-outline',           100),
  ('hebrew_reading', 'Lecture de l''hébreu',      'Hebrew reading',            'קריאה בעברית',      'text-outline',            110),
  ('kabbala',        'Kabbale',                   'Kabbalah',                  'קבלה',              'star-outline',            120),
  ('other',          'Autre',                     'Other',                     'אחר',               'ellipsis-horizontal',     999)
on conflict (id) do update set
  name_fr = excluded.name_fr,
  name_en = excluded.name_en,
  name_he = excluded.name_he,
  icon = excluded.icon,
  sort_order = excluded.sort_order;
