-- =============================================================================
--  Migración 2/5 — Auditoría: función de actor, disparadores y protección del log.
--
--  ¿Quién es el "actor"? El servidor (Next.js/Nest.js) autentica al usuario y le
--  indica a la base quién es de dos formas equivalentes:
--    1) PostgREST/Supabase: cabeceras `x-actor-id` / `x-actor-username` en la petición
--       (llegan al trigger por `request.headers`).
--    2) Conexión SQL directa (Nest + pg/TypeORM/Prisma):
--         select set_config('app.actor_id', '<uuid>', true),
--                set_config('app.actor_username', 'jperez', true);   -- dentro de la transacción
--  Si no hay ninguno, el actor es `system` (migraciones, seeds, jobs).
-- =============================================================================

create or replace function boxing_gym.current_actor(out actor_id uuid, out actor_username text)
language plpgsql
stable
as $$
declare
  v_headers jsonb;
begin
  actor_username := nullif(current_setting('app.actor_username', true), '');
  if actor_username is not null then
    begin
      actor_id := nullif(current_setting('app.actor_id', true), '')::uuid;
    exception when others then
      actor_id := null;
    end;
    return;
  end if;

  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    v_headers := null;
  end;

  if v_headers is not null then
    actor_username := nullif(v_headers ->> 'x-actor-username', '');
    begin
      actor_id := nullif(v_headers ->> 'x-actor-id', '')::uuid;
    exception when others then
      actor_id := null;
    end;
  end if;

  actor_username := coalesce(actor_username, 'system');
end;
$$;

-- Etiqueta legible del registro afectado (para la columna "descripción")
create or replace function boxing_gym.audit_label(p_row jsonb)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(p_row ->> 'username', ''),
    nullif(btrim(coalesce(p_row ->> 'first_names', '') || ' ' || coalesce(p_row ->> 'last_names', '')), ''),
    nullif(p_row ->> 'plan_name', ''),
    nullif(p_row ->> 'name', ''),
    nullif(p_row ->> 'gym_name', ''),
    case when p_row ? 'sale_number' then 'Venta N° ' || (p_row ->> 'sale_number') end,
    case when p_row ? 'category' and p_row ? 'year'
         then (p_row ->> 'category') || ' ' || (p_row ->> 'month') || '/' || (p_row ->> 'year') end
  );
$$;

-- Disparador genérico: registra CREATE / UPDATE / DELETE con los valores antes/después.
--  · UPDATE guarda solo las columnas que cambiaron (más legible y compacto).
--  · `password_hash` nunca se guarda: se enmascara.
--  · `updated_at` y `users.last_login_at` no cuentan como cambio.
--  · Un UPDATE sin cambios reales no genera registro.
--  · Las cargas masivas (importar respaldo / restablecer) desactivan el log por fila con
--    `set_config('app.audit_disabled', 'on', true)` y registran una sola entrada resumen.
create or replace function boxing_gym.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = boxing_gym, extensions, public
as $$
declare
  v_old     jsonb;
  v_new     jsonb;
  v_before  jsonb;
  v_after   jsonb;
  v_action  text;
  v_row     jsonb;
  v_key     text;
  v_actor_id uuid;
  v_actor_name text;
  v_ignored text[] := array['updated_at', 'last_login_at'];
begin
  if coalesce(current_setting('app.audit_disabled', true), '') = 'on' then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' then
    v_action := 'CREATE';
    v_new    := to_jsonb(new) - 'password_hash';
    v_after  := v_new;
    v_row    := to_jsonb(new);
  elsif tg_op = 'DELETE' then
    v_action := 'DELETE';
    v_old    := to_jsonb(old) - 'password_hash';
    v_before := v_old;
    v_row    := to_jsonb(old);
  else
    v_action := 'UPDATE';
    v_old    := to_jsonb(old);
    v_new    := to_jsonb(new);
    v_before := '{}'::jsonb;
    v_after  := '{}'::jsonb;
    for v_key in select key from jsonb_each(v_new) loop
      continue when v_key = any (v_ignored);
      continue when (v_new -> v_key) is not distinct from (v_old -> v_key);
      if v_key = 'password_hash' then
        v_before := v_before || jsonb_build_object(v_key, '[oculta]');
        v_after  := v_after  || jsonb_build_object(v_key, '[modificada]');
      else
        v_before := v_before || jsonb_build_object(v_key, v_old -> v_key);
        v_after  := v_after  || jsonb_build_object(v_key, v_new -> v_key);
      end if;
    end loop;
    if v_after = '{}'::jsonb then
      return new;            -- nada relevante cambió
    end if;
    v_row := v_new;
  end if;

  select a.actor_id, a.actor_username into v_actor_id, v_actor_name from boxing_gym.current_actor() a;

  insert into boxing_gym.audit_log
    (actor_user_id, actor_username, action, entity, record_id, description, changes_before, changes_after)
  values
    (v_actor_id, v_actor_name, v_action, tg_table_name, v_row ->> 'id',
     tg_table_name || coalesce(' · ' || boxing_gym.audit_label(v_row), ''),
     v_before, v_after);

  return coalesce(new, old);
end;
$$;

-- Tablas auditadas. Quedan fuera las tablas derivadas/append-only (inventory_movements,
-- sale_items, student_weight_history): su efecto ya queda registrado en la tabla padre.
do $$
declare t text;
begin
  foreach t in array array[
    'users', 'gym_settings', 'payment_methods', 'plans', 'student_statuses',
    'product_categories', 'expense_categories', 'weight_categories',
    'students', 'payments', 'products', 'sales', 'expenses', 'activities'
  ] loop
    execute format(
      'create trigger trg_%1$s_audit after insert or update or delete on boxing_gym.%1$I
         for each row execute function boxing_gym.audit_row_change()', t);
  end loop;
end $$;

-- El log es inmutable: no se puede modificar ni borrar (ni siquiera con service_role).
create or replace function boxing_gym.audit_log_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_log es de solo lectura (no se permite % )', tg_op
    using errcode = 'P0001';
end;
$$;

create trigger trg_audit_log_no_update_delete
  before update or delete on boxing_gym.audit_log
  for each row execute function boxing_gym.audit_log_immutable();

create trigger trg_audit_log_no_truncate
  before truncate on boxing_gym.audit_log
  for each statement execute function boxing_gym.audit_log_immutable();
