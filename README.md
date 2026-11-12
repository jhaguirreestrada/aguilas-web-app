# Águilas Boxeo Hualpén — Gestión (Next.js + Supabase/Postgres)

Migración de `aguilas-boxeo-hualpen.html` a **Next.js 14 + Postgres (Supabase)**.
BD `urpi_management_db`, esquema `boxing_gym`. UI basada en el Front base (URPI).

## Arranque local (todo dockerizado)
```bash
npm install
npm run setup:env     # genera .env.local con secretos aleatorios
npm run db:up         # Postgres :54332 + PostgREST + gateway estilo Supabase :54331
npm run dev           # http://localhost:3001   →  admin / admin123
```
Otros: `npm run db:reset` (borra y recrea la BD), `npm run stack:up` (app también en Docker),
`npm run tools:up` (Adminer :8080), `npm test` (reglas de dominio).

## Menú
Paneles · Pagos · Alumnos · Ventas · Productos · Egresos · Planificación · **Usuario** (Mantenimiento de Usuario | Log de Auditoría) · Configuración.

## Arquitectura (lista para Nest.js)
```
supabase/migrations/   SQL: tablas, auditoría (triggers), funciones transaccionales, permisos, datos iniciales
src/shared/            dominio puro (RUT, estados de pago, fechas, tipos)  → se copia tal cual a Nest
src/server/            "backend": modules/<x>/{dto,repository,service}, container.ts, db/client.ts, http/handler.ts
src/app/api/           controladores finos de Next (35 rutas) que solo llaman a los servicios
src/features, components/   UI
```
- Solo `src/server/db/client.ts` conoce Supabase; los repositorios reciben un `Db`. Para migrar: reemplazarlo por `pg`/Prisma, mover `modules/*` a módulos Nest (`container.ts` ≙ `providers`) y `http/handler.ts` a guard + filtro de excepciones.
- Operaciones atómicas (ventas, stock, egresos, config, importar) son funciones SQL (`boxing_gym.*`), invocables igual desde Nest.
- Auth propia: usuarios en `boxing_gym.users` (bcrypt), cookie httpOnly con JWT; sin perfiles.
- **Auditoría**: triggers en 14 tablas → `audit_log` (inmutable). El actor llega por cabeceras `x-actor-*` (PostgREST) o `set_config('app.actor_username', …)` (conexión SQL directa). `password_hash` nunca se registra.

## Versión
Se lee de `version` en `package.json` (1.0.0) y se muestra en el menú lateral.

## Importar los datos del HTML
La pantalla de respaldo fue retirada del menú; la API `POST /api/backup/import` (con sesión) sigue disponible.

## Despliegue en Vercel + Supabase (plan gratuito)
1. Crear proyecto Supabase; `supabase link` + `supabase db push` (aplica las 5 migraciones, crea `admin/admin123`).
2. Supabase › Settings › API › **Exposed schemas**: agregar `boxing_gym`.
3. Vercel › Env Vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (secreta), `SUPABASE_DB_SCHEMA=boxing_gym`, `AUTH_JWT_SECRET` (≥32 car.), `AUTH_SESSION_HOURS`, `APP_TIMEZONE`.
4. **Cambiar la contraseña de `admin`** en Usuario › Mantenimiento.
