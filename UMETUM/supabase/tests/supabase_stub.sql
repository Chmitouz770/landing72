-- Minimal stand-in for the Supabase platform (roles, auth schema, realtime publication).
-- Lets us test migrations + RLS on a plain Postgres (CI, or locally without Docker).
-- Roles are cluster-wide: create them only once.
do $$ begin
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
exception when duplicate_object then null;
end $$;
create schema auth;
create table auth.users (
  id uuid primary key, instance_id uuid, aud text, role text, email text,
  raw_user_meta_data jsonb default '{}'::jsonb, email_confirmed_at timestamptz,
  created_at timestamptz, updated_at timestamptz
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
create publication supabase_realtime;
