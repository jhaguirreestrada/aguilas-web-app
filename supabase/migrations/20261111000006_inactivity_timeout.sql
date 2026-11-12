-- =============================================================================
--  Migración 6 — Tiempo de inactividad configurable (minutos) para cerrar la sesión.
--  Por defecto 3 minutos. Se administra en Configuración > General y WhatsApp.
-- =============================================================================

alter table boxing_gym.gym_settings
  add column if not exists inactivity_minutes integer not null default 3
  check (inactivity_minutes between 1 and 480);

create or replace function boxing_gym.replace_settings(p_data jsonb)
returns void
language plpgsql
set search_path = boxing_gym, extensions, public
as $$
declare
  v_sex text;
  v_list jsonb;
begin
  insert into gym_settings (id, gym_name, warning_days, inactivity_minutes, whatsapp_msg_overdue, whatsapp_msg_due_soon, whatsapp_msg_current)
  values (
    1, p_data ->> 'gym_name', (p_data ->> 'warning_days')::int, coalesce((p_data ->> 'inactivity_minutes')::int, 3),
    p_data #>> '{whatsapp,overdue}', p_data #>> '{whatsapp,due_soon}', p_data #>> '{whatsapp,current}'
  )
  on conflict (id) do update set
    gym_name = excluded.gym_name,
    warning_days = excluded.warning_days,
    inactivity_minutes = excluded.inactivity_minutes,
    whatsapp_msg_overdue = excluded.whatsapp_msg_overdue,
    whatsapp_msg_due_soon = excluded.whatsapp_msg_due_soon,
    whatsapp_msg_current = excluded.whatsapp_msg_current
  where (gym_settings.gym_name, gym_settings.warning_days, gym_settings.inactivity_minutes, gym_settings.whatsapp_msg_overdue,
         gym_settings.whatsapp_msg_due_soon, gym_settings.whatsapp_msg_current)
        is distinct from
        (excluded.gym_name, excluded.warning_days, excluded.inactivity_minutes, excluded.whatsapp_msg_overdue,
         excluded.whatsapp_msg_due_soon, excluded.whatsapp_msg_current);

  perform boxing_gym._sync_name_list('payment_methods', p_data -> 'payment_methods');
  perform boxing_gym._sync_name_list('student_statuses', p_data -> 'student_statuses');
  perform boxing_gym._sync_name_list('product_categories', p_data -> 'product_categories');
  perform boxing_gym._sync_name_list('expense_categories', p_data -> 'expense_categories');

  update student_statuses set is_system = (name in ('Activo', 'De baja', 'Inactivo'))
  where is_system is distinct from (name in ('Activo', 'De baja', 'Inactivo'));

  -- Planes
  delete from plans where name <> all (select x ->> 'name' from jsonb_array_elements(p_data -> 'plans') x);
  insert into plans (name, unit, quantity, amount, sort_order)
  select x.value ->> 'name', x.value ->> 'unit', (x.value ->> 'quantity')::int, (x.value ->> 'amount')::bigint, x.ord::int
  from jsonb_array_elements(p_data -> 'plans') with ordinality as x(value, ord)
  on conflict (name) do update set
    unit = excluded.unit, quantity = excluded.quantity, amount = excluded.amount, sort_order = excluded.sort_order
  where (plans.unit, plans.quantity, plans.amount, plans.sort_order)
        is distinct from (excluded.unit, excluded.quantity, excluded.amount, excluded.sort_order);

  -- Categorías de peso (F y M)
  foreach v_sex in array array['F', 'M'] loop
    v_list := p_data -> case v_sex when 'F' then 'weight_categories_female' else 'weight_categories_male' end;
    delete from weight_categories
    where sex = v_sex and name <> all (select x ->> 'name' from jsonb_array_elements(v_list) x);
    insert into weight_categories (sex, name, min_kg, max_kg, sort_order)
    select v_sex, x.value ->> 'name', (x.value ->> 'min_kg')::numeric, (x.value ->> 'max_kg')::numeric, x.ord::int
    from jsonb_array_elements(v_list) with ordinality as x(value, ord)
    on conflict (sex, name) do update set
      min_kg = excluded.min_kg, max_kg = excluded.max_kg, sort_order = excluded.sort_order
    where (weight_categories.min_kg, weight_categories.max_kg, weight_categories.sort_order)
          is distinct from (excluded.min_kg, excluded.max_kg, excluded.sort_order);
  end loop;
end;
$$;


grant execute on function boxing_gym.replace_settings(jsonb) to service_role;
revoke execute on function boxing_gym.replace_settings(jsonb) from public;
notify pgrst, 'reload schema';
