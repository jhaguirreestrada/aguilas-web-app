import { fmtDate, money } from '@/shared/format'
import type { Settings, StudentSummary } from '@/shared/types'

/** Normaliza un celular chileno a formato internacional (56…). */
export function waNumber(cel: string): string {
  const d = String(cel || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('56')) return d
  if (d.length === 9) return '56' + d
  if (d.length === 8) return '569' + d
  return d
}

/** Reemplaza {nombre}, {gimnasio}, {vencimiento}, {dias}, {retraso}, {monto} en la plantilla. */
export function waText(tpl: string, cfg: Settings, s: StudentSummary): string {
  const up = s.last_payment
  const e = s.payment_status
  const vars: Record<string, string | number> = {
    nombre: s.first_names,
    gimnasio: cfg.gym_name,
    vencimiento: up ? fmtDate(up.due_date) : '',
    dias: e.days_left ?? '',
    retraso: e.days_overdue || 0,
    monto: up ? money(up.amount) : '',
  }
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
}

/** URL de WhatsApp según el estado de pago, o null si el alumno no tiene celular. */
export function waUrl(s: StudentSummary, cfg: Settings): string | null {
  const num = waNumber(s.phone)
  if (!num) return null
  const key = s.payment_status.key === 'OVERDUE' ? 'overdue' : s.payment_status.key === 'DUE_SOON' ? 'due_soon' : 'current'
  return `https://wa.me/${num}?text=${encodeURIComponent(waText(cfg.whatsapp[key], cfg, s))}`
}
