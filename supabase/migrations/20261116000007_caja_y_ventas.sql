-- =============================================================================
--  Migración 7 — «Caja y Ventas» (v1.0.1)
--
--  * Ventas "por cobrar": nuevo estado `pending` (el stock se descuenta al registrar la venta
--    y se devuelve si se anula, igual que una venta pagada).
--  * `sales.paid_on`: fecha en que se cobró la venta. Es la que usa el cierre de caja y los paneles.
--  * `register_sale` recibe `p_pending`; `collect_sale` cobra una venta pendiente.
--
--  Es idempotente: se puede ejecutar más de una vez.
-- =============================================================================

-- 1) Columna de fecha de cobro ------------------------------------------------
alter table boxing_gym.sales add column if not exists paid_on date;

update boxing_gym.sales set paid_on = sold_on where status = 'completed' and paid_on is null;

create index if not exists sales_paid_on_ix on boxing_gym.sales (paid_on);

-- 2) Nuevo estado `pending` ---------------------------------------------------
alter table boxing_gym.sales drop constraint if exists sales_status_check;
alter table boxing_gym.sales
  add constraint sales_status_check check (status in ('completed', 'pending', 'voided'));

-- 3) `paid_on` siempre coherente (también al importar respaldos antiguos) -----
create or replace function boxing_gym.sales_set_paid_on()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'completed' and new.paid_on is null then
    new.paid_on := new.sold_on;
  elsif new.status = 'pending' then
    new.paid_on := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sales_paid_on on boxing_gym.sales;
create trigger trg_sales_paid_on
  before insert or update on boxing_gym.sales
  for each row execute function boxing_gym.sales_set_paid_on();

-- 4) register_sale con opción "dejar por cobrar" ------------------------------
drop function if exists boxing_gym.register_sale(jsonb, text, uuid, text, date, time);

create or replace function boxing_gym.register_sale(
  p_items jsonb, p_payment_method text, p_student_id uuid,
  p_notes text, p_sold_on date, p_sold_time time,
  p_pending boolean default false
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

  if not coalesce(p_pending, false) and coalesce(btrim(p_payment_method), '') = '' then
    raise exception 'Selecciona el tipo de pago';
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
                     student_id, student_name, notes, status, paid_on)
  values (v_sale_id, v_number, p_sold_on, coalesce(p_sold_time, localtime(0)), v_total, v_cost,
          case when coalesce(p_pending, false) then '' else p_payment_method end,
          p_student_id, v_student_name, coalesce(p_notes, ''),
          case when coalesce(p_pending, false) then 'pending' else 'completed' end,
          case when coalesce(p_pending, false) then null else p_sold_on end);

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

-- 5) Cobrar una venta que quedó por cobrar ------------------------------------
create or replace function boxing_gym.collect_sale(p_sale_id uuid, p_payment_method text, p_on date)
returns jsonb
language plpgsql
set search_path = boxing_gym, extensions, public
as $$
declare
  v_sale sales%rowtype;
begin
  if coalesce(btrim(p_payment_method), '') = '' then raise exception 'Selecciona el tipo de pago'; end if;

  select * into v_sale from sales where id = p_sale_id for update;
  if not found then raise exception 'Venta no encontrada'; end if;
  if v_sale.status <> 'pending' then raise exception 'La venta N° % no está por cobrar', v_sale.sale_number; end if;

  update sales set status = 'completed', payment_method = p_payment_method, paid_on = p_on
  where id = p_sale_id;
  return (select to_jsonb(s) from sales s where s.id = p_sale_id);
end;
$$;

-- 6) Permisos (igual que la migración 4) --------------------------------------
revoke execute on function boxing_gym.register_sale(jsonb, text, uuid, text, date, time, boolean) from public;
revoke execute on function boxing_gym.collect_sale(uuid, text, date) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function boxing_gym.register_sale(jsonb, text, uuid, text, date, time, boolean) to service_role;
    grant execute on function boxing_gym.collect_sale(uuid, text, date) to service_role;
  end if;
end $$;

notify pgrst, 'reload schema';
