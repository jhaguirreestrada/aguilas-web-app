/** Utilidades de fecha puras (formato ISO `YYYY-MM-DD`, sin zonas horarias implícitas). */

export const pad = (n: number) => String(n).padStart(2, '0')

export const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const parseIso = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Fecha de hoy (ISO) en una zona horaria IANA. Vercel corre en UTC, por eso se calcula explícitamente. */
export function todayIso(timeZone = 'America/Santiago', now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  return parts // en-CA => YYYY-MM-DD
}

/** Hora actual HH:MM:SS en una zona horaria IANA. */
export function nowTime(timeZone = 'America/Santiago', now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now)
}

export const diffDays = (a: string, b: string): number =>
  Math.round((parseIso(a).getTime() - parseIso(b).getTime()) / 864e5)

export function addDays(iso: string, n: number): string {
  const d = parseIso(iso)
  d.setDate(d.getDate() + n)
  return isoOf(d)
}

/** Suma meses conservando el día (31-ene + 1 mes = 28/29-feb). */
export function addMonths(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const t = new Date(y, m - 1 + n, 1)
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()
  return isoOf(new Date(t.getFullYear(), t.getMonth(), Math.min(d, last)))
}

export const monthKey = (iso: string) => iso.slice(0, 7)

/** Últimos `n` meses (YYYY-MM) terminando en el mes de `today`. */
export function lastMonths(today: string, n: number): string[] {
  const [y, m] = today.split('-').map(Number)
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1)
    out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`)
  }
  return out
}

export function nextMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}
