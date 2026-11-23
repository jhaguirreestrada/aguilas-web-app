# Águilas Boxeo Hualpén — Gestión (Next.js + Supabase/Postgres)

Migración de `aguilas-boxeo-hualpen.html` a **Next.js 14 + Postgres (Supabase)**.
BD `postgres`, esquema `boxing_gym`. UI basada en el Front base (URPI).

## Arranque local (todo dockerizado)
```bash
npm install
npm run setup:env     # genera .env.local con secretos aleatorios
npm run db:up         # Postgres :54332 + PostgREST + gateway estilo Supabase :54331
npm run dev           # http://localhost:3001   →  admin / admin123
```
Otros: `npm run db:reset` (borra y recrea la BD), `npm run stack:up` (app también en Docker),
`npm run tools:up` (Adminer :8080), `npm test` (reglas de dominio).

## Guía de uso del sistema
> Esta sección es también la base de conocimiento del **Asistente virtual** (ver más abajo). Manténla actualizada.

Menú lateral: Paneles · Caja y Ventas · Alumnos · Productos · Egresos · Planificación · Usuario (Mantenimiento de Usuario | Log de Auditoría) · Configuración.
Arriba a la derecha, al pulsar el nombre del usuario: **Cambiar contraseña**, **Asistente virtual** y **Cerrar sesión**. El botón sol/luna cambia entre tema claro y oscuro.
La sesión se cierra sola tras un tiempo sin actividad (configurable en Configuración › General); antes aparece un aviso.

### Paneles (`/dashboard`)
Cuatro pestañas:
- **Alumnos**: alumnos activos, nuevos del mes, pagos por vencer/vencidos y vigentes; cumpleaños de la semana que viene; lista «Pagos por gestionar» con acciones **Registrar pago** y **Enviar WhatsApp**; estado de pago y alumnos por categoría de peso.
- **Ingresos**: ingresos del mes (membresías + ventas), ingresos por mes y por tipo de pago, comparación mensual, inventario con stock bajo y productos más vendidos. Tiene selector de período de gráficos.
- **Egresos**: egresos del mes, promedio mensual, mayor gasto, egresos por mes y por tipo, ingresos vs egresos, ranking de gastos.
- **Proyección**: «¿Cómo va este mes?» (ingresos a la fecha, por cobrar, esperado según historial), utilidad, cobertura de gastos, punto de equilibrio y proyección con método seleccionable.

### Alumnos (`/alumnos`)
Mantenedor de alumnos. Filtros: RUT, nombre, estado del alumno y estado del último pago. Acciones por fila: ver **historial de pagos**, **editar** y **eliminar**. Al crear/editar se piden RUT (validado con dígito verificador), nombres, apellidos, fecha de nacimiento, sexo, peso (kg), teléfono, correo y notas; la **categoría de peso** (Amateur) se asigna sola según sexo y peso. Se guarda historial de pesos. Un alumno puede darse **de baja** (retiro) y **reactivarse**. Los datos de pago iniciales se pueden registrar al crear el alumno.

### Caja y Ventas (`/caja`)
Está entre *Paneles* y *Alumnos*. Reúne en un solo lugar los cobros del gimnasio. Cinco pestañas:
- **Pago alumnos**: se busca al alumno por **RUT** o por **nombre y apellido**. Muestra sus datos y último pago, permite **Realizar Pago** (plan, monto, tipo de pago, fecha; el vencimiento se calcula según la duración del plan) y ver el **historial de pagos**. Estados de pago: **Vigente**, **Por Vencer** (dentro de los días de advertencia configurados), **Vencido** y **Sin pagos**.
- **Nueva venta**: *1 Productos a vender* (filtro por categoría —Boxeo, Bebidas, Snacks, Otros—, búsqueda por nombre o código de barras + Enter), *2 Detalle de la venta* (cantidades, total) y *3 Cobro* (**Alumno / Cliente**, medio de pago, comentario). Botones **Cobrar**, **Dejar por cobrar** y **Vaciar**. Descuenta stock automáticamente.
- **Por cobrar**: ventas que se dejaron por cobrar. Acciones: **Cobrar** (elige el medio de pago), ver detalle y **anular** (devuelve el stock). Una venta por cobrar no cuenta como ingreso hasta que se cobra.
- **Historial**: ventas con filtros por fechas, tipo de pago y estado (Pagada, Por cobrar, Anulada); ver detalle, cobrar y anular.
- **Cierre de caja**: elige una fecha y muestra todo lo cobrado ese día, **incluidos los pagos de alumnos** (también los registrados desde *Alumnos*) y las ventas cobradas: total, efectivo esperado, tarjetas, transferencias, resumen por medio de pago y detalle. Permite ingresar el efectivo contado para ver la diferencia e **imprimir** el cierre. Los egresos del sistema son mensuales y no tienen medio de pago, por eso no se descuentan del efectivo esperado.

### Productos (`/productos`)
Catálogo e inventario (artículos de boxeo, bebidas, snacks). Indicadores: productos activos, unidades en stock, valor del inventario y stock bajo/agotado. Filtros por código/nombre, categoría y estado de stock. Acciones: **nuevo producto** (código/SKU, categoría, nombre, precio de venta, costo, stock inicial y mínimo), **editar**, **eliminar**, **ajustar stock** (entrada por compra con documento y precio de costo, merma, ajuste, etc.) y ver movimientos de stock.

### Egresos (`/egresos`)
- **Ingreso de gastos**: elegir año y mes y digitar el monto de cada tipo de egreso; hay un botón para copiar los montos del mes anterior a los campos vacíos.
- **Historial de egresos**: meses registrados, total, promedio y mes de mayor gasto; se puede editar un mes.
Los tipos de egreso se administran en Configuración › Tipos de egreso.

### Planificación (`/planificacion`)
Actividades por realizar en el gimnasio (ej: «Cambiar el piso del ring») con prioridad, fechas de inicio y fin y comentario. Pestaña *Activas*: iniciar, marcar como terminada, editar o dar de baja. Pestaña *Historial*: reabrir (vuelve a Pendiente), editar o eliminar. Estados: Pendiente, En curso, Terminada, De baja.

### Usuario
- **Mantenimiento de Usuario** (`/usuario/mantenimiento`): crear, editar, activar/desactivar y eliminar usuarios del sistema (usuario, nombre completo, correo opcional y contraseña). Un usuario desactivado no puede entrar.
- **Log de Auditoría** (`/usuario/auditoria`): registro inmutable de todo lo que se crea, modifica o elimina, y de inicios/cierres de sesión e intentos fallidos. Filtros: texto, entidad, acción, usuario y fechas; **ver detalle** muestra el antes y el después.
- **Cambiar contraseña** (menú del usuario, arriba a la derecha): pide la contraseña actual y la nueva (mínimo 8 caracteres) con confirmación.

### Configuración (`/configuracion`)
Mantenedores que alimentan el resto del sistema:
- **General y WhatsApp**: nombre del gimnasio, días de advertencia de vencimiento, minutos de inactividad para cerrar sesión y plantillas de mensajes de WhatsApp (variables `{nombre}`, `{gimnasio}`, `{vencimiento}`, `{dias}`, `{retraso}`, `{monto}`) para pagos vigentes, por vencer y vencidos.
- **Tipos de pago** (efectivo, transferencia, etc.), **Planes** (nombre, duración en meses o días y monto sugerido), **Estados de alumno** (Activo, De baja e Inactivo son del sistema y no se pueden quitar), **Categorías de producto**, **Tipos de egreso**, **Categorías Mujer** y **Categorías Hombre** (rangos de peso Amateur).

### Preguntas frecuentes
- *¿Cómo registro el pago de un alumno?* Caja y Ventas › Pago alumnos › buscar por RUT/nombre › Realizar Pago; o desde Paneles › Alumnos › «Pagos por gestionar».
- *¿Cómo aviso a un alumno que su pago vence?* Paneles › Alumnos › Pagos por gestionar › Enviar WhatsApp (abre WhatsApp con el mensaje de la plantilla; el alumno debe tener celular).
- *¿Cómo agrego stock?* Productos › Ajustar stock (entrada por compra).
- *Me equivoqué en una venta*: Caja y Ventas › Historial › Anular venta (también se puede anular desde «Por cobrar»).
- *¿Cómo dejo una venta por cobrar?* Caja y Ventas › Nueva venta › agrega los productos › **Dejar por cobrar**. Después se cobra en la pestaña «Por cobrar».
- *¿Dónde veo cuánto se cobró hoy?* Caja y Ventas › Cierre de caja (incluye pagos de alumnos y ventas).
- *¿Quién cambió un dato?* Usuario › Log de Auditoría.
- *¿Cómo agrego un plan o un gasto nuevo?* Configuración › Planes / Tipos de egreso.

## Asistente virtual
Opción del menú de usuario (entre «Cambiar contraseña» y «Cerrar sesión»). Abre un chat que orienta sobre cómo usar la aplicación.
- El navegador llama a `POST /api/assistant` (requiere sesión). El servidor lee este `README.md` (sección *Guía de uso del sistema*), lo envía como contexto y consulta un modelo de IA vía API compatible con OpenAI. Por defecto **DeepSeek** (`deepseek-chat`, muy económico; hay otros proveedores con capa gratuita).
- La clave nunca llega al navegador. Variables (servidor): `ASSISTANT_API_KEY` (si falta, el chat avisa que no está configurado), `ASSISTANT_BASE_URL` (def. `https://api.deepseek.com`), `ASSISTANT_MODEL` (def. `deepseek-chat`). Alternativas gratuitas compatibles: Groq (`https://api.groq.com/openai/v1`, `openai/gpt-oss-120b`), OpenRouter (`https://openrouter.ai/api/v1`, modelos `:free`).
- El asistente **no accede a los datos del gimnasio** (alumnos, pagos…); solo conoce esta guía. Se envían los últimos 10 mensajes de la conversación.

## Arquitectura (lista para Nest.js)
```
supabase/migrations/   SQL: tablas, auditoría (triggers), funciones transaccionales, permisos, datos iniciales
src/shared/            dominio puro (RUT, estados de pago, fechas, tipos)  → se copia tal cual a Nest
src/server/            "backend": modules/<x>/{dto,repository,service}, container.ts, db/client.ts, http/handler.ts
src/app/api/           controladores finos de Next (36 rutas) que solo llaman a los servicios
src/features, components/   UI
```
- Solo `src/server/db/client.ts` conoce Supabase; los repositorios reciben un `Db`. Para migrar: reemplazarlo por `pg`/Prisma, mover `modules/*` a módulos Nest (`container.ts` ≙ `providers`) y `http/handler.ts` a guard + filtro de excepciones.
- Operaciones atómicas (ventas, stock, egresos, config, importar) son funciones SQL (`boxing_gym.*`), invocables igual desde Nest.
- Auth propia: usuarios en `boxing_gym.users` (bcrypt), cookie httpOnly con JWT; sin perfiles.
- **Auditoría**: triggers en 14 tablas → `audit_log` (inmutable). El actor llega por cabeceras `x-actor-*` (PostgREST) o `set_config('app.actor_username', …)` (conexión SQL directa). `password_hash` nunca se registra.

## Versión
Se lee de `version` en `package.json` (1.0.3) y se muestra en el menú lateral.

## Importar los datos del HTML
La pantalla de respaldo fue retirada del menú; la API `POST /api/backup/import` (con sesión) sigue disponible.

## Despliegue en Vercel + Supabase (plan gratuito)
1. Crear proyecto Supabase; `supabase link` + `supabase db push` (aplica las 5 migraciones, crea `admin/admin123`).
2. Supabase › Settings › API › **Exposed schemas**: agregar `boxing_gym`.
3. Vercel › Env Vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (secreta), `SUPABASE_DB_SCHEMA=boxing_gym`, `AUTH_JWT_SECRET` (≥32 car.), `AUTH_SESSION_HOURS`, `APP_TIMEZONE`.
4. **Cambiar la contraseña de `admin`** en Usuario › Mantenimiento.
