-- Scénarios RLS : un enseignant (A), un élève (B), un intrus (C).
-- Chaque bloc DO lève une exception si une règle de sécurité est violée.
\set ON_ERROR_STOP 1
\set A '''aaaaaaaa-0000-0000-0000-000000000001'''
\set B '''bbbbbbbb-0000-0000-0000-000000000002'''
\set C '''cccccccc-0000-0000-0000-000000000003'''
\set L '''dddddddd-0000-0000-0000-000000000004'''
insert into auth.users (id, email, raw_user_meta_data) values
  (:A, 'rav.moshe@example.com', '{"display_name":"Rav Moshe"}'),
  (:B, 'david@example.com', '{}'),
  (:C, 'intrus@example.com', '{}');
select id, display_name from profiles where id in (:A, :B, :C) order by id;

-- helper to act as a user
create or replace function test_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false);
  execute 'set role authenticated';
end $$;
grant execute on function test_as(uuid) to authenticated;

-- A publishes an offer
select test_as(:A);
insert into listings (id, owner_id, kind, topic_id, title, format) values (:L, :A, 'offer', 'guemara', 'Guemara Berakhot pour débutants', 'video');
-- A cannot publish in the name of B
do $$ begin
  insert into listings (owner_id, kind, topic_id, title) values ('bbbbbbbb-0000-0000-0000-000000000002', 'offer', 'tanakh', 'Faux');
  raise exception 'FAIL: impersonated listing insert';
exception when insufficient_privilege then raise notice 'OK: cannot publish for someone else';
end $$;
-- A cannot request own listing
do $$ begin
  perform request_connection('dddddddd-0000-0000-0000-000000000004', 'hi');
  raise exception 'FAIL: own listing request';
exception when others then
  if sqlerrm = 'cannot_request_own_listing' then raise notice 'OK: cannot request own listing'; else raise; end if;
end $$;
reset role;

-- B requests to study
select test_as(:B);
select (request_connection('dddddddd-0000-0000-0000-000000000004', 'Bonjour, je débute !')).status as b_request;
-- idempotent
select count(*) as open_requests_after_retry from (select request_connection('dddddddd-0000-0000-0000-000000000004', 'bis')) x;
select count(*) as b_sees_connections from connections;
do $$ begin
  if (select teacher_id from connections where listing_id = 'dddddddd-0000-0000-0000-000000000004') <> 'aaaaaaaa-0000-0000-0000-000000000001' then raise exception 'FAIL teacher'; end if;
  if (select student_id from connections where listing_id = 'dddddddd-0000-0000-0000-000000000004') <> 'bbbbbbbb-0000-0000-0000-000000000002' then raise exception 'FAIL student'; end if;
  raise notice 'OK: teacher/student computed from listing kind';
end $$;
-- B cannot accept own request
do $$ begin
  perform respond_connection((select id from connections where listing_id = 'dddddddd-0000-0000-0000-000000000004' order by created_at desc limit 1), 'accept');
  raise exception 'FAIL: requester accepted own request';
exception when others then
  if sqlerrm = 'not_allowed' then raise notice 'OK: requester cannot accept'; else raise; end if;
end $$;
-- B cannot write messages before acceptance
do $$ begin
  insert into messages (connection_id, sender_id, body) values ((select id from connections where listing_id = 'dddddddd-0000-0000-0000-000000000004' order by created_at desc limit 1), 'bbbbbbbb-0000-0000-0000-000000000002', 'trop tôt');
  raise exception 'FAIL: message before accept';
exception when insufficient_privilege then raise notice 'OK: no chat before acceptance';
end $$;
-- B cannot update A's listing (silently 0 rows)
update listings set title = 'piraté' where id = :L;
reset role;
select title as listing_title_unchanged from listings where id = :L;

-- A accepts
select test_as(:A);
select (respond_connection((select id from connections where listing_id = 'dddddddd-0000-0000-0000-000000000004' order by created_at desc limit 1), 'accept')).status as a_accepts;
reset role;

-- B chats and schedules
select test_as(:B);
insert into messages (connection_id, sender_id, body) values ((select id from connections where listing_id = 'dddddddd-0000-0000-0000-000000000004' order by created_at desc limit 1), :B, 'Merci Rav !');
insert into study_sessions (connection_id, created_by, starts_at, mode) values ((select id from connections where listing_id = 'dddddddd-0000-0000-0000-000000000004' order by created_at desc limit 1), :B, now() + interval '1 day', 'video');
update study_sessions set room_name = 'hijack', duration_minutes = 60;
select count(*) as b_messages, (select room_name like 'umetum-%' from study_sessions) as room_name_protected, (select duration_minutes from study_sessions) as duration from messages;
-- B cannot insert donation
do $$ begin
  insert into donations (user_id, kind, amount_cents) values ('bbbbbbbb-0000-0000-0000-000000000002', 'one_time', 1800);
  raise exception 'FAIL: client inserted donation';
exception when insufficient_privilege then raise notice 'OK: donations are server-only';
end $$;
reset role;

-- C (outsider) sees nothing private
select test_as(:C);
select (select count(*) from connections) as c_connections, (select count(*) from messages) as c_messages, (select count(*) from study_sessions) as c_sessions, (select count(*) from listings where id = :L) as c_listings_visible, (select count(*) from stripe_customers) as c_stripe;
do $$ begin
  insert into messages (connection_id, sender_id, body) values ((select id from connections where listing_id = 'dddddddd-0000-0000-0000-000000000004' order by created_at desc limit 1), 'cccccccc-0000-0000-0000-000000000003', 'intrus');
  raise exception 'FAIL: outsider wrote message';
exception when insufficient_privilege or not_null_violation then raise notice 'OK: outsider cannot write';
end $$;
do $$ begin
  perform respond_connection('00000000-0000-0000-0000-000000000000', 'accept');
  raise exception 'FAIL';
exception when others then
  if sqlerrm = 'connection_not_found' then raise notice 'OK: outsider cannot respond'; else raise; end if;
end $$;
insert into reports (reported_user_id, reason) values (:A, 'spam');
select count(*) as c_reports from reports;
reset role;

-- anon cannot call RPCs
set role anon;
do $$ begin
  perform request_connection('dddddddd-0000-0000-0000-000000000004', 'x');
  raise exception 'FAIL anon';
exception when insufficient_privilege then raise notice 'OK: anon cannot call request_connection';
end $$;
reset role;

-- A cancels -> B can no longer chat
select test_as(:A);
select (respond_connection((select id from connections where listing_id = 'dddddddd-0000-0000-0000-000000000004' order by created_at desc limit 1), 'cancel')).status as a_cancels;
reset role;
select test_as(:B);
do $$ begin
  insert into messages (connection_id, sender_id, body) values ((select id from connections where listing_id = 'dddddddd-0000-0000-0000-000000000004' order by created_at desc limit 1), 'bbbbbbbb-0000-0000-0000-000000000002', 'encore');
  raise exception 'FAIL: chat after cancel';
exception when insufficient_privilege then raise notice 'OK: chat closed after cancel';
end $$;
-- B can request again after cancel (new open request allowed)
select (request_connection('dddddddd-0000-0000-0000-000000000004', 'on reprend ?')).status as b_new_request;
reset role;

-- Blocage : A bloque B -> la demande en cours de B est terminée, B ne voit plus l'annonce
select test_as(:A);
select block_user(:B);
reset role;
select test_as(:B);
select (select count(*) from listings where id = :L) as b_sees_listing_after_block;
do $$ begin
  if exists (select 1 from connections where listing_id = 'dddddddd-0000-0000-0000-000000000004' and status in ('pending','accepted')) then
    raise exception 'FAIL: open connection survived block';
  end if;
  raise notice 'OK: block closes open connections';
  if exists (select 1 from listings where id = 'dddddddd-0000-0000-0000-000000000004') then
    raise exception 'FAIL: blocked user still sees listing';
  end if;
  raise notice 'OK: blocked user no longer sees listings';
end $$;
do $$ begin
  perform request_connection('dddddddd-0000-0000-0000-000000000004', 'encore moi');
  raise exception 'FAIL: blocked user could request';
exception when others then
  if sqlerrm = 'listing_not_found' then raise notice 'OK: blocked user cannot request'; else raise; end if;
end $$;
-- B ne peut pas lire la liste de blocage de A
select count(*) as b_sees_blocks from blocks;
reset role;
select status, count(*) from connections where listing_id = :L group by status order by status;
\echo ALL_RLS_TESTS_PASSED
