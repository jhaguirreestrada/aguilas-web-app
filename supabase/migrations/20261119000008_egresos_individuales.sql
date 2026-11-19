-- =============================================================================
--  Egresos individuales (como en Vivet): un registro por gasto con fecha,
--  categoría, descripción (detail), medio de pago y proveedor.
--  Los egresos mensuales existentes se conservan: fecha = día 1 del mes.
--  year/month se derivan de expense_date (trigger), así dashboard y respaldos siguen funcionando.
-- =============================================================================
begin;

alter table boxing_gym.expenses
  add column if not exists expense_date   date,
  add column if not exists payment_method text not null default '',
  add column if not exists supplier       text not null default '';

update boxing_gym.expenses set expense_date = make_date(year, month, 1) where expense_date is null;
alter table boxing_gym.expenses alter column expense_date set not null;

alter table boxing_gym.expenses drop constraint if exists expenses_period_category_uq;
create index if not exists expenses_period_idx on boxing_gym.expenses (year, month);
create index if not exists expenses_date_idx on boxing_gym.expenses (expense_date desc);

create or replace function boxing_gym._expenses_fill() returns trigger
language plpgsql
set search_path = boxing_gym, extensions, public
as $$
begin
  if new.expense_date is null then new.expense_date := make_date(new.year, new.month, 1); end if;
  new.year  := extract(year  from new.expense_date)::smallint;
  new.month := extract(month from new.expense_date)::smallint;
  return new;
end;
$$;

drop trigger if exists expenses_fill on boxing_gym.expenses;
create trigger expenses_fill before insert or update on boxing_gym.expenses
  for each row execute function boxing_gym._expenses_fill();

-- Ya no se guarda "un mes completo"
drop function if exists boxing_gym.save_expense_month(integer, integer, jsonb);

-- Ingreso de stock con compra: registra un egreso "Productos" por cada compra
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
    insert into expenses (year, month, expense_date, category, amount, detail)
    values (extract(year from p_on)::smallint, extract(month from p_on)::smallint, p_on, 'Productos', v_total,
            'Compra ' || p_quantity || ' × ' || v_prod.name);
  end if;

  return (select to_jsonb(p) from products p where p.id = p_product_id);
end;
$$;

commit;
