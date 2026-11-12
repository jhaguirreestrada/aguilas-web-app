-- =============================================================================
--  Migración 5/5 — Datos iniciales (idempotente).
--   · Configuración por defecto del gimnasio.
--   · Usuario administrador inicial: admin / admin123
--
--  ⚠ CAMBIA LA CONTRASEÑA DE `admin` ANTES DE PUBLICAR EN PRODUCCIÓN
--    (Usuario > Mantenimiento de Usuario > Editar > Nueva contraseña).
--
--  El hash es bcrypt ($2a$10$…), verificable por bcryptjs / bcrypt de Node.
-- =============================================================================

-- La carga de valores por defecto no ensucia el log de auditoría
do $$
begin
  perform set_config('app.audit_disabled', 'on', true);
  perform boxing_gym.seed_default_settings();
end $$;

insert into boxing_gym.users (username, full_name, email, password_hash, is_active)
values (
  'admin',
  'Administrador',
  'admin@aguilas.local',
  extensions.crypt('admin123', extensions.gen_salt('bf', 10)),
  true
)
on conflict (lower(username)) do nothing;
