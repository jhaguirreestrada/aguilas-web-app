'use client'

import { useState } from 'react'
import { compact, money } from '@/shared/format'

/* ------------------------------------------------------------------
 * Gráficos SVG livianos (sin librerías). Portados del HTML original.
 * Los tooltips usan `data-tip` + <TipArea> que sigue al cursor.
 * ------------------------------------------------------------------ */

export function TipArea({ children }: { children: React.ReactNode }) {
  const [tip, setTip] = useState<{ html: string; x: number; y: number } | null>(null)
  return (
    <div
      onMouseMove={(e) => {
        const t = (e.target as Element).closest?.('[data-tip]') as HTMLElement | null
        if (!t) return setTip(null)
        const w = 240, h = 90
        let x = e.clientX + 14, y = e.clientY + 14
        if (x + w > window.innerWidth - 8) x = e.clientX - w - 14
        if (y + h > window.innerHeight - 8) y = e.clientY - h - 14
        setTip({ html: t.dataset.tip ?? '', x, y })
      }}
      onMouseLeave={() => setTip(null)}
    >
      {children}
      {tip && <div className="gym-tip" style={{ left: tip.x, top: tip.y }} dangerouslySetInnerHTML={{ __html: tip.html }} />}
    </div>
  )
}

/** Escapa texto para incrustarlo en el tooltip (innerHTML). */
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

const W = 640, H = 250, L = 52, R = 10, T = 10, B = 28
const nice = (mx: number) => {
  if (mx <= 0) return 1
  const e = Math.pow(10, Math.floor(Math.log10(mx)))
  const f = mx / e
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e
}

function Axes({ max }: { max: number }) {
  const top = nice(max)
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => {
        const v = (top / 4) * i
        const y = T + (H - T - B) * (1 - v / top)
        return (
          <g key={i}>
            <line x1={L} x2={W - R} y1={y} y2={y} stroke="var(--grid)" strokeDasharray={i ? '3 3' : undefined} />
            <text x={L - 8} y={y + 4} textAnchor="end">{compact(v)}</text>
          </g>
        )
      })}
    </>
  )
}

export interface BarPoint {
  label: string
  /** HTML ya escapado para el tooltip */
  tip: string
  values: number[]
  projection?: boolean
}

/** Barras agrupadas o apiladas. `colors[i]` corresponde a `values[i]`. */
export function BarChart({ points, colors, stacked = false, label }: { points: BarPoint[]; colors: string[]; stacked?: boolean; label: string }) {
  const max = Math.max(...points.map((p) => (stacked ? p.values.reduce((a, b) => a + b, 0) : Math.max(...p.values))), 1)
  const top = nice(max)
  const n = points.length, bw = (W - L - R) / n, k = colors.length
  const w = stacked ? Math.min(46, bw * 0.6) : Math.min(k > 1 ? 24 : 46, (bw * 0.6) / k)
  const hh = H - T - B, y0 = T + hh
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        <Axes max={max} />
        {points.map((p, i) => {
          const gx = L + bw * i
          let acc = 0
          return (
            <g key={i}>
              {p.values.map((v, j) => {
                const h = (v / top) * hh
                if (h <= 0) return null
                const x = stacked ? gx + (bw - w) / 2 : gx + (bw - w * k) / 2 + w * j
                const y = stacked ? y0 - acc - h - (j > 0 && acc > 0 ? 2 : 0) : y0 - h
                if (stacked) acc += h
                return <rect key={j} x={x} y={y} width={w} height={h} fill={colors[j]} fillOpacity={p.projection ? 0.4 : 1} stroke={p.projection ? colors[j] : undefined} strokeDasharray={p.projection ? '3 2' : undefined} />
              })}
              <rect x={gx} y={T} width={bw} height={hh} fill="transparent" data-tip={p.tip} />
              <text x={gx + bw / 2} y={H - 8} textAnchor="middle">{p.label}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export interface LinePoint { label: string; tip: string; value: number; projection?: boolean }

/** Línea con valores negativos; el último punto proyectado va punteado. */
export function LineChart({ points, label }: { points: LinePoint[]; label: string }) {
  const vals = points.map((p) => p.value)
  const mx = Math.max(...vals, 1), mn = Math.min(...vals, 0)
  const tp = nice(mx), bt = mn < 0 ? -nice(-mn) : 0, rg = tp - bt
  const hh = H - T - B, n = points.length, bw = (W - L - R) / n
  const Y = (v: number) => T + hh * (1 - (v - bt) / rg)
  const X = (i: number) => L + bw * i + bw / 2
  const real = points.filter((p) => !p.projection)
  const proj = points.find((p) => p.projection)
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {[0, 1, 2, 3, 4].map((i) => {
          const v = bt + (rg / 4) * i
          return (
            <g key={i}>
              <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--grid)" strokeDasharray={i ? '3 3' : undefined} />
              <text x={L - 8} y={Y(v) + 4} textAnchor="end">{compact(v)}</text>
            </g>
          )
        })}
        {bt < 0 && <line x1={L} x2={W - R} y1={Y(0)} y2={Y(0)} stroke="hsl(var(--muted-foreground))" />}
        <polyline points={real.map((p) => `${X(points.indexOf(p))},${Y(p.value)}`).join(' ')} fill="none" stroke="var(--c3)" strokeWidth="2.5" strokeLinejoin="round" />
        {proj && real.length > 0 && (
          <line x1={X(points.indexOf(real[real.length - 1]))} y1={Y(real[real.length - 1].value)} x2={X(points.indexOf(proj))} y2={Y(proj.value)} stroke="var(--c3)" strokeWidth="2.5" strokeDasharray="5 4" />
        )}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={X(i)} cy={Y(p.value)} r="4.5" fill={p.projection ? 'hsl(var(--card))' : 'var(--c3)'} stroke="var(--c3)" strokeWidth="2" />
            <rect x={L + bw * i} y={T} width={bw} height={hh} fill="transparent" data-tip={p.tip} />
            <text x={X(i)} y={H - 8} textAnchor="middle">{p.label}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

export interface DonutSlice { label: string; value: number; color: string; icon?: string }

export function Donut({ slices, center, centerSub, valueFmt = (v: number) => String(v), pct = false, hideValues = false }: {
  slices: DonutSlice[]; center: string; centerSub: string; valueFmt?: (v: number) => string; pct?: boolean; hideValues?: boolean
}) {
  const total = slices.reduce((s, x) => s + x.value, 0)
  const r = 62, sw = 26, C = 2 * Math.PI * r
  let off = 0
  return (
    <div className="donutwrap chart">
      <svg viewBox="0 0 180 180" style={{ width: 170, flex: 'none' }}>
        {slices.map((s) => {
          if (!s.value) return null
          const len = (s.value / total) * C
          const el = (
            <circle key={s.label} r={r} cx="90" cy="90" fill="none" stroke={s.color} strokeWidth={sw}
              strokeDasharray={`${Math.max(len - 2, 0)} ${C}`} strokeDashoffset={-off} transform="rotate(-90 90 90)"
              data-tip={`<b>${escapeHtml(s.label)}</b>${valueFmt(s.value)} · ${((s.value / total) * 100).toFixed(0)}%`} />
          )
          off += len
          return el
        })}
        <text x="90" y="88" textAnchor="middle" style={{ fontSize: 22, fontWeight: 800, fill: 'hsl(var(--foreground))' }}>{center}</text>
        <text x="90" y="106" textAnchor="middle">{centerSub}</text>
      </svg>
      <div style={{ flex: 1, minWidth: 140 }}>
        {slices.map((s) => (
          <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, margin: '7px 0' }}>
            <span><i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: s.color, marginRight: 8 }} />{s.icon ? `${s.icon} ` : ''}{s.label}</span>
            {!hideValues && <b>{pct ? `${total ? ((s.value / total) * 100).toFixed(0) : 0}%` : s.value}</b>}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Barras horizontales (ranking). */
export function HBars({ data, fmt = (v: number) => String(v), color, limit = 6 }: {
  data: Record<string, number>; fmt?: (v: number) => string; color?: string; limit?: number
}) {
  const e = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, limit)
  const mx = Math.max(...e.map((x) => x[1]), 1)
  if (!e.length) return <div className="empty">Sin datos</div>
  return (
    <>
      {e.map(([k, v]) => (
        <div className="hbar" key={k}>
          <span title={k} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k}</span>
          <div className="t"><i style={{ width: `${(v / mx) * 100}%`, ...(color ? { background: color } : {}) }} /></div>
          <em>{fmt(v)}</em>
        </div>
      ))}
    </>
  )
}

export const tipMoney = (title: string, lines: [string, number][], total?: [string, number]) =>
  `<b>${escapeHtml(title)}</b>` + lines.map(([l, v]) => `${escapeHtml(l)}: ${money(v)}`).join('<br>') +
  (total ? `<br><b style="margin-top:3px">${escapeHtml(total[0])}: ${money(total[1])}</b>` : '')
