import { parseIso } from '../dates'
import type { Sex, WeightCategory } from '../types'

export function ageOf(birth: string | null, today: string): number | null {
  if (!birth) return null
  const b = parseIso(birth)
  const t = parseIso(today)
  let a = t.getFullYear() - b.getFullYear()
  if (t < new Date(t.getFullYear(), b.getMonth(), b.getDate())) a--
  return a
}

/** Categoría de peso (equivale al LOOKUP del Excel): la de mayor `min_kg` que no supere el peso. */
export function weightCategoryOf(
  sex: Sex | null,
  weight: number | null,
  female: WeightCategory[],
  male: WeightCategory[],
): string {
  const list = sex === 'F' ? female : sex === 'M' ? male : null
  if (!list || weight == null || Number.isNaN(weight)) return ''
  let result = ''
  for (const c of [...list].sort((a, b) => a.min_kg - b.min_kg)) if (weight >= c.min_kg) result = c.name
  return result
}

export const SEX_LABEL: Record<Sex, string> = { F: 'Femenino', M: 'Masculino' }

export const CORE_STATUSES = ['Activo', 'De baja', 'Inactivo'] as const
