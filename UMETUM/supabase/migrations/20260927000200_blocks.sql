-- =============================================================================
-- Blocage entre membres (exigé par l'App Store pour le contenu entre utilisateurs,
-- règle 1.2) : un membre bloqué ne voit plus les annonces de l'autre, ne peut
-- plus le contacter, et leurs mises en relation en cours sont terminées.
-- =============================================================================

create table public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

create index blocks_blocked_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;

create policy "Chacun voit les membres qu'il a bloqués"
  on public.blocks for select
  to authenticated
  using (blocker_id = (select auth.uid()));

create policy "Chacun débloque"
  on public.blocks for delete
  to authenticated
  using (blocker_id = (select auth.uid()));

-- Un blocage existe-t-il entre moi et cette personne (dans un sens ou l'autre) ?
create or replace function public.is_blocked_with(p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks b
    where (b.blocker_id = (select auth.uid()) and b.blocked_id = p_other)
       or (b.blocker_id = p_other and b.blocked_id = (select auth.uid()))
  );
$$;

-- Bloquer : enregistre le blocage et termine les mises en relation ouvertes.
create or replace function public.block_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_user_id = v_me then
    raise exception 'cannot_block_self' using errcode = '22023';
  end if;

  insert into public.blocks (blocker_id, blocked_id)
  values (v_me, p_user_id)
  on conflict do nothing;

  update public.connections
    set status = 'cancelled'
    where status in ('pending', 'accepted')
      and ((teacher_id = v_me and student_id = p_user_id)
        or (teacher_id = p_user_id and student_id = v_me));
end;
$$;

revoke execute on function public.block_user(uuid) from public, anon;
grant execute on function public.block_user(uuid) to authenticated;

-- Les annonces d'un membre bloqué (ou qui m'a bloqué) disparaissent.
drop policy "Annonces actives visibles, et les siennes toujours" on public.listings;
create policy "Annonces actives visibles, et les siennes toujours"
  on public.listings for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    or (status = 'active' and not public.is_blocked_with(owner_id))
  );

-- Impossible de demander une mise en relation à quelqu'un avec qui un blocage existe.
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

  if not found or public.is_blocked_with(v_listing.owner_id) then
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
