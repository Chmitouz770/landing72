-- Scénarios de sécurité : A et B sont des hommes (A enseigne, B apprend),
-- C est une femme. Chaque bloc DO lève une exception si une règle est violée.
\set ON_ERROR_STOP 1
\set A '''aaaaaaaa-0000-0000-0000-000000000001'''
\set B '''bbbbbbbb-0000-0000-0000-000000000002'''
\set C '''cccccccc-0000-0000-0000-000000000003'''
\set L '''dddddddd-0000-0000-0000-000000000004'''
\set S1 '''eeeeeeee-0000-0000-0000-000000000001'''
\set S2 '''eeeeeeee-0000-0000-0000-000000000002'''

insert into auth.users (id, email, raw_user_meta_data) values
  (:A, 'rav.moshe@example.com', '{"display_name":"Rav Moshe"}'),
  (:B, 'david@example.com', '{}'),
  (:C, 'sarah@example.com', '{}');
update profiles set gender = 'male' where id in (:A, :B);
update profiles set gender = 'female' where id = :C;

create or replace function test_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false);
  execute 'set role authenticated';
end $$;
grant execute on function test_as(uuid) to authenticated;

create or replace function expect_error(sql text, expected text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'FAIL: expected error % for: %', expected, sql;
exception when others then
  if sqlerrm like 'FAIL:%' then raise; end if;
  if expected <> '*' and sqlerrm <> expected then
    raise exception 'FAIL: expected %, got % for: %', expected, sqlerrm, sql;
  end if;
  raise notice 'OK: % -> %', left(sql, 60), sqlerrm;
end $$;
grant execute on function expect_error(text, text) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Annonces et non-mixité
-- ---------------------------------------------------------------------------
select test_as(:A);
insert into listings (id, owner_id, kind, topic_id, title, format, audience)
values (:L, :A, 'offer', 'guemara', 'Guemara Berakhot pour débutants', 'video', 'women');
do $$ begin
  if (select audience from listings where id = 'dddddddd-0000-0000-0000-000000000004') <> 'men' then
    raise exception 'FAIL: audience not forced to the owner gender';
  end if;
  raise notice 'OK: listing audience follows the owner gender';
end $$;
select expect_error($$insert into listings (owner_id, kind, topic_id, title) values ('bbbbbbbb-0000-0000-0000-000000000002', 'offer', 'tanakh', 'Faux')$$, 'new row violates row-level security policy for table "listings"');
select expect_error($$select request_connection('dddddddd-0000-0000-0000-000000000004', 'hi')$$, 'cannot_request_own_listing');
select expect_error($$update profiles set gender = 'female' where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, 'gender_locked');
reset role;

select test_as(:C);
do $$ begin
  if exists (select 1 from listings where id = 'dddddddd-0000-0000-0000-000000000004') then
    raise exception 'FAIL: a woman sees a men-only listing';
  end if;
  if exists (select 1 from profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001') then
    raise exception 'FAIL: a woman sees a man profile';
  end if;
  raise notice 'OK: no mixing in listings and profiles';
end $$;
select expect_error($$select request_connection('dddddddd-0000-0000-0000-000000000004', 'bonjour')$$, 'listing_not_found');
reset role;

-- ---------------------------------------------------------------------------
-- Mise en relation
-- ---------------------------------------------------------------------------
select test_as(:B);
select (request_connection(:L, 'Bonjour, je débute !')).status as b_request;
select count(*) as open_requests_after_retry from (select request_connection(:L, 'bis')) x;
do $$ begin
  if (select teacher_id from connections where listing_id = 'dddddddd-0000-0000-0000-000000000004') <> 'aaaaaaaa-0000-0000-0000-000000000001'
     or (select student_id from connections where listing_id = 'dddddddd-0000-0000-0000-000000000004') <> 'bbbbbbbb-0000-0000-0000-000000000002' then
    raise exception 'FAIL: roles';
  end if;
  raise notice 'OK: teacher/student computed from listing kind';
end $$;
select expect_error($$select respond_connection((select id from connections limit 1), 'accept')$$, 'not_allowed');
select expect_error($$insert into messages (connection_id, sender_id, body) values ((select id from connections limit 1), 'bbbbbbbb-0000-0000-0000-000000000002', 'trop tôt')$$, 'new row violates row-level security policy for table "messages"');
update listings set title = 'piraté' where id = :L;
reset role;
select title as listing_title_unchanged from listings where id = :L;

select test_as(:A);
select (respond_connection((select id from connections where listing_id = :L), 'accept')).status as a_accepts;
reset role;

-- ---------------------------------------------------------------------------
-- Chat, séances, Chabbat
-- ---------------------------------------------------------------------------
select test_as(:B);
insert into messages (connection_id, sender_id, body)
values ((select id from connections where listing_id = :L), :B, 'Merci Rav !');
-- S1 : lundi futur. S2 : jeudi passé (pour la confirmation).
insert into study_sessions (id, connection_id, created_by, starts_at, mode, timezone)
values (:S1, (select id from connections where listing_id = :L), :B, '2030-01-07T18:00:00Z', 'video', 'Europe/Paris');
insert into study_sessions (id, connection_id, created_by, starts_at, duration_minutes, mode, status, timezone)
values (:S2, (select id from connections where listing_id = :L), :B, '2026-09-24T10:00:00Z', 45, 'in_person', 'completed', 'Asia/Jerusalem');
select expect_error($$insert into study_sessions (connection_id, created_by, starts_at, timezone) values ((select id from connections limit 1), 'bbbbbbbb-0000-0000-0000-000000000002', '2026-10-03T10:00:00Z', 'Europe/Paris')$$, 'shabbat');
select expect_error($$update study_sessions set starts_at = '2030-01-05T10:00:00Z' where id = 'eeeeeeee-0000-0000-0000-000000000001'$$, 'shabbat');
update study_sessions set room_name = 'hijack', duration_minutes = 60 where id = :S1;
update study_sessions set student_confirmed_at = now(), teacher_confirmed_at = now(), status = 'completed' where id = :S2;
do $$ begin
  if (select status from study_sessions where id = 'eeeeeeee-0000-0000-0000-000000000002') <> 'scheduled' then
    raise exception 'FAIL: insert or direct update could validate a session';
  end if;
  if (select room_name from study_sessions where id = 'eeeeeeee-0000-0000-0000-000000000001') not like 'umetum-%' then
    raise exception 'FAIL: room_name changed';
  end if;
  raise notice 'OK: validation only through confirm_session, room protected';
end $$;
select expect_error($$select confirm_session('eeeeeeee-0000-0000-0000-000000000001')$$, 'session_not_ended');
reset role;

-- ---------------------------------------------------------------------------
-- Confirmation et rémunération
-- ---------------------------------------------------------------------------
select test_as(:C);
select expect_error($$select confirm_session('eeeeeeee-0000-0000-0000-000000000002')$$, 'session_not_found');
reset role;

select test_as(:A);
select status as after_teacher_confirm, teacher_confirmed_at is not null as teacher_ok from confirm_session(:S2);
reset role;
select test_as(:B);
select status as after_student_confirm from confirm_session(:S2);
reset role;
select test_as(:A);
update study_sessions set duration_minutes = 240 where id = :S2;
select expect_error($$select generate_payouts('2026-09-01')$$, '*');
reset role;
do $$ begin
  if (select duration_minutes from study_sessions where id = 'eeeeeeee-0000-0000-0000-000000000002') <> 45 then
    raise exception 'FAIL: a validated session was modified';
  end if;
  raise notice 'OK: validated sessions are frozen';
end $$;

select generate_payouts('2026-09-01') as payouts_created;
select test_as(:A);
do $$ begin
  if (select amount_cents from payouts) <> 3000 or (select currency from payouts) <> 'ils' then
    raise exception 'FAIL: 45 min at 40 ILS/h should be 30 ILS';
  end if;
  raise notice 'OK: teacher sees payout of 30 ILS for 45 min';
end $$;
select value ->> 'amount_cents' as hourly_rate_cents from app_settings where key = 'teacher_hourly_rate';
reset role;
select test_as(:B);
select count(*) as b_sees_payouts from payouts;
select expect_error($$insert into donations (user_id, kind, amount_cents) values ('bbbbbbbb-0000-0000-0000-000000000002', 'one_time', 1800)$$, '*');
reset role;
select generate_payouts('2026-09-01') as payouts_created_again;

-- ---------------------------------------------------------------------------
-- Intrus, anonymes, fin de relation, blocage
-- ---------------------------------------------------------------------------
select test_as(:C);
select (select count(*) from connections) as c_connections, (select count(*) from messages) as c_messages,
       (select count(*) from study_sessions) as c_sessions, (select count(*) from stripe_customers) as c_stripe;
select expect_error($$insert into messages (connection_id, sender_id, body) values ((select id from connections limit 1), 'cccccccc-0000-0000-0000-000000000003', 'intrus')$$, '*');
select expect_error($$select respond_connection('00000000-0000-0000-0000-000000000000', 'accept')$$, 'connection_not_found');
insert into reports (reported_user_id, reason) values (:A, 'spam');
reset role;

set role anon;
select expect_error($$select request_connection('dddddddd-0000-0000-0000-000000000004', 'x')$$, 'permission denied for function request_connection');
reset role;

select test_as(:A);
select (respond_connection((select id from connections where listing_id = :L), 'cancel')).status as a_cancels;
reset role;
select test_as(:B);
select expect_error($$insert into messages (connection_id, sender_id, body) values ((select id from connections limit 1), 'bbbbbbbb-0000-0000-0000-000000000002', 'encore')$$, 'new row violates row-level security policy for table "messages"');
select (request_connection(:L, 'on reprend ?')).status as b_new_request;
reset role;

select test_as(:A);
select block_user(:B);
reset role;
select test_as(:B);
do $$ begin
  if exists (select 1 from connections where listing_id = 'dddddddd-0000-0000-0000-000000000004' and status in ('pending','accepted')) then
    raise exception 'FAIL: open connection survived block';
  end if;
  if exists (select 1 from listings where id = 'dddddddd-0000-0000-0000-000000000004') then
    raise exception 'FAIL: blocked user still sees listing';
  end if;
  raise notice 'OK: block closes connections and hides listings';
end $$;
select expect_error($$select request_connection('dddddddd-0000-0000-0000-000000000004', 'encore moi')$$, 'listing_not_found');
select count(*) as b_sees_blocks from blocks;
reset role;

\echo ALL_RLS_TESTS_PASSED
