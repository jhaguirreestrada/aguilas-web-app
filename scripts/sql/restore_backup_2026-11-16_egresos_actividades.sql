-- =============================================================================
--  Restauración OPCIONAL (egresos y actividades) desde «aguilas_respaldo_2026-11-16_2309.json» (sistema HTML anterior)
--  Esquema: boxing_gym · ejecutar en UNA transacción (begin/commit incluidos).
--  IDs: uuid v5 determinístico a partir del id antiguo (re-ejecutable, mismos uuid).
--  Auditoría por fila desactivada durante la carga; se registra una sola entrada IMPORT.
-- =============================================================================
begin;
select set_config('app.audit_disabled','on',true);
delete from boxing_gym.expenses;
delete from boxing_gym.activities;

insert into boxing_gym.expenses (id, year, month, category, amount, detail, created_at) values
  ('c45d2fb8-dd4d-53bc-b957-0f141726989a', 2026, 11, 'Productos', 496152, 'Compras de stock (automático)', '2026-11-06T20:27:41.881Z'::timestamptz);

insert into boxing_gym.activities (id, name, priority, status, start_date, end_date, notes, closed_on, created_at) values
  ('2a76a060-9c1f-508f-84e2-d3c050d277bb', 'Cambiar piso Ring', 'critical', 'pending', '2026-11-04', '2026-12-01', '', null, '2026-11-04T21:00:40.330Z'::timestamptz),
  ('298dac77-aaca-5b8a-a2f2-7935fee5db37', 'MOver contenedor a la pared', 'high', 'pending', '2026-11-04', '2026-11-30', '', null, '2026-11-04T21:01:23.349Z'::timestamptz),
  ('a8e3c02a-6e55-578e-8776-8828ae099b77', 'Terminar de pintar el piso', 'medium', 'pending', '2026-11-04', '2026-11-30', '', null, '2026-11-04T21:01:46.750Z'::timestamptz),
  ('b456065b-90db-5c88-82f9-afaf0e22de21', 'Poner un reloj por el estante de ventas', 'low', 'pending', '2026-11-04', '2026-11-30', '', null, '2026-11-04T21:02:22.218Z'::timestamptz),
  ('88d6383e-2be3-587a-b9b7-8348ac04e0b1', 'Arreglar jardin de la entrada', 'medium', 'pending', '2026-11-04', '2026-11-30', '', null, '2026-11-04T21:02:51.521Z'::timestamptz),
  ('f23d8a97-2046-5424-843c-c33eafd26574', 'Poner mas sacos y perla loca', 'high', 'pending', '2026-11-04', '2026-11-30', '', null, '2026-11-04T21:03:21.990Z'::timestamptz);

commit;
