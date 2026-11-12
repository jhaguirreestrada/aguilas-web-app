import type { ActivityPriority, ActivityStatus, MovementType } from './types'

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  initial_stock: 'Stock inicial', purchase: 'Compra', in: 'Entrada', out: 'Salida',
  adjustment: 'Ajuste', sale: 'Venta', sale_void: 'Anulación venta',
}

export const PRIORITY_LABEL: Record<ActivityPriority, string> = { critical: 'Crítico', high: 'Alto', medium: 'Medio', low: 'Bajo' }
export const PRIORITY_TONE: Record<ActivityPriority, 'bad' | 'warn' | 'info' | ''> = { critical: 'bad', high: 'warn', medium: 'info', low: '' }
export const PRIORITY_ORDER: ActivityPriority[] = ['critical', 'high', 'medium', 'low']

export const ACTIVITY_LABEL: Record<ActivityStatus, string> = { pending: 'Pendiente', in_progress: 'En Proceso', done: 'Terminado', dropped: 'De baja' }
export const ACTIVITY_TONE: Record<ActivityStatus, 'warn' | 'info' | 'ok' | ''> = { pending: 'warn', in_progress: 'info', done: 'ok', dropped: '' }

export const SALE_STATUS_LABEL = { completed: 'Completada', voided: 'Anulada' } as const
