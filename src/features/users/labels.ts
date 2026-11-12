/** Nombres legibles de las tablas auditadas. */
export const ENTITY_LABEL: Record<string, string> = {
  users: 'Usuarios',
  students: 'Alumnos',
  payments: 'Pagos',
  products: 'Productos',
  sales: 'Ventas',
  expenses: 'Egresos',
  activities: 'Planificación',
  gym_settings: 'Configuración general',
  payment_methods: 'Tipos de pago',
  plans: 'Planes',
  student_statuses: 'Estados de alumno',
  product_categories: 'Categorías de producto',
  expense_categories: 'Tipos de egreso',
  weight_categories: 'Categorías de peso',
  session: 'Sesión',
  backup: 'Respaldo',
}
export const entityLabel = (e: string) => ENTITY_LABEL[e] ?? e

export const ACTION_LABEL: Record<string, string> = {
  CREATE: 'Creación', UPDATE: 'Modificación', DELETE: 'Eliminación', LOGIN: 'Inicio de sesión',
  LOGIN_FAILED: 'Intento fallido', LOGOUT: 'Cierre de sesión', IMPORT: 'Importación', RESET: 'Restablecimiento',
}
