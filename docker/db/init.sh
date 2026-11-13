#!/bin/sh
# Se ejecuta UNA vez, al crear el volumen de datos (docker-entrypoint-initdb.d).
# 1) Crea los roles que en Supabase ya existen (anon, authenticated, service_role, authenticator).
# 2) Aplica supabase/migrations/*.sql en orden — las mismas migraciones que se usan en Supabase cloud.
set -eu

psql -v ON_ERROR_STOP=1 -v authpw="${AUTHENTICATOR_PASSWORD}" --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon')          then create role anon          nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role')  then create role service_role  nologin noinherit bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then create role authenticator login  noinherit; end if;
end $$;

select format('alter role authenticator with password %L', :'authpw') \gexec
grant anon, authenticated, service_role to authenticator;
grant usage on schema extensions to anon, authenticated, service_role;
SQL

for f in /migrations/*.sql; do
  echo ">> aplicando $(basename "$f")"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$f"
done
echo ">> base postgres lista (esquema boxing_gym)"
