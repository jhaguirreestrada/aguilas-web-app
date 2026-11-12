/** Formateo de presentación (es-CL). */

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })

export const money = (n: number | null | undefined) => CLP.format(Math.round(n || 0))
export const num = (n: number | null | undefined, d = 0) =>
  new Intl.NumberFormat('es-CL', { maximumFractionDigits: d }).format(n || 0)

export const compact = (n: number) => {
  const a = Math.abs(n)
  return a >= 1e6
    ? (n / 1e6).toFixed(1).replace('.', ',').replace(',0', '') + ' M'
    : a >= 1e3
      ? Math.round(n / 1e3) + ' mil'
      : String(Math.round(n))
}

export const fmtDate = (s: string | null | undefined) => (s ? s.slice(0, 10).split('-').reverse().join('/') : '—')

export const fmtDateTime = (s: string | null | undefined) =>
  s
    ? new Date(s).toLocaleString('es-CL', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
      })
    : '—'

/** Normaliza para búsquedas: sin tildes, minúsculas. */
export const norm = (s: unknown) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
export const MONTHS_FULL = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
export const monthLabel = (k: string) => {
  const [y, m] = k.split('-')
  return MONTHS_SHORT[+m - 1] + ' ' + y.slice(2)
}
export const monthLong = (k: string) => {
  const [y, m] = k.split('-')
  return MONTHS_SHORT[+m - 1] + ' ' + y
}

/** 1234567 -> "1.234.567" */
export const miles = (n: number | string) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
/** "1.234.567" -> 1234567 ('' si no hay dígitos) */
export const milesVal = (v: string): number | '' => {
  const d = String(v).replace(/\D/g, '')
  return d === '' ? '' : Number(d)
}
