-- =============================================================================
-- Règles de la communauté UMETUM
--   1. Non-mixité : les hommes étudient avec des hommes, les femmes avec des
--      femmes. Imposé par la base (visibilité et mises en relation).
--   2. Chabbat : aucune séance ne peut être planifiée un samedi.
--   3. Rémunération des enseignants : chaque séance confirmée par l'enseignant
--      ET par l'élève est payée au tarif horaire (40 ₪ au lancement).
--      L'association génère les versements chaque mois.
--   4. Matières traduites dans toutes les langues de l'app.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Réglages de l'app (modifiables sans nouvelle version de l'app)
-- -----------------------------------------------------------------------------
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

create policy "Réglages lisibles par tous"
  on public.app_settings for select
  to anon, authenticated
  using (true);

insert into public.app_settings (key, value)
values ('teacher_hourly_rate', '{"amount_cents": 4000, "currency": "ils"}')
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- 1. Non-mixité
-- -----------------------------------------------------------------------------
create or replace function public.my_gender()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select gender from public.profiles where id = (select auth.uid());
$$;

create or replace function public.audience_for(p_gender text)
returns text
language sql
immutable
as $$
  select case p_gender when 'male' then 'men' when 'female' then 'women' end;
$$;

-- Le genre est choisi une fois pour toutes (seule l'équipe peut le corriger).
create or replace function public.profiles_guard()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and old.gender is not null and new.gender is distinct from old.gender then
    raise exception 'gender_locked' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.profiles_guard();

-- Un membre ne voit que les profils de son genre (et le sien).
drop policy "Profils visibles par les membres connectés" on public.profiles;
create policy "Profils visibles entre membres du même genre"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or gender = (select public.my_gender()));

-- Le public d'une annonce est toujours celui du genre de son auteur.
update public.listings l
  set audience = public.audience_for(p.gender)
  from public.profiles p
  where p.id = l.owner_id and p.gender is not null;

create or replace function public.listings_set_audience()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gender text;
begin
  select gender into v_gender from public.profiles where id = new.owner_id;
  if v_gender is null then
    raise exception 'gender_required' using errcode = '22023';
  end if;
  new.audience := public.audience_for(v_gender);
  return new;
end;
$$;

create trigger listings_set_audience
  before insert or update of owner_id, audience on public.listings
  for each row execute function public.listings_set_audience();

drop policy "Annonces actives visibles, et les siennes toujours" on public.listings;
create policy "Annonces visibles : les siennes, et celles de son public"
  on public.listings for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    or (
      status = 'active'
      and audience = public.audience_for((select public.my_gender()))
      and not public.is_blocked_with(owner_id)
    )
  );

-- Mise en relation : uniquement avec une annonce de son public.
create or replace function public.request_connection(
  p_listing_id uuid,
  p_message text default null
)
returns public.connections
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_listing public.listings;
  v_row public.connections;
begin
  if v_me is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_listing
  from public.listings
  where id = p_listing_id and status = 'active';

  if not found
     or public.is_blocked_with(v_listing.owner_id)
     or v_listing.audience is distinct from public.audience_for(public.my_gender()) then
    raise exception 'listing_not_found' using errcode = 'P0002';
  end if;

  if v_listing.owner_id = v_me then
    raise exception 'cannot_request_own_listing' using errcode = '22023';
  end if;

  select * into v_row
  from public.connections
  where listing_id = p_listing_id
    and requested_by = v_me
    and status in ('pending', 'accepted');

  if found then
    return v_row;
  end if;

  insert into public.connections (listing_id, teacher_id, student_id, requested_by, intro_message)
  values (
    p_listing_id,
    case when v_listing.kind = 'offer' then v_listing.owner_id else v_me end,
    case when v_listing.kind = 'offer' then v_me else v_listing.owner_id end,
    v_me,
    nullif(trim(p_message), '')
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2 & 3. Séances : Chabbat, confirmations, versements
-- -----------------------------------------------------------------------------
create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.profiles (id) on delete set null,
  period_start date not null,
  minutes int not null check (minutes > 0),
  amount_cents int not null check (amount_cents >= 0),
  currency text not null default 'ils',
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at timestamptz,
  reference text,
  created_at timestamptz not null default now()
);

create index payouts_teacher_idx on public.payouts (teacher_id, period_start desc);

alter table public.payouts enable row level security;

create policy "Chaque enseignant voit ses versements"
  on public.payouts for select
  to authenticated
  using (teacher_id = (select auth.uid()));

alter table public.study_sessions
  add column timezone text not null default 'Asia/Jerusalem',
  add column teacher_confirmed_at timestamptz,
  add column student_confirmed_at timestamptz,
  add column payout_id uuid references public.payouts (id) on delete set null;

-- Samedi, dans le fuseau horaire de la personne qui planifie.
create or replace function public.is_shabbat(p_at timestamptz, p_timezone text)
returns boolean
language plpgsql
stable
as $$
begin
  return extract(isodow from p_at at time zone p_timezone) = 6;
exception when others then
  return extract(isodow from p_at at time zone 'Asia/Jerusalem') = 6;
end;
$$;

create or replace function public.study_sessions_before_insert()
returns trigger
language plpgsql
as $$
begin
  new.teacher_confirmed_at := null;
  new.student_confirmed_at := null;
  new.payout_id := null;
  new.status := 'scheduled';
  if public.is_shabbat(new.starts_at, new.timezone) then
    raise exception 'shabbat' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger study_sessions_before_insert
  before insert on public.study_sessions
  for each row execute function public.study_sessions_before_insert();

-- Les confirmations et les versements ne passent que par les fonctions
-- ci-dessous (drapeau de transaction « umetum.trusted »). Une séance validée est figée.
create or replace function public.study_sessions_guard()
returns trigger
language plpgsql
as $$
begin
  new.room_name := old.room_name;
  new.connection_id := old.connection_id;
  new.created_by := old.created_by;

  if coalesce(current_setting('umetum.trusted', true), '') <> 'on' then
    if old.status = 'completed' then
      return old;
    end if;
    new.teacher_confirmed_at := old.teacher_confirmed_at;
    new.student_confirmed_at := old.student_confirmed_at;
    new.payout_id := old.payout_id;
    if new.status = 'completed' then
      new.status := old.status;
    end if;
  end if;

  if (new.starts_at is distinct from old.starts_at or new.timezone is distinct from old.timezone)
     and public.is_shabbat(new.starts_at, new.timezone) then
    raise exception 'shabbat' using errcode = '22023';
  end if;

  return new;
end;
$$;

-- Confirmer qu'une séance a eu lieu (enseignant : « donnée », élève : « reçue »).
-- Quand les deux ont confirmé, la séance est validée et sera rémunérée.
create or replace function public.confirm_session(p_session_id uuid)
returns public.study_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_session public.study_sessions;
  v_connection public.connections;
  v_teacher_at timestamptz;
  v_student_at timestamptz;
begin
  select * into v_session from public.study_sessions where id = p_session_id for update;
  if not found then
    raise exception 'session_not_found' using errcode = 'P0002';
  end if;

  select * into v_connection from public.connections where id = v_session.connection_id;
  if v_me is null or v_me not in (v_connection.teacher_id, v_connection.student_id) then
    raise exception 'session_not_found' using errcode = 'P0002';
  end if;

  if v_session.status = 'cancelled' then
    raise exception 'session_cancelled' using errcode = '22023';
  end if;
  if v_session.starts_at + make_interval(mins => v_session.duration_minutes) > now() then
    raise exception 'session_not_ended' using errcode = '22023';
  end if;

  v_teacher_at := case when v_me = v_connection.teacher_id
    then coalesce(v_session.teacher_confirmed_at, now()) else v_session.teacher_confirmed_at end;
  v_student_at := case when v_me = v_connection.student_id
    then coalesce(v_session.student_confirmed_at, now()) else v_session.student_confirmed_at end;

  perform set_config('umetum.trusted', 'on', true);
  update public.study_sessions
    set teacher_confirmed_at = v_teacher_at,
        student_confirmed_at = v_student_at,
        status = case
          when v_teacher_at is not null and v_student_at is not null then 'completed'
          else status
        end
    where id = p_session_id
    returning * into v_session;
  perform set_config('umetum.trusted', 'off', true);

  return v_session;
end;
$$;

revoke execute on function public.confirm_session(uuid) from public, anon;
grant execute on function public.confirm_session(uuid) to authenticated;

-- Versements mensuels : à lancer par l'équipe (SQL editor ou tâche planifiée),
-- ex. `select public.generate_payouts('2026-10-01');`
-- Crée un versement par enseignant pour les séances validées du mois non encore payées.
create or replace function public.generate_payouts(p_month date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_start date := date_trunc('month', p_month)::date;
  v_end date := (date_trunc('month', p_month) + interval '1 month')::date;
  v_rate jsonb;
  v_count integer := 0;
  v_payout uuid;
  r record;
begin
  select value into v_rate from public.app_settings where key = 'teacher_hourly_rate';
  if v_rate is null then
    raise exception 'missing_teacher_hourly_rate';
  end if;

  perform set_config('umetum.trusted', 'on', true);
  for r in
    select c.teacher_id, sum(s.duration_minutes)::int as minutes, array_agg(s.id) as session_ids
    from public.study_sessions s
    join public.connections c on c.id = s.connection_id
    where s.status = 'completed'
      and s.payout_id is null
      and s.starts_at >= v_start
      and s.starts_at < v_end
    group by c.teacher_id
  loop
    insert into public.payouts (teacher_id, period_start, minutes, amount_cents, currency)
    values (
      r.teacher_id,
      v_start,
      r.minutes,
      round(r.minutes * (v_rate ->> 'amount_cents')::numeric / 60),
      coalesce(v_rate ->> 'currency', 'ils')
    )
    returning id into v_payout;

    update public.study_sessions set payout_id = v_payout where id = any (r.session_ids);
    v_count := v_count + 1;
  end loop;
  perform set_config('umetum.trusted', 'off', true);

  return v_count;
end;
$$;

revoke execute on function public.generate_payouts(date) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. Matières dans toutes les langues de l'app
-- -----------------------------------------------------------------------------
alter table public.topics add column names jsonb not null default '{}'::jsonb;

update public.topics t
  set names = jsonb_build_object('fr', t.name_fr, 'en', t.name_en, 'he', t.name_he) || v.extra
  from (values
    ('parasha',        '{"yi": "די וואָכיקע סדרה", "ru": "Недельная глава", "es": "Parashá de la semana", "pt": "Parashá da semana", "it": "Parashà della settimana", "de": "Wochenabschnitt"}'::jsonb),
    ('tanakh',         '{"yi": "תּנ״ך", "ru": "Танах", "es": "Tanaj", "pt": "Tanach", "it": "Tanakh", "de": "Tanach"}'::jsonb),
    ('guemara',        '{"yi": "גמרא", "ru": "Гемара", "es": "Guemará", "pt": "Guemará", "it": "Ghemarà", "de": "Gemara"}'::jsonb),
    ('michna',         '{"yi": "משנה", "ru": "Мишна", "es": "Mishná", "pt": "Mishná", "it": "Mishnà", "de": "Mischna"}'::jsonb),
    ('halakha',        '{"yi": "הלכה", "ru": "Алаха", "es": "Halajá", "pt": "Halachá", "it": "Halakhà", "de": "Halacha"}'::jsonb),
    ('moussar',        '{"yi": "מוסר", "ru": "Мусар", "es": "Musar", "pt": "Mussar", "it": "Musar", "de": "Mussar"}'::jsonb),
    ('hassidout',      '{"yi": "חסידות", "ru": "Хасидут", "es": "Jasidut", "pt": "Chassidut", "it": "Chassidut", "de": "Chassidut"}'::jsonb),
    ('emouna',         '{"yi": "אמונה און יידישע מחשבה", "ru": "Эмуна и еврейская мысль", "es": "Emuná y pensamiento judío", "pt": "Emuná e pensamento judaico", "it": "Emunà e pensiero ebraico", "de": "Emuna und jüdisches Denken"}'::jsonb),
    ('pirke_avot',     '{"yi": "פּרקי אָבֿות", "ru": "Пиркей Авот", "es": "Pirké Avot", "pt": "Pirkê Avot", "it": "Pirkè Avot", "de": "Pirke Awot"}'::jsonb),
    ('tefila',         '{"yi": "תּפֿילה", "ru": "Молитва", "es": "Tefilá (rezo)", "pt": "Tefilá (reza)", "it": "Tefillà (preghiera)", "de": "Tefila (Gebet)"}'::jsonb),
    ('hebrew_reading', '{"yi": "לייענען לשון־קודש", "ru": "Чтение на иврите", "es": "Lectura del hebreo", "pt": "Leitura do hebraico", "it": "Lettura dell’ebraico", "de": "Hebräisch lesen"}'::jsonb),
    ('kabbala',        '{"yi": "קבלה", "ru": "Каббала", "es": "Cábala", "pt": "Cabalá", "it": "Qabbalà", "de": "Kabbala"}'::jsonb),
    ('other',          '{"yi": "אַנדערש", "ru": "Другое", "es": "Otro", "pt": "Outro", "it": "Altro", "de": "Anderes"}'::jsonb)
  ) as v(id, extra)
  where t.id = v.id;
