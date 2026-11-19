'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { miles, milesVal } from '@/shared/format'
import { cleanRut, formatRut } from '@/shared/rut'

/* ----------------------------- Pill ----------------------------- */
export function Pill({ tone = '', children }: { tone?: 'ok' | 'warn' | 'bad' | 'info' | ''; children: React.ReactNode }) {
  return <span className={`pill ${tone}`}>{children}</span>
}

/* ----------------------------- Tabs ----------------------------- */
export interface TabDef<K extends string> { key: K; label: string; icon?: React.ReactNode }
export function Tabs<K extends string>({ tabs, value, onChange }: { tabs: TabDef<K>[]; value: K; onChange: (k: K) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.key} type="button" role="tab" className={t.key === value ? 'on' : ''} aria-selected={t.key === value} onClick={() => onChange(t.key)}>
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  )
}

/* ----------------------------- Encabezado / campos ----------------------------- */
export function PageHeader({ title, subtitle, actions, compact }: { title: string; subtitle?: string; actions?: React.ReactNode; compact?: boolean }) {
  return (
    <div className={compact ? 'ph sm' : 'ph'}>
      <div><h1>{title}</h1>{subtitle ? <p>{subtitle}</p> : null}</div>
      {actions}
    </div>
  )
}

export function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <div className={className}><label className="l">{label}</label>{children}</div>
}

export function Kpi({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return <div className="kpi"><span>{label}</span><b>{value}</b>{sub ? <small>{sub}</small> : null}</div>
}

export const Empty = ({ children }: { children: React.ReactNode }) => <div className="empty">{children}</div>

/* ----------------------------- Grilla con paginación ----------------------------- */
export interface Col<T> { h: React.ReactNode; cls?: string; /** Ancho de columna (ej. '20%'); si alguna columna lo define, la tabla usa layout fijo. */ w?: string; cell: (row: T, index: number) => React.ReactNode }

export function DataGrid<T>({
  cols, rows, pageSize = 10, empty = 'Sin registros', foot, resetKey,
}: { cols: Col<T>[]; rows: T[]; pageSize?: number; empty?: React.ReactNode; foot?: React.ReactNode; resetKey?: string }) {
  const [page, setPage] = useState(1)
  useEffect(() => setPage(1), [resetKey])
  const total = rows.length
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const cur = Math.min(page, pages)
  const from = (cur - 1) * pageSize
  const slice = rows.slice(from, from + pageSize)

  // Anchos estables: se miden sobre una tabla fantasma con TODAS las filas (auto layout)
  // y se aplican a la tabla visible con layout fijo, así las columnas no se mueven al paginar.
  const fixedW = cols.some((c) => c.w)
  const ghostBox = useRef<HTMLDivElement>(null)
  const [widths, setWidths] = useState<number[] | null>(null)
  const needGhost = !fixedW && pages > 1
  useLayoutEffect(() => {
    const box = ghostBox.current
    if (!needGhost || !box) { setWidths(null); return }
    const measure = () => {
      const ths = box.querySelectorAll('thead th')
      const w = Array.from(ths).map((t) => t.getBoundingClientRect().width)
      const sum = w.reduce((a, b) => a + b, 0)
      if (!sum || w.length !== cols.length) return
      setWidths((prev) => (prev && prev.length === w.length && prev.every((v, i) => Math.abs(v - w[i]) < 0.5) ? prev : w))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(box)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needGhost, rows, cols.length])
  // La tabla fantasma solo se reconstruye cuando cambian las filas (no en cada render)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ghostRows = useMemo(() => (needGhost ? rows.slice(0, 100).map((r, ri) => (
    <tr key={ri}>{cols.map((c, ci) => <td key={ci} className={c.cls}>{c.cell(r, ri)}</td>)}</tr>
  )) : null), [needGhost, rows])
  const wSum = widths ? widths.reduce((a, b) => a + b, 0) : 0

  const nums: (number | 'gap')[] = []
  let last = 0
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - cur) <= 1) {
      if (i - last > 1) nums.push('gap')
      nums.push(i); last = i
    }
  }

  return (
    <>
      <div className="tw" style={{ position: 'relative' }}>
        {needGhost && (
          <div ref={ghostBox} aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 0, overflow: 'hidden', visibility: 'hidden', pointerEvents: 'none' }}>
            <table>
              <thead><tr>{cols.map((c, i) => <th key={i} className={c.cls}>{c.h}</th>)}</tr></thead>
              <tbody>
                {ghostRows}
              </tbody>
            </table>
          </div>
        )}
        <table style={fixedW || (needGhost && widths) ? { tableLayout: 'fixed' } : undefined}>
          {fixedW
            ? <colgroup>{cols.map((c, i) => <col key={i} style={c.w ? { width: c.w } : undefined} />)}</colgroup>
            : needGhost && widths && wSum > 0
              ? <colgroup>{widths.map((w, i) => <col key={i} style={{ width: `${(w / wSum) * 100}%` }} />)}</colgroup>
              : null}
          <thead><tr>{cols.map((c, i) => <th key={i} className={c.cls}>{c.h}</th>)}</tr></thead>
          <tbody>
            {slice.length ? slice.map((r, ri) => (
              <tr key={ri}>{cols.map((c, ci) => <td key={ci} className={c.cls}>{c.cell(r, from + ri)}</td>)}</tr>
            )) : <tr><td colSpan={cols.length} className="empty">{empty}</td></tr>}
          </tbody>
          {foot && total ? <tfoot>{foot}</tfoot> : null}
        </table>
      </div>
      <div className="pager">
        <span>{total ? `Mostrando ${from + 1}–${Math.min(total, from + pageSize)} de ${total}` : '0 registros'}</span>
        <div className="pg">
          <button disabled={cur <= 1} onClick={() => setPage(cur - 1)}>‹</button>
          {nums.map((n, i) => n === 'gap'
            ? <button key={`g${i}`} disabled>…</button>
            : <button key={n} className={n === cur ? 'on' : ''} onClick={() => setPage(n)}>{n}</button>)}
          <button disabled={cur >= pages} onClick={() => setPage(cur + 1)}>›</button>
        </div>
      </div>
    </>
  )
}

/* ----------------------------- Inputs con máscara ----------------------------- */
/** Monto en CLP con separador de miles (1.234.567). `value` es número o '' si está vacío. */
export function MoneyInput({
  value, onChange, ...rest
}: { value: number | ''; onChange: (v: number | '') => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>) {
  const ref = useRef<HTMLInputElement>(null)
  const caret = useRef<number | null>(null)
  useLayoutEffect(() => {
    if (caret.current != null && ref.current) { ref.current.setSelectionRange(caret.current, caret.current); caret.current = null }
  })
  return (
    <input
      {...rest}
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={value === '' ? '' : miles(value)}
      onChange={(e) => {
        const el = e.target
        const digitsBefore = el.value.slice(0, el.selectionStart ?? 0).replace(/\D/g, '').length
        const v = milesVal(el.value)
        const formatted = v === '' ? '' : miles(v)
        let pos = 0, n = 0
        while (pos < formatted.length && n < digitsBefore) { if (/\d/.test(formatted[pos])) n++; pos++ }
        caret.current = pos
        onChange(v)
      }}
    />
  )
}

/** RUT chileno con máscara 12.345.678-9 que conserva la posición del cursor. */
export function RutInput({
  value, onChange, ...rest
}: { value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const ref = useRef<HTMLInputElement>(null)
  const caret = useRef<number | null>(null)
  useLayoutEffect(() => {
    if (caret.current != null && ref.current) { ref.current.setSelectionRange(caret.current, caret.current); caret.current = null }
  })
  return (
    <input
      {...rest}
      ref={ref}
      maxLength={12}
      placeholder="12.345.678-9"
      value={value}
      onChange={(e) => {
        const el = e.target
        const before = cleanRut(el.value.slice(0, el.selectionStart ?? 0)).length
        const c = cleanRut(el.value).slice(0, 9)
        const next = c.length > 1 ? formatRut(c) : c
        let pos = 0, seen = 0
        while (pos < next.length && seen < before) { if (/[0-9K]/.test(next[pos])) seen++; pos++ }
        caret.current = pos
        onChange(next)
      }}
    />
  )
}

export const opts = (arr: (string | number | { value: string | number; label: string })[]) =>
  arr.map((v) => {
    const value = typeof v === 'object' ? v.value : v
    const label = typeof v === 'object' ? v.label : v
    return <option key={String(value)} value={value}>{label}</option>
  })
