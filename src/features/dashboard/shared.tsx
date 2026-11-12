'use client'

import { monthLabel } from '@/shared/format'

export const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : a ? 100 : 0)

/** Variación porcentual respecto del mes anterior. `inverse`: subir es malo (egresos). */
export function Delta({ a, b, prev, inverse = false }: { a: number; b: number; prev: string; inverse?: boolean }) {
  const p = pct(a, b)
  if (!Number.isFinite(p)) return null
  const up = p >= 0
  const good = inverse ? !up : up
  return (
    <>
      <span className={`delta ${p === 0 ? '' : good ? 'up' : 'down'}`}>{up ? '▲' : '▼'} {Math.abs(p).toFixed(0)}%</span>{' '}
      <small>vs {monthLabel(prev)}</small>
    </>
  )
}
