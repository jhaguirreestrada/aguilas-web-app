-- Clases diarias "por cobrar" (acumulativas): el alumno toma la clase, queda registrada como pendiente y se cobra después
-- (una o varias juntas). Una fila pendiente NO es ingreso ni cuenta como último pago hasta que se cobra.
--  · pending  = true mientras la clase está por cobrar (null/false = pagada)
--  · class_on = fecha en que se tomó la clase (al cobrar, paid_on pasa a ser la fecha del cobro)
alter table boxing_gym.payments add column if not exists pending  boolean default false;
alter table boxing_gym.payments add column if not exists class_on date;

create index if not exists payments_pending_ix on boxing_gym.payments (student_id) where pending is true;

notify pgrst, 'reload schema';
