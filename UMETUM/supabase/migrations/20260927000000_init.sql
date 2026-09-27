-- =============================================================================
-- UMETUM — schéma initial
--
-- Principes :
--   * Tout le monde peut être élève ET enseignant : pas de « rôle » figé,
--     c'est chaque annonce (listing) qui dit si on propose ou si on cherche.
--   * Row Level Security partout : le client (app) n'accède qu'à ce que
--     l'utilisateur connecté a le droit de voir.
--   * Les écritures sensibles (mise en relation, dons) passent par des
--     fonctions SQL « security definer » ou par les Edge Functions (service role).
--   * On utilise du texte + CHECK plutôt que des ENUM Postgres pour pouvoir
--     faire évoluer les valeurs facilement dans de futures migrations.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Utilitaires
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Profils
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  bio text check (char_length(bio) <= 1000),
  avatar_url text,
  gender text check (gender in ('male', 'female')),
  city text check (char_length(city) <= 80),
  country text check (char_length(country) <= 2),
  languages text[] not null default '{fr}',
  wants_to_learn boolean not null default true,
  wants_to_teach boolean not null default false,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Crée automatiquement un profil à l'inscription.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Ami'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "Profils visibles par les membres connectés"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Chacun modifie son propre profil"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Matières (Guemara, Halakha, ...) — table pour pouvoir en ajouter sans
-- republier l'app.
-- -----------------------------------------------------------------------------
create table public.topics (
  id text primary key check (id ~ '^[a-z0-9_]+$'),
  name_fr text not null,
  name_en text not null,
  name_he text not null,
  icon text not null default 'book',
  sort_order int not null default 100,
  is_active boolean not null default true
);

alter table public.topics enable row level security;

create policy "Matières lisibles par tous"
  on public.topics for select
  to anon, authenticated
  using (is_active);

-- -----------------------------------------------------------------------------
-- Annonces : « je propose un cours » (offer) / « je cherche un cours » (request)
-- -----------------------------------------------------------------------------
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('offer', 'request')),
  topic_id text not null references public.topics (id),
  title text not null check (char_length(title) between 3 and 120),
  description text check (char_length(description) <= 2000),
  level text not null default 'all'
    check (level in ('beginner', 'intermediate', 'advanced', 'all')),
  format text not null default 'video'
    check (format in ('in_person', 'video', 'both')),
  audience text not null default 'all'
    check (audience in ('men', 'women', 'all')),
  languages text[] not null default '{fr}',
  city text check (char_length(city) <= 80),
  availability text check (char_length(availability) <= 200),
  status text not null default 'active'
    check (status in ('active', 'paused', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index listings_feed_idx
  on public.listings (status, kind, created_at desc);
create index listings_topic_idx on public.listings (topic_id) where status = 'active';
create index listings_owner_idx on public.listings (owner_id);

create trigger listings_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

alter table public.listings enable row level security;

create policy "Annonces actives visibles, et les siennes toujours"
  on public.listings for select
  to authenticated
  using (status = 'active' or owner_id = (select auth.uid()));

create policy "Publier ses annonces"
  on public.listings for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Modifier ses annonces"
  on public.listings for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Supprimer ses annonces"
  on public.listings for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Mises en relation (une « havrouta » entre un enseignant et un élève)
-- -----------------------------------------------------------------------------
create table public.connections (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings (id) on delete set null,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  requested_by uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  intro_message text check (char_length(intro_message) <= 1000),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint connections_distinct_people check (teacher_id <> student_id),
  constraint connections_requester_is_member
    check (requested_by in (teacher_id, student_id))
);

-- Une seule demande « vivante » par annonce et par demandeur.
create unique index connections_one_open_per_listing
  on public.connections (listing_id, requested_by)
  where status in ('pending', 'accepted');

create index connections_teacher_idx on public.connections (teacher_id, updated_at desc);
create index connections_student_idx on public.connections (student_id, updated_at desc);

create trigger connections_updated_at
  before update on public.connections
  for each row execute function public.set_updated_at();

alter table public.connections enable row level security;

create policy "Les deux membres voient leur mise en relation"
  on public.connections for select
  to authenticated
  using ((select auth.uid()) in (teacher_id, student_id));

-- Pas de policy insert/update : tout passe par les fonctions ci-dessous.

create or replace function public.is_connection_member(p_connection_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.connections c
    where c.id = p_connection_id
      and (select auth.uid()) in (c.teacher_id, c.student_id)
  );
$$;

create or replace function public.is_connection_active(p_connection_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.connections c
    where c.id = p_connection_id
      and c.status = 'accepted'
      and (select auth.uid()) in (c.teacher_id, c.student_id)
  );
$$;

-- Répondre à une annonce : calcule qui est l'enseignant et qui est l'élève.
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

  if not found then
    raise exception 'listing_not_found' using errcode = 'P0002';
  end if;

  if v_listing.owner_id = v_me then
    raise exception 'cannot_request_own_listing' using errcode = '22023';
  end if;

  -- Déjà une demande en cours ? On la renvoie (idempotent, pas d'erreur).
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

-- Accepter / refuser (le destinataire) ou annuler (le demandeur).
create or replace function public.respond_connection(
  p_connection_id uuid,
  p_action text
)
returns public.connections
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_row public.connections;
begin
  select * into v_row
  from public.connections
  where id = p_connection_id
  for update;

  if not found or v_me not in (v_row.teacher_id, v_row.student_id) then
    raise exception 'connection_not_found' using errcode = 'P0002';
  end if;

  if p_action in ('accept', 'decline') then
    if v_row.requested_by = v_me or v_row.status <> 'pending' then
      raise exception 'not_allowed' using errcode = '42501';
    end if;
    update public.connections
      set status = case when p_action = 'accept' then 'accepted' else 'declined' end,
          responded_at = now()
      where id = p_connection_id
      returning * into v_row;
  elsif p_action = 'cancel' then
    if v_row.status not in ('pending', 'accepted') then
      raise exception 'not_allowed' using errcode = '42501';
    end if;
    update public.connections
      set status = 'cancelled'
      where id = p_connection_id
      returning * into v_row;
  else
    raise exception 'invalid_action' using errcode = '22023';
  end if;

  return v_row;
end;
$$;

-- -----------------------------------------------------------------------------
-- Messages (chat entre les deux membres d'une mise en relation acceptée)
-- -----------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.connections (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index messages_connection_idx on public.messages (connection_id, created_at desc);

alter table public.messages enable row level security;

create policy "Les membres lisent leurs messages"
  on public.messages for select
  to authenticated
  using (public.is_connection_member(connection_id));

create policy "Les membres écrivent dans une relation acceptée"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.is_connection_active(connection_id)
  );

-- Un nouveau message fait remonter la conversation en haut de la liste.
create or replace function public.touch_connection_on_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.connections set updated_at = now() where id = new.connection_id;
  return new;
end;
$$;

create trigger messages_touch_connection
  after insert on public.messages
  for each row execute function public.touch_connection_on_message();

-- -----------------------------------------------------------------------------
-- Séances d'étude (en visio ou en présentiel)
-- -----------------------------------------------------------------------------
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.connections (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  starts_at timestamptz not null,
  duration_minutes int not null default 45 check (duration_minutes between 10 and 240),
  mode text not null default 'video' check (mode in ('video', 'in_person')),
  location text check (char_length(location) <= 200),
  room_name text not null unique default ('umetum-' || replace(gen_random_uuid()::text, '-', '')),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled')),
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index study_sessions_connection_idx on public.study_sessions (connection_id, starts_at);
create index study_sessions_upcoming_idx on public.study_sessions (starts_at) where status = 'scheduled';

create trigger study_sessions_updated_at
  before update on public.study_sessions
  for each row execute function public.set_updated_at();

alter table public.study_sessions enable row level security;

create policy "Les membres voient leurs séances"
  on public.study_sessions for select
  to authenticated
  using (public.is_connection_member(connection_id));

create policy "Les membres planifient des séances"
  on public.study_sessions for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and public.is_connection_active(connection_id)
  );

create policy "Les membres modifient leurs séances"
  on public.study_sessions for update
  to authenticated
  using (public.is_connection_member(connection_id))
  with check (public.is_connection_member(connection_id));

-- room_name, connection_id et created_by ne doivent jamais changer.
create or replace function public.study_sessions_guard()
returns trigger
language plpgsql
as $$
begin
  new.room_name := old.room_name;
  new.connection_id := old.connection_id;
  new.created_by := old.created_by;
  return new;
end;
$$;

create trigger study_sessions_guard
  before update on public.study_sessions
  for each row execute function public.study_sessions_guard();

-- -----------------------------------------------------------------------------
-- Dons et abonnements « maasser » (écrits uniquement par le webhook Stripe)
-- -----------------------------------------------------------------------------
create table public.stripe_customers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  customer_id text not null unique,
  created_at timestamptz not null default now()
);

alter table public.stripe_customers enable row level security;
-- Aucune policy : accessible uniquement via la service role (Edge Functions).

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  amount_cents int not null check (amount_cents > 0),
  currency text not null default 'eur',
  status text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  dedication text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_idx on public.subscriptions (user_id);

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

create policy "Chacun voit ses abonnements"
  on public.subscriptions for select
  to authenticated
  using (user_id = (select auth.uid()));

create table public.donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  kind text not null check (kind in ('one_time', 'monthly')),
  amount_cents int not null check (amount_cents > 0),
  currency text not null default 'eur',
  status text not null default 'paid' check (status in ('paid', 'refunded')),
  dedication text check (char_length(dedication) <= 200),
  stripe_checkout_session_id text unique,
  stripe_invoice_id text unique,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

create index donations_user_idx on public.donations (user_id, created_at desc);

alter table public.donations enable row level security;

create policy "Chacun voit ses dons"
  on public.donations for select
  to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Signalements (sécurité de la communauté)
-- -----------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reported_user_id uuid references public.profiles (id) on delete cascade,
  listing_id uuid references public.listings (id) on delete set null,
  reason text not null check (reason in ('inappropriate', 'spam', 'safety', 'other')),
  details text check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  constraint reports_has_target check (reported_user_id is not null or listing_id is not null)
);

alter table public.reports enable row level security;

create policy "Signaler"
  on public.reports for insert
  to authenticated
  with check (reporter_id = (select auth.uid()));

create policy "Voir ses signalements"
  on public.reports for select
  to authenticated
  using (reporter_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Temps réel : le chat et les statuts de mise en relation
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
    alter publication supabase_realtime add table public.connections;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Stockage : photos de profil (bucket public, chacun écrit dans son dossier)
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do nothing;

    execute $p$
      create policy "Avatars : lecture publique"
        on storage.objects for select
        using (bucket_id = 'avatars')
    $p$;
    execute $p$
      create policy "Avatars : chacun écrit dans son dossier"
        on storage.objects for insert
        to authenticated
        with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
    $p$;
    execute $p$
      create policy "Avatars : chacun remplace ses fichiers"
        on storage.objects for update
        to authenticated
        using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
    $p$;
    execute $p$
      create policy "Avatars : chacun supprime ses fichiers"
        on storage.objects for delete
        to authenticated
        using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
    $p$;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Droits d'exécution des fonctions appelées par l'app
-- -----------------------------------------------------------------------------
revoke execute on function public.request_connection(uuid, text) from public, anon;
revoke execute on function public.respond_connection(uuid, text) from public, anon;
grant execute on function public.request_connection(uuid, text) to authenticated;
grant execute on function public.respond_connection(uuid, text) to authenticated;
