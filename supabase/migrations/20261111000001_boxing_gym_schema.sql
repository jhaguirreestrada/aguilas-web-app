-- =============================================================================
--  postgres · esquema `boxing_gym`
--  Migración 1/5 — Tablas, restricciones, índices y triggers de `updated_at`.
--
--  Convenciones
--   · Tablas y columnas en inglés, snake_case, claves primarias uuid.
--   · Montos en CLP => bigint (sin decimales). Precios unitarios derivados => numeric(14,2).
--   · Todo acceso se hace con la clave `service_role` desde el servidor (Next.js hoy,
--     Nest.js mañana). RLS queda activado sin políticas: anon/authenticated no ven nada.
--
--  Esta migración es compatible con Supabase (hosted y CLI) y con el Postgres local
--  de docker-compose (que crea los roles anon/authenticated/service_role en el init).
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;
create schema if not exists boxing_gym;

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------
create or replace function boxing_gym.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Usuarios del sistema (sin perfiles/roles por ahora)
-- ---------------------------------------------------------------------------
create table boxing_gym.users (
  id             uuid primary key default gen_random_uuid(),
  username       text        not null check (char_length(username) between 3 and 40),
  full_name      text        not null check (char_length(full_name) between 1 and 120),
  email          text,
  password_hash  text        not null,
  is_active      boolean     not null default true,
  last_login_at  timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index users_username_uq on boxing_gym.users (lower(username));
create unique index users_email_uq on boxing_gym.users (lower(email)) where email is not null;

-- ---------------------------------------------------------------------------
-- Configuración (opción "Configuración" del menú)
-- ---------------------------------------------------------------------------
create table boxing_gym.gym_settings (
  id                    smallint primary key default 1 check (id = 1),   -- fila única
  gym_name              text        not null default 'Águilas Boxeo Hualpén',
  warning_days          integer     not null default 5 check (warning_days between 0 and 60),
  whatsapp_msg_overdue  text        not null default '',
  whatsapp_msg_due_soon text        not null default '',
  whatsapp_msg_current  text        not null default '',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table boxing_gym.payment_methods (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null unique,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table boxing_gym.plans (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null unique,
  unit        text        not null check (unit in ('months', 'days')),
  quantity    integer     not null check (quantity >= 1),
  amount      bigint      not null check (amount >= 0),
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table boxing_gym.student_statuses (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null unique,
  is_system   boolean     not null default false,   -- Activo / De baja / Inactivo no se pueden quitar
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table boxing_gym.product_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null unique,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table boxing_gym.expense_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null unique,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table boxing_gym.weight_categories (
  id          uuid primary key default gen_random_uuid(),
  sex         text          not null check (sex in ('F', 'M')),
  name        text          not null,
  min_kg      numeric(6, 2) not null check (min_kg >= 0),
  max_kg      numeric(6, 2) not null,
  sort_order  integer       not null default 0,
  created_at  timestamptz   not null default now(),
  updated_at  timestamptz   not null default now(),
  constraint weight_categories_range_ck check (min_kg <= max_kg),
  constraint weight_categories_sex_name_uq unique (sex, name)
);

-- ---------------------------------------------------------------------------
-- Alumnos y pagos (opciones "Alumnos" y "Pagos")
-- ---------------------------------------------------------------------------
create table boxing_gym.students (
  id                 uuid primary key default gen_random_uuid(),
  first_names        text          not null,
  last_names         text          not null,
  rut                text          not null,                     -- formateado: 12.345.678-9
  birth_date         date,
  sex                text          check (sex in ('F', 'M')),    -- null = aún sin definir (datos migrados)
  phone              text          not null default '',
  email              text          not null default '',
  weight_kg          numeric(5, 2) check (weight_kg is null or weight_kg > 0),
  notes              text          not null default '',
  status             text          not null default 'Activo',    -- nombre en student_statuses
  joined_on          date,
  withdrawal_reason  text          not null default '',
  withdrawn_on       date,
  created_at         timestamptz   not null default now(),
  updated_at         timestamptz   not null default now()
);
create unique index students_rut_uq
  on boxing_gym.students ((regexp_replace(upper(rut), '[^0-9K]', '', 'g')));
create index students_status_ix on boxing_gym.students (status);

create table boxing_gym.student_weight_history (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid          not null references boxing_gym.students (id) on delete cascade,
  weight_kg    numeric(5, 2) not null check (weight_kg > 0),
  recorded_at  timestamptz   not null default now()
);
create index student_weight_history_student_ix on boxing_gym.student_weight_history (student_id, recorded_at desc);

create table boxing_gym.payments (
  id                 uuid primary key default gen_random_uuid(),
  student_id         uuid          not null references boxing_gym.students (id) on delete cascade,
  paid_on            date          not null,
  plan_name          text          not null,                      -- snapshot del plan al momento del pago
  unit               text          not null check (unit in ('months', 'days')),
  quantity           integer       not null check (quantity >= 1),
  months_equivalent  numeric(8, 3) not null,                      -- días / 30 si el plan es diario
  payment_method     text          not null,
  amount             bigint        not null check (amount >= 0),
  due_date           date          not null,
  notes              text          not null default '',
  created_at         timestamptz   not null default now(),
  updated_at         timestamptz   not null default now()
);
create index payments_student_ix on boxing_gym.payments (student_id, due_date desc);
create index payments_paid_on_ix on boxing_gym.payments (paid_on);

-- ---------------------------------------------------------------------------
-- Productos e inventario (opción "Productos")
-- ---------------------------------------------------------------------------
create table boxing_gym.products (
  id          uuid primary key default gen_random_uuid(),
  code        text        not null default '',
  name        text        not null,
  category    text        not null,
  price       bigint      not null check (price >= 0),
  cost        bigint      not null default 0 check (cost >= 0),
  stock       integer     not null default 0 check (stock >= 0),
  min_stock   integer     not null default 0 check (min_stock >= 0),
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index products_code_uq on boxing_gym.products (lower(code)) where code <> '';

create table boxing_gym.inventory_movements (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid        not null references boxing_gym.products (id) on delete cascade,
  moved_on         date        not null,
  movement_type    text        not null check (movement_type in
                     ('initial_stock', 'purchase', 'in', 'out', 'adjustment', 'sale', 'sale_void')),
  quantity         integer     not null,                          -- con signo
  resulting_stock  integer     not null,
  purchase_price   bigint,
  document         text        not null default '',
  reason           text        not null default '',
  created_at       timestamptz not null default now()
);
create index inventory_movements_product_ix on boxing_gym.inventory_movements (product_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Ventas (opción "Ventas")
-- ---------------------------------------------------------------------------
create table boxing_gym.sales (
  id              uuid primary key default gen_random_uuid(),
  sale_number     bigint generated by default as identity unique,
  sold_on         date        not null,
  sold_time       time(0)     not null default localtime(0),
  total           bigint      not null check (total >= 0),
  cost_total      bigint      not null default 0,
  payment_method  text        not null,
  student_id      uuid        references boxing_gym.students (id) on delete set null,
  student_name    text        not null default '',
  notes           text        not null default '',
  status          text        not null default 'completed' check (status in ('completed', 'voided')),
  voided_on       date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index sales_sold_on_ix on boxing_gym.sales (sold_on desc);

create table boxing_gym.sale_items (
  id            uuid primary key default gen_random_uuid(),
  sale_id       uuid          not null references boxing_gym.sales (id) on delete cascade,
  product_id    uuid          references boxing_gym.products (id) on delete set null,
  product_name  text          not null,
  quantity      integer       not null check (quantity > 0),
  unit_price    numeric(14, 2) not null,
  unit_cost     numeric(14, 2) not null default 0,
  subtotal      bigint        not null check (subtotal >= 0)
);
create index sale_items_sale_ix on boxing_gym.sale_items (sale_id);
create index sale_items_product_ix on boxing_gym.sale_items (product_id);

-- ---------------------------------------------------------------------------
-- Egresos (opción "Egresos")
-- ---------------------------------------------------------------------------
create table boxing_gym.expenses (
  id          uuid primary key default gen_random_uuid(),
  year        smallint    not null check (year between 2000 and 2200),
  month       smallint    not null check (month between 1 and 12),
  category    text        not null,
  amount      bigint      not null check (amount >= 0),
  detail      text        not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint expenses_period_category_uq unique (year, month, category)
);

-- ---------------------------------------------------------------------------
-- Planificación (opción "Planificación")
-- ---------------------------------------------------------------------------
create table boxing_gym.activities (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  priority    text        not null check (priority in ('critical', 'high', 'medium', 'low')),
  status      text        not null default 'pending' check (status in ('pending', 'in_progress', 'done', 'dropped')),
  start_date  date        not null,
  end_date    date        not null,
  notes       text        not null default '',
  closed_on   date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint activities_dates_ck check (end_date >= start_date)
);
create index activities_status_ix on boxing_gym.activities (status);

-- ---------------------------------------------------------------------------
-- Log de auditoría (opción "Usuario" > "Log de Auditoría")
-- ---------------------------------------------------------------------------
create table boxing_gym.audit_log (
  id               bigint generated always as identity primary key,
  occurred_at      timestamptz not null default now(),
  actor_user_id    uuid,                       -- sin FK: el log sobrevive al borrado del usuario
  actor_username   text        not null default 'system',
  action           text        not null,       -- CREATE | UPDATE | DELETE | LOGIN | LOGOUT | IMPORT | RESET
  entity           text        not null,       -- tabla afectada
  record_id        text,
  description      text,
  changes_before   jsonb,
  changes_after    jsonb
);
create index audit_log_occurred_ix on boxing_gym.audit_log (occurred_at desc);
create index audit_log_entity_ix on boxing_gym.audit_log (entity);
create index audit_log_action_ix on boxing_gym.audit_log (action);
create index audit_log_actor_ix on boxing_gym.audit_log (lower(actor_username));

-- ---------------------------------------------------------------------------
-- Triggers updated_at (todas las tablas con la columna)
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  for t in
    select table_name from information_schema.columns
    where table_schema = 'boxing_gym' and column_name = 'updated_at'
  loop
    execute format(
      'create trigger trg_%1$s_updated_at before update on boxing_gym.%1$I
         for each row execute function boxing_gym.set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- RLS: activado en todo, sin políticas => solo `service_role` (bypass) accede.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'boxing_gym' loop
    execute format('alter table boxing_gym.%I enable row level security', t);
  end loop;
end $$;
