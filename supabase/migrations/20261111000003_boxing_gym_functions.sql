-- =============================================================================
--  Migración 3/5 — Funciones transaccionales (RPC).
--
--  Operaciones que tocan varias tablas y deben ser atómicas (stock, ventas, egresos,
--  configuración, respaldo). Viven en la base porque supabase-js no tiene transacciones
--  multi-sentencia; el servidor las invoca con `supabase.rpc(...)` y, al migrar a Nest.js,
--  con `SELECT boxing_gym.<fn>(...)` — el contrato no cambia.
--
--  Los errores de negocio se lanzan con SQLSTATE 'P0001' y mensaje en español: la capa de
--  servicios los traduce a `AppError` (HTTP 400) sin filtrar detalles internos.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Valores iniciales de configuración (hoja "Parámetros" del Excel original)
-- ---------------------------------------------------------------------------
create or replace function boxing_gym.seed_default_settings()
returns void
language plpgsql
set search_path = boxing_gym, extensions, public
as $$
begin
  insert into gym_settings (id, gym_name, warning_days, whatsapp_msg_overdue, whatsapp_msg_due_soon, whatsapp_msg_current)
  values (
    1, 'Águilas Boxeo Hualpén', 5,
    'Hola {nombre}, te escribimos de {gimnasio}. Tu mensualidad venció el {vencimiento} ({retraso} día(s) de retraso). ¿Podemos ayudarte a regularizar tu pago? ¡Te esperamos en el gimnasio!',
    'Hola {nombre}, te escribimos de {gimnasio}. Tu mensualidad vence el {vencimiento} (en {dias} día(s)). ¡Te recordamos renovar para seguir entrenando sin interrupciones!',
    'Hola {nombre}, te saludamos de {gimnasio}. '
  )
  on conflict (id) do nothing;

  insert into payment_methods (name, sort_order) values
    ('Efectivo', 1), ('Tarjeta Débito', 2), ('Tarjeta Crédito', 3), ('Transferencia', 4), ('Cheque', 5)
  on conflict (name) do nothing;

  insert into plans (name, unit, quantity, amount, sort_order) values
    ('Plan Adulto', 'months', 1, 39990, 1),
    ('Plan Estudiante', 'months', 1, 34990, 2),
    ('Plan Competitivo', 'months', 1, 30000, 3),
    ('Plan 2x1', 'months', 1, 19995, 4),
    ('Plan Diario Básico', 'days', 1, 5000, 5),
    ('Plan Personalizado Diario', 'days', 1, 8000, 6)
  on conflict (name) do nothing;

  insert into student_statuses (name, is_system, sort_order) values
    ('Activo', true, 1), ('De baja', true, 2), ('Inactivo', true, 3), ('Congelado', false, 4)
  on conflict (name) do nothing;

  insert into product_categories (name, sort_order) values
    ('Boxeo', 1), ('Bebidas', 2), ('Snacks', 3), ('Otros', 4)
  on conflict (name) do nothing;

  insert into expense_categories (name, sort_order) values
    ('Arriendo', 1), ('Luz', 2), ('Agua', 3), ('Internet', 4), ('Sueldos', 5),
    ('Aseo', 6), ('Reparaciones', 7), ('Gas', 8), ('Productos', 9), ('Varios', 10)
  on conflict (name) do nothing;

  insert into weight_categories (sex, name, min_kg, max_kg, sort_order) values
    ('F', 'Mínimo', 0, 48, 1), ('F', 'Minimosca', 48.01, 50, 2), ('F', 'Mosca', 50.01, 52, 3),
    ('F', 'Gallo', 52.01, 54, 4), ('F', 'Pluma', 54.01, 57, 5), ('F', 'Ligero', 57.01, 60, 6),
    ('F', 'Superligero', 60.01, 63, 7), ('F', 'Wélter', 63.01, 66, 8), ('F', 'Superwélter', 66.01, 70, 9),
    ('F', 'Medio', 70.01, 75, 10), ('F', 'Pesado', 75.01, 81, 11), ('F', 'Superpesado', 81.01, 999, 12),
    ('M', 'Mínimo', 0, 48, 1), ('M', 'Minimosca', 48.01, 51, 2), ('M', 'Mosca', 51.01, 54, 3),
    ('M', 'Pluma', 54.01, 57, 4), ('M', 'Ligero', 57.01, 60, 5), ('M', 'Superligero', 60.01, 63.5, 6),
    ('M', 'Wélter', 63.51, 67, 7), ('M', 'Superwélter', 67.01, 71, 8), ('M', 'Medio', 71.01, 75, 9),
    ('M', 'Semi-pesado', 75.01, 80, 10), ('M', 'Crucero', 80.01, 86, 11), ('M', 'Pesado', 86.01, 92, 12),
    ('M', 'Superpesado', 92.01, 999, 13)
  on conflict (sex, name) do nothing;
end;
$$;

-- ---------------------------------------------------------------------------
-- Configuración: reemplazo atómico por diferencias (no genera ruido de auditoría)
-- ---------------------------------------------------------------------------
create or replace function boxing_gym._sync_name_list(p_table text, p_names jsonb)
returns void
language plpgsql
set search_path = boxing_gym, extensions, public
as $$
begin
  execute format(
    'delete from boxing_gym.%1$I where name <> all (select jsonb_array_elements_text($1))', p_table)
    using p_names;
  execute format(
    'insert into boxing_gym.%1$I (name, sort_order)
       select t.value, t.ord::int from jsonb_array_elements_text($1) with ordinality as t(value, ord)
     on conflict (name) do update set sort_order = excluded.sort_order
       where boxing_gym.%1$I.sort_order is distinct from excluded.sort_order', p_table)
    using p_names;
end;
$$;

create or replace function boxing_gym.replace_settings(p_data jsonb)
returns void
language plpgsql
set search_path = boxing_gym, extensions, public
as $$
declare
  v_sex text;
  v_list jsonb;
begin
  insert into gym_settings (id, gym_name, warning_days, whatsapp_msg_overdue, whatsapp_msg_due_soon, whatsapp_msg_current)
  values (
    1, p_data ->> 'gym_name', (p_data ->> 'warning_days')::int,
    p_data #>> '{whatsapp,overdue}', p_data #>> '{whatsapp,due_soon}', p_data #>> '{whatsapp,current}'
  )
  on conflict (id) do update set
    gym_name = excluded.gym_name,
    warning_days = excluded.warning_days,
    whatsapp_msg_overdue = excluded.whatsapp_msg_overdue,
    whatsapp_msg_due_soon = excluded.whatsapp_msg_due_soon,
    whatsapp_msg_current = excluded.whatsapp_msg_current
  where (gym_settings.gym_name, gym_settings.warning_days, gym_settings.whatsapp_msg_overdue,
         gym_settings.whatsapp_msg_due_soon, gym_settings.whatsapp_msg_current)
        is distinct from
        (excluded.gym_name, excluded.warning_days, excluded.whatsapp_msg_overdue,
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

-- ---------------------------------------------------------------------------
-- Inventario
-- ---------------------------------------------------------------------------

-- Ajuste de stock: in (entrada) | out (salida) | adjustment (cantidad exacta)
create or replace function boxing_gym.adjust_stock(
  p_product_id uuid, p_type text, p_quantity integer,
  p_reason text, p_document text, p_on date
) returns jsonb
language plpgsql
set search_path = boxing_gym, extensions, public
as $$
declare
  v_prod products%rowtype;
  v_new integer;
  v_delta integer;
begin
  select * into v_prod from products where id = p_product_id for update;
  if not found then raise exception 'Producto no encontrado'; end if;
  if p_quantity is null or p_quantity < 0 then raise exception 'Ingresa una cantidad válida'; end if;
  if p_type <> 'adjustment' and p_quantity = 0 then raise exception 'Ingresa una cantidad válida'; end if;

  if p_type = 'in' then v_delta := p_quantity; v_new := v_prod.stock + p_quantity;
  elsif p_type = 'out' then v_delta := -p_quantity; v_new := v_prod.stock - p_quantity;
  elsif p_type = 'adjustment' then v_new := p_quantity; v_delta := v_new - v_prod.stock;
  else raise exception 'Tipo de movimiento inválido';
  end if;
  if v_new < 0 then raise exception 'El stock no puede quedar negativo'; end if;

  update products set stock = v_new where id = p_product_id;
  insert into inventory_movements (product_id, moved_on, movement_type, quantity, resulting_stock, document, reason)
  values (p_product_id, p_on, p_type, v_delta, v_new, coalesce(p_document, ''), coalesce(p_reason, ''));

  return (select to_jsonb(p) from products p where p.id = p_product_id);
end;
$$;

-- Ingreso de stock con compra: actualiza costo y suma a los egresos "Productos" del mes
create or replace function boxing_gym.receive_stock(
  p_product_id uuid, p_quantity integer, p_unit_cost bigint,
  p_document text, p_notes text, p_movement_type text, p_total bigint, p_on date
) returns jsonb
language plpgsql
set search_path = boxing_gym, extensions, public
as $$
declare
  v_prod products%rowtype;
  v_new integer;
  v_total bigint;
begin
  select * into v_prod from products where id = p_product_id for update;
  if not found then raise exception 'Producto no encontrado'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'Ingresa una cantidad mayor a 0'; end if;
  if p_unit_cost is null or p_unit_cost < 0 then raise exception 'Ingresa un precio de compra válido'; end if;
  if p_movement_type not in ('initial_stock', 'purchase', 'in') then raise exception 'Tipo de movimiento inválido'; end if;

  v_new := v_prod.stock + p_quantity;
  update products set stock = v_new, cost = p_unit_cost where id = p_product_id;
  insert into inventory_movements
    (product_id, moved_on, movement_type, quantity, resulting_stock, purchase_price, document, reason)
  values
    (p_product_id, p_on, p_movement_type, p_quantity, v_new, p_unit_cost, coalesce(p_document, ''), coalesce(p_notes, ''));

  v_total := coalesce(p_total, p_quantity * p_unit_cost);
  if v_total > 0 then
    insert into expenses (year, month, category, amount, detail)
    values (extract(year from p_on)::smallint, extract(month from p_on)::smallint, 'Productos', v_total,
            'Compras de stock (automático)')
    on conflict (year, month, category) do update set amount = expenses.amount + excluded.amount;
  end if;

  return (select to_jsonb(p) from products p where p.id = p_product_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Ventas
-- ---------------------------------------------------------------------------
create or replace function boxing_gym.register_sale(
  p_items jsonb, p_payment_method text, p_student_id uuid,
  p_notes text, p_sold_on date, p_sold_time time
) returns jsonb
language plpgsql
set search_path = boxing_gym, extensions, public
as $$
declare
  v_it jsonb;
  v_prod products%rowtype;
  v_qty integer;
  v_sub numeric;
  v_total bigint := 0;
  v_cost bigint := 0;
  v_lines jsonb := '[]'::jsonb;
  v_stock_left jsonb := '{}'::jsonb;     -- stock remanente por producto (mismo producto repetido)
  v_left integer;
  v_student_name text := '';
  v_sale_id uuid := gen_random_uuid();
  v_number bigint;
  v_line jsonb;
  v_new_stock integer;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Agrega al menos un producto';
  end if;

  if p_student_id is not null then
    select btrim(first_names || ' ' || last_names) into v_student_name from students where id = p_student_id;
    if not found then raise exception 'Alumno no encontrado'; end if;
  end if;

  -- Pasada 1: validar y calcular (bloquea las filas de producto)
  for v_it in select * from jsonb_array_elements(p_items) loop
    select * into v_prod from products where id = (v_it ->> 'product_id')::uuid for update;
    if not found then raise exception 'Producto no encontrado'; end if;
    v_qty := (v_it ->> 'quantity')::int;
    if v_qty is null or v_qty < 1 then raise exception 'La cantidad debe ser al menos 1'; end if;

    v_left := coalesce((v_stock_left ->> v_prod.id::text)::int, v_prod.stock);
    if v_qty > v_left then
      raise exception 'Stock insuficiente de "%" (disponible: %)', v_prod.name, v_left;
    end if;
    v_stock_left := v_stock_left || jsonb_build_object(v_prod.id::text, v_left - v_qty);

    v_sub := coalesce(nullif(v_it ->> 'amount', '')::numeric, v_prod.price * v_qty);
    if v_sub < 0 then raise exception 'Monto inválido para "%"', v_prod.name; end if;

    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'product_id', v_prod.id, 'product_name', v_prod.name, 'quantity', v_qty,
      'unit_price', round(v_sub / v_qty, 2), 'unit_cost', v_prod.cost, 'subtotal', round(v_sub)));
    v_total := v_total + round(v_sub)::bigint;
    v_cost  := v_cost + v_prod.cost * v_qty;
  end loop;

  v_number := nextval(pg_get_serial_sequence('boxing_gym.sales', 'sale_number'));
  insert into sales (id, sale_number, sold_on, sold_time, total, cost_total, payment_method,
                     student_id, student_name, notes, status)
  values (v_sale_id, v_number, p_sold_on, coalesce(p_sold_time, localtime(0)), v_total, v_cost,
          p_payment_method, p_student_id, v_student_name, coalesce(p_notes, ''), 'completed');

  -- Pasada 2: ítems, stock y movimientos
  for v_line in select * from jsonb_array_elements(v_lines) loop
    insert into sale_items (sale_id, product_id, product_name, quantity, unit_price, unit_cost, subtotal)
    values (v_sale_id, (v_line ->> 'product_id')::uuid, v_line ->> 'product_name', (v_line ->> 'quantity')::int,
            (v_line ->> 'unit_price')::numeric, (v_line ->> 'unit_cost')::numeric, (v_line ->> 'subtotal')::bigint);

    update products set stock = stock - (v_line ->> 'quantity')::int
    where id = (v_line ->> 'product_id')::uuid returning stock into v_new_stock;

    insert into inventory_movements (product_id, moved_on, movement_type, quantity, resulting_stock, reason)
    values ((v_line ->> 'product_id')::uuid, p_sold_on, 'sale', -(v_line ->> 'quantity')::int, v_new_stock,
            'Venta N° ' || v_number);
  end loop;

  return (select to_jsonb(s) from sales s where s.id = v_sale_id);
end;
$$;

create or replace function boxing_gym.void_sale(p_sale_id uuid, p_on date)
returns jsonb
language plpgsql
set search_path = boxing_gym, extensions, public
as $$
declare
  v_sale sales%rowtype;
  v_item record;
  v_new_stock integer;
begin
  select * into v_sale from sales where id = p_sale_id for update;
  if not found then raise exception 'Venta no encontrada'; end if;
  if v_sale.status = 'voided' then
    return to_jsonb(v_sale);
  end if;

  for v_item in select * from sale_items where sale_id = p_sale_id loop
    continue when v_item.product_id is null;
    update products set stock = stock + v_item.quantity
    where id = v_item.product_id returning stock into v_new_stock;
    continue when v_new_stock is null;
    insert into inventory_movements (product_id, moved_on, movement_type, quantity, resulting_stock, reason)
    values (v_item.product_id, p_on, 'sale_void', v_item.quantity, v_new_stock,
            'Anulación venta N° ' || v_sale.sale_number);
  end loop;

  update sales set status = 'voided', voided_on = p_on where id = p_sale_id;
  return (select to_jsonb(s) from sales s where s.id = p_sale_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Egresos: guarda un mes completo (reemplazo por diferencias)
-- ---------------------------------------------------------------------------
create or replace function boxing_gym.save_expense_month(p_year integer, p_month integer, p_items jsonb)
returns void
language plpgsql
set search_path = boxing_gym, extensions, public
as $$
begin
  delete from expenses
  where year = p_year and month = p_month
    and category <> all (select x ->> 'category' from jsonb_array_elements(p_items) x);

  insert into expenses (year, month, category, amount, detail)
  select p_year, p_month, x ->> 'category', (x ->> 'amount')::bigint, coalesce(x ->> 'detail', '')
  from jsonb_array_elements(p_items) x
  on conflict (year, month, category) do update
    set amount = excluded.amount, detail = excluded.detail
  where (expenses.amount, expenses.detail) is distinct from (excluded.amount, excluded.detail);
end;
$$;

-- ---------------------------------------------------------------------------
-- Respaldo: importar (reemplazo por colección, atómico) y restablecer
--   p_payload: { settings?, students?, student_weight_history?, payments?, products?,
--                inventory_movements?, sales?, sale_items?, expenses?, activities? }
--   Cada colección es un arreglo de filas con TODAS las columnas de la tabla.
-- ---------------------------------------------------------------------------
create or replace function boxing_gym.import_backup(p_payload jsonb)
returns jsonb
language plpgsql
set search_path = boxing_gym, extensions, public
as $$
declare
  v_counts jsonb := '{}'::jsonb;
  v_n integer;
  v_actor record;
begin
  perform set_config('app.audit_disabled', 'on', true);

  -- 1) borrar (los hijos caen por cascade / set null)
  if p_payload ? 'sales'               then delete from sales; end if;
  if p_payload ? 'inventory_movements' then delete from inventory_movements; end if;
  if p_payload ? 'payments'            then delete from payments; end if;
  if p_payload ? 'products'            then delete from products; end if;
  if p_payload ? 'students'            then delete from students; end if;
  if p_payload ? 'expenses'            then delete from expenses; end if;
  if p_payload ? 'activities'          then delete from activities; end if;

  -- 2) configuración
  if p_payload ? 'settings' then
    perform boxing_gym.replace_settings(p_payload -> 'settings');
    v_counts := v_counts || jsonb_build_object('settings', 1);
  end if;

  -- 3) insertar en orden de dependencias
  if p_payload ? 'students' then
    insert into students select * from jsonb_populate_recordset(null::students, p_payload -> 'students');
    get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('students', v_n);
  end if;
  if p_payload ? 'student_weight_history' then
    insert into student_weight_history select * from jsonb_populate_recordset(null::student_weight_history, p_payload -> 'student_weight_history');
  end if;
  if p_payload ? 'payments' then
    insert into payments select * from jsonb_populate_recordset(null::payments, p_payload -> 'payments');
    get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('payments', v_n);
  end if;
  if p_payload ? 'products' then
    insert into products select * from jsonb_populate_recordset(null::products, p_payload -> 'products');
    get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('products', v_n);
  end if;
  if p_payload ? 'inventory_movements' then
    insert into inventory_movements select * from jsonb_populate_recordset(null::inventory_movements, p_payload -> 'inventory_movements');
    get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('inventory_movements', v_n);
  end if;
  if p_payload ? 'sales' then
    insert into sales select * from jsonb_populate_recordset(null::sales, p_payload -> 'sales');
    get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('sales', v_n);
    perform setval(pg_get_serial_sequence('boxing_gym.sales', 'sale_number'),
                   greatest(coalesce((select max(sale_number) from sales), 0), 1),
                   (select count(*) > 0 from sales));
  end if;
  if p_payload ? 'sale_items' then
    insert into sale_items select * from jsonb_populate_recordset(null::sale_items, p_payload -> 'sale_items');
  end if;
  if p_payload ? 'expenses' then
    insert into expenses select * from jsonb_populate_recordset(null::expenses, p_payload -> 'expenses');
    get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('expenses', v_n);
  end if;
  if p_payload ? 'activities' then
    insert into activities select * from jsonb_populate_recordset(null::activities, p_payload -> 'activities');
    get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('activities', v_n);
  end if;

  -- 4) una sola entrada de auditoría con el resumen
  select * into v_actor from boxing_gym.current_actor();
  insert into audit_log (actor_user_id, actor_username, action, entity, description, changes_after)
  values (v_actor.actor_id, v_actor.actor_username, 'IMPORT', 'backup', 'Importación de respaldo', v_counts);

  return v_counts;
end;
$$;

create or replace function boxing_gym.reset_data()
returns void
language plpgsql
set search_path = boxing_gym, extensions, public
as $$
declare
  v_actor record;
begin
  perform set_config('app.audit_disabled', 'on', true);

  delete from sales;
  delete from inventory_movements;
  delete from payments;
  delete from products;
  delete from students;
  delete from expenses;
  delete from activities;
  delete from gym_settings;
  delete from payment_methods;
  delete from plans;
  delete from student_statuses;
  delete from product_categories;
  delete from expense_categories;
  delete from weight_categories;
  perform boxing_gym.seed_default_settings();
  perform setval(pg_get_serial_sequence('boxing_gym.sales', 'sale_number'), 1, false);

  select * into v_actor from boxing_gym.current_actor();
  insert into audit_log (actor_user_id, actor_username, action, entity, description)
  values (v_actor.actor_id, v_actor.actor_username, 'RESET', 'backup', 'Todos los datos fueron borrados y la configuración restablecida');
end;
$$;
