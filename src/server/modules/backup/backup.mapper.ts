/**
 * Conversión de respaldos a filas de la base.
 *  · v2  (inglés): exportado por esta aplicación — filas con las columnas de `boxing_gym`.
 *  · v1  (español): respaldos de la versión HTML original (aguilas_respaldo_*.json, alumnos.json, pagos.json…).
 */
import { cleanRut, formatRut } from '@/shared/rut'
import type { Settings } from '@/shared/types'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>

export const COLLECTIONS = ['settings', 'students', 'payments', 'products', 'inventory_movements', 'sales', 'expenses', 'activities'] as const
export type Collection = (typeof COLLECTIONS)[number]

export const COLLECTION_LABEL: Record<Collection, string> = {
  settings: 'Configuración',
  students: 'Alumnos',
  payments: 'Pagos',
  products: 'Productos',
  inventory_movements: 'Movimientos de inventario',
  sales: 'Ventas',
  expenses: 'Egresos',
  activities: 'Planificación (actividades)',
}

export const BACKUP_APP_ID = 'aguilas-boxeo-hualpen'

const ALIASES: Record<string, Collection> = {
  settings: 'settings', config: 'settings', configuracion: 'settings',
  students: 'students', alumnos: 'students',
  payments: 'payments', pagos: 'payments',
  products: 'products', productos: 'products',
  inventory_movements: 'inventory_movements', movimientos: 'inventory_movements',
  sales: 'sales', ventas: 'sales',
  expenses: 'expenses', egresos: 'expenses',
  activities: 'activities', actividades: 'activities',
}

/** Detecta a qué colección pertenece un archivo individual (por nombre o, si no, por contenido). */
export function detectCollection(fileName: string, data: unknown): Collection | null {
  const base = fileName.toLowerCase().replace(/\.json$/, '')
  const names = Object.keys(ALIASES).sort((a, b) => b.length - a.length)
  const byName = names.find((k) => base === k || base.startsWith(k + '_') || base.startsWith(k + '-'))
  if (byName) return ALIASES[byName]

  if (data && !Array.isArray(data) && typeof data === 'object') {
    const d = data as Row
    if (d.tiposPago || d.payment_methods) return 'settings'
    return null
  }
  const s = Array.isArray(data) ? (data[0] as Row | undefined) : undefined
  if (!s) return null
  if (s.items && s.total != null) return 'sales'
  if (s.categoria && s.anio && s.mes) return 'expenses'
  if (s.category && s.year && s.month) return 'expenses'
  if (s.alumnoId && s.fechaVencimiento) return 'payments'
  if (s.student_id && s.due_date) return 'payments'
  if (s.productoId && s.tipo) return 'inventory_movements'
  if (s.product_id && s.movement_type) return 'inventory_movements'
  if ((s.prioridad && s.fechaInicio) || (s.priority && s.start_date)) return 'activities'
  if (s.rut) return 'students'
  if ((s.precio != null || s.price != null) && (s.nombre || s.name)) return 'products'
  return null
}

const V2_MARKER: Record<Collection, string> = {
  settings: 'gym_name', students: 'first_names', payments: 'student_id', products: 'min_stock',
  inventory_movements: 'movement_type', sales: 'sale_number', expenses: 'year', activities: 'start_date',
}
export const isV2 = (col: Collection, data: unknown): boolean => {
  const sample = Array.isArray(data) ? data[0] : data
  return !!sample && typeof sample === 'object' && V2_MARKER[col] in (sample as object)
}

// ---------------------------------------------------------------------------
const iso = (v: any): string | null => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null)
const ts = (v: any): string => {
  const d = v ? new Date(v) : new Date()
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}
const intOr = (v: any, d: number) => (Number.isFinite(Number(v)) && v !== '' && v != null ? Math.round(Number(v)) : d)
const str = (v: any) => (v == null ? '' : String(v))

const MOVEMENT_TYPE: Record<string, string> = {
  'Stock inicial': 'initial_stock', Compra: 'purchase', Entrada: 'in', Salida: 'out',
  Ajuste: 'adjustment', Venta: 'sale', 'Anulación venta': 'sale_void',
}
const PRIORITY: Record<string, string> = { Crítico: 'critical', Alto: 'high', Medio: 'medium', Bajo: 'low' }
const ACT_STATUS: Record<string, string> = { Pendiente: 'pending', 'En Proceso': 'in_progress', Terminado: 'done', 'De baja': 'dropped' }

export interface MapResult {
  rows: Row[]
  extra?: Record<string, Row[]> // tablas hijas (student_weight_history, sale_items)
  problems: string[]
}

export interface IdMaps {
  students: Map<string, string>
  products: Map<string, string>
}

// ---------------------------- v1 (español) ----------------------------
export function legacyStudents(rows: Row[], maps: IdMaps): MapResult {
  const problems: string[] = []
  const out: Row[] = []
  const weights: Row[] = []
  const seen = new Set<string>()
  for (const a of rows) {
    const id = crypto.randomUUID()
    maps.students.set(String(a.id), id)
    const clean = cleanRut(a.rut)
    const rut = clean.length >= 2 ? formatRut(clean) : str(a.rut)
    if (seen.has(clean)) { problems.push(`RUT duplicado en el archivo de alumnos: ${rut}`); continue }
    seen.add(clean)
    const w = a.peso === '' || a.peso == null ? null : Number(a.peso)
    out.push({
      id, first_names: str(a.nombres).trim(), last_names: str(a.apellidos).trim(), rut,
      birth_date: iso(a.fechaNacimiento), sex: a.sexo === 'Femenino' ? 'F' : a.sexo === 'Masculino' ? 'M' : null,
      phone: str(a.celular), email: str(a.correo), weight_kg: w && w > 0 ? w : null, notes: str(a.comentario),
      status: str(a.estado) || 'Activo', joined_on: iso(a.fechaIngreso),
      withdrawal_reason: str(a.motivoBaja), withdrawn_on: iso(a.fechaBaja),
      created_at: ts(a.createdAt), updated_at: ts(a.updatedAt ?? a.createdAt),
    })
    for (const h of a.historialPeso ?? []) {
      if (Number(h.peso) > 0) weights.push({ id: crypto.randomUUID(), student_id: id, weight_kg: Number(h.peso), recorded_at: ts(h.fecha) })
    }
  }
  return { rows: out, extra: { student_weight_history: weights }, problems }
}

export function legacyPayments(rows: Row[], maps: IdMaps): MapResult {
  const problems: string[] = []
  const out: Row[] = []
  let orphans = 0
  for (const p of rows) {
    const studentId = maps.students.get(String(p.alumnoId))
    if (!studentId) { orphans++; continue }
    const unit = p.unidad === 'dias' ? 'days' : 'months'
    const quantity = Math.max(1, intOr(p.cantidad ?? p.meses, 1))
    const paid = iso(p.fechaPago)
    const due = iso(p.fechaVencimiento)
    if (!paid || !due) { problems.push(`Pago omitido por fechas inválidas (${str(p.id)})`); continue }
    out.push({
      id: crypto.randomUUID(), student_id: studentId, paid_on: paid,
      plan_name: str(p.planNombre) || (unit === 'days' ? `${quantity} día(s)` : `${quantity} mes(es)`),
      unit, quantity, months_equivalent: Number(p.meses) || (unit === 'days' ? quantity / 30 : quantity),
      payment_method: str(p.tipoPago) || 'Sin especificar', amount: intOr(p.monto, 0), due_date: due,
      notes: str(p.comentario), created_at: ts(p.createdAt), updated_at: ts(p.updatedAt ?? p.createdAt),
    })
  }
  if (orphans) problems.push(`${orphans} pago(s) omitidos: su alumno no está incluido en la importación`)
  return { rows: out, problems }
}

export function legacyProducts(rows: Row[], maps: IdMaps): MapResult {
  const problems: string[] = []
  const out: Row[] = []
  const codes = new Set<string>()
  for (const p of rows) {
    const id = crypto.randomUUID()
    maps.products.set(String(p.id), id)
    const code = str(p.codigo).trim()
    if (code && codes.has(code.toLowerCase())) { problems.push(`Código de producto repetido: ${code}`); continue }
    if (code) codes.add(code.toLowerCase())
    out.push({
      id, code, name: str(p.nombre), category: str(p.categoria) || 'Otros', price: intOr(p.precio, 0), cost: intOr(p.costo, 0),
      stock: Math.max(0, intOr(p.stock, 0)), min_stock: Math.max(0, intOr(p.stockMin, 0)), is_active: p.activo !== false,
      created_at: ts(p.createdAt), updated_at: ts(p.updatedAt ?? p.createdAt),
    })
  }
  return { rows: out, problems }
}

export function legacyMovements(rows: Row[], maps: IdMaps): MapResult {
  const problems: string[] = []
  const out: Row[] = []
  let orphans = 0
  for (const m of rows) {
    const productId = maps.products.get(String(m.productoId))
    if (!productId) { orphans++; continue }
    out.push({
      id: crypto.randomUUID(), product_id: productId, moved_on: iso(m.fecha) ?? iso(m.createdAt) ?? new Date().toISOString().slice(0, 10),
      movement_type: MOVEMENT_TYPE[m.tipo] ?? 'adjustment', quantity: intOr(m.cantidad, 0), resulting_stock: intOr(m.stockResultante, 0),
      purchase_price: m.precioCompra == null ? null : intOr(m.precioCompra, 0), document: str(m.documento), reason: str(m.motivo),
      created_at: ts(m.createdAt),
    })
  }
  if (orphans) problems.push(`${orphans} movimiento(s) de inventario omitidos: su producto no está incluido en la importación`)
  return { rows: out, problems }
}

export function legacySales(rows: Row[], maps: IdMaps): MapResult {
  const problems: string[] = []
  const out: Row[] = []
  const items: Row[] = []
  for (const v of rows) {
    const id = crypto.randomUUID()
    out.push({
      id, sale_number: intOr(v.numero, out.length + 1), sold_on: iso(v.fecha) ?? iso(v.createdAt) ?? new Date().toISOString().slice(0, 10),
      sold_time: /^\d{2}:\d{2}/.test(str(v.hora)) ? `${str(v.hora).slice(0, 5)}:00` : '00:00:00',
      total: intOr(v.total, 0), cost_total: intOr(v.costoTotal, 0), payment_method: str(v.tipoPago) || 'Sin especificar',
      student_id: (v.alumnoId && maps.students.get(String(v.alumnoId))) || null, student_name: str(v.alumnoNombre),
      notes: str(v.comentario), status: v.estado === 'Anulada' ? 'voided' : 'completed', voided_on: iso(v.fechaAnulacion),
      created_at: ts(v.createdAt), updated_at: ts(v.updatedAt ?? v.createdAt),
    })
    for (const i of v.items ?? []) {
      items.push({
        id: crypto.randomUUID(), sale_id: id, product_id: maps.products.get(String(i.productoId)) ?? null, product_name: str(i.nombre),
        quantity: Math.max(1, intOr(i.cantidad, 1)), unit_price: Number(i.precioUnit) || 0, unit_cost: Number(i.costoUnit) || 0,
        subtotal: intOr(i.subtotal, 0),
      })
    }
  }
  return { rows: out, extra: { sale_items: items }, problems }
}

export function legacyExpenses(rows: Row[]): MapResult {
  const merged = new Map<string, Row>()
  for (const e of rows) {
    const key = `${e.anio}|${e.mes}|${e.categoria}`
    const cur = merged.get(key)
    if (cur) { cur.amount += intOr(e.monto, 0); continue }
    merged.set(key, {
      id: crypto.randomUUID(), year: intOr(e.anio, 0), month: intOr(e.mes, 0), category: str(e.categoria), amount: intOr(e.monto, 0),
      detail: str(e.detalle), created_at: ts(e.createdAt), updated_at: ts(e.updatedAt ?? e.createdAt),
    })
  }
  return { rows: [...merged.values()], problems: [] }
}

export function legacyActivities(rows: Row[]): MapResult {
  const problems: string[] = []
  const out = rows.map((a) => {
    const start = iso(a.fechaInicio) ?? iso(a.createdAt) ?? new Date().toISOString().slice(0, 10)
    let end = iso(a.fechaFin) ?? start
    if (end < start) { end = start; problems.push(`Actividad «${str(a.nombre)}»: fecha de fin anterior al inicio, se ajustó`) }
    return {
      id: crypto.randomUUID(), name: str(a.nombre), priority: PRIORITY[a.prioridad] ?? 'medium', status: ACT_STATUS[a.estado] ?? 'pending',
      start_date: start, end_date: end, notes: str(a.comentario), closed_on: iso(a.fechaCierre),
      created_at: ts(a.createdAt), updated_at: ts(a.updatedAt ?? a.createdAt),
    }
  })
  return { rows: out, problems }
}

/** Configuración v1 -> `Settings`, completando lo que falte con la configuración actual. */
export function legacySettings(c: Row, base: Settings): Settings {
  const planes: Row[] = Array.isArray(c.planes) ? c.planes : []
  const cats = (l: any): Settings['weight_categories_male'] =>
    Array.isArray(l) ? l.map((x: Row) => ({ name: str(x.nombre), min_kg: Number(x.min), max_kg: Number(x.max) })) : []
  return {
    gym_name: str(c.gimnasio) || base.gym_name,
    warning_days: Number.isFinite(Number(c.diasAdvertencia)) ? Number(c.diasAdvertencia) : base.warning_days,
    inactivity_minutes: base.inactivity_minutes,
    whatsapp: {
      overdue: c.mensajesWhatsapp?.vencido ?? base.whatsapp.overdue,
      due_soon: c.mensajesWhatsapp?.porVencer ?? base.whatsapp.due_soon,
      current: c.mensajesWhatsapp?.vigente ?? base.whatsapp.current,
    },
    payment_methods: Array.isArray(c.tiposPago) && c.tiposPago.length ? c.tiposPago.map(str) : base.payment_methods,
    plans: planes.length
      ? planes.map((p) => ({
          name: str(p.nombre) || `Plan ${p.meses ?? 1} mes(es)`,
          unit: p.unidad === 'dias' ? 'days' : 'months',
          quantity: Math.max(1, intOr(p.cantidad ?? p.meses, 1)),
          amount: intOr(p.monto, 0),
        }))
      : base.plans,
    student_statuses: Array.isArray(c.estadosAlumno) && c.estadosAlumno.length ? c.estadosAlumno.map(str) : base.student_statuses,
    product_categories: Array.isArray(c.categoriasProducto) && c.categoriasProducto.length ? c.categoriasProducto.map(str) : base.product_categories,
    expense_categories: Array.isArray(c.categoriasEgreso) && c.categoriasEgreso.length ? c.categoriasEgreso.map(str) : base.expense_categories,
    weight_categories_female: cats(c.categoriasMujer).length ? cats(c.categoriasMujer) : base.weight_categories_female,
    weight_categories_male: cats(c.categoriasHombre).length ? cats(c.categoriasHombre) : base.weight_categories_male,
  }
}
