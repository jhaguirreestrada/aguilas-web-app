-- =============================================================================
--  Migración 4/5 — Permisos.
--
--  Solo `service_role` (clave secreta del servidor) puede usar el esquema. anon y
--  authenticated no reciben nada: aunque alguien obtenga la URL pública de Supabase,
--  no puede leer ni escribir `boxing_gym` (además, RLS está activado sin políticas).
--
--  En Supabase hosted: Project Settings > API > "Exposed schemas" => agregar `boxing_gym`.
-- =============================================================================

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema boxing_gym to service_role;
    grant all on all tables    in schema boxing_gym to service_role;
    grant all on all sequences in schema boxing_gym to service_role;
    grant execute on all functions in schema boxing_gym to service_role;
    alter default privileges in schema boxing_gym grant all on tables    to service_role;
    alter default privileges in schema boxing_gym grant all on sequences to service_role;
    alter default privileges in schema boxing_gym grant execute on functions to service_role;
  end if;

  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on schema boxing_gym from anon;
    revoke all on all tables    in schema boxing_gym from anon;
    revoke all on all functions in schema boxing_gym from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on schema boxing_gym from authenticated;
    revoke all on all tables    in schema boxing_gym from authenticated;
    revoke all on all functions in schema boxing_gym from authenticated;
  end if;
end $$;

-- Las funciones por defecto son ejecutables por PUBLIC: se restringe.
revoke execute on all functions in schema boxing_gym from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on all functions in schema boxing_gym to service_role;
  end if;
end $$;

-- Refresca el caché de esquema de PostgREST
notify pgrst, 'reload schema';
