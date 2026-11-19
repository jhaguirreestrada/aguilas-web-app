'use client'

import { useMemo, useState } from 'react'
import { Banknote, Trash2 } from 'lucide-react'
import { api, errMsg } from '@/lib/api-client'
import { useFetch } from '@/hooks/useFetch'
import { useSettings } from '@/hooks/useSettings'
import { useNotify } from '@/hooks/useNotify'
import { Field, MoneyInput, opts } from '@/components/gym/ui'
import { RotateCcw } from 'lucide-react'
import { money, norm } from '@/shared/format'
import type { Product, Sale, StudentSummary } from '@/shared/types'

/** `amount` = subtotal editado a mano (null = precio de lista × cantidad). */
export interface CartLine { product_id: string; name: string; price: number; quantity: number; amount?: number | null }
const lineTotal = (l: CartLine) => l.amount ?? l.price * l.quantity

/**
 * Pestaña «Nueva venta». Mismo diseño que «Caja y ventas» de Vivet:
 * 1 Productos a vender (filtro por categoría + búsqueda/código de barras) · 2 Detalle · 3 Cobro.
 * El carro vive en la página para conservarse al cambiar de pestaña.
 */
export default function NewSale({ cart, setCart, onSaved }: { cart: CartLine[]; setCart: (c: CartLine[]) => void; onSaved: () => void }) {
  const notify = useNotify()
  const { data: cfg } = useSettings()
  const { data: products, reload } = useFetch<Product[]>('/api/products')
  const { data: students } = useFetch<StudentSummary[]>('/api/students')
  const [cat, setCat] = useState('')           // '' = todas
  const [q, setQ] = useState('')
  const [method, setMethod] = useState('')
  const [studentId, setStudentId] = useState('')
  const [notes, setNotes] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const active = useMemo(() => (products ?? []).filter((p) => p.is_active).sort((a, b) => a.name.localeCompare(b.name, 'es')), [products])
  const byId = useMemo(() => new Map(active.map((p) => [p.id, p])), [active])
  const shown = useMemo(() => {
    const t = norm(q)
    return active.filter((p) => (!cat || p.category === cat) && (!t || norm(`${p.name} ${p.code} ${p.category}`).includes(t))).slice(0, 60)
  }, [active, cat, q])
  const total = cart.reduce((s, l) => s + lineTotal(l), 0)
  const methodVal = method || cfg?.payment_methods[0] || ''

  const add = (p: Product) => {
    const ya = cart.find((l) => l.product_id === p.id)
    const qty = (ya?.quantity ?? 0) + 1
    if (qty > p.stock) return notify.error(`Stock insuficiente de "${p.name}" (disponible: ${p.stock})`)
    setErr('')
    setCart(ya ? cart.map((l) => (l === ya ? { ...l, quantity: qty, amount: l.amount == null ? null : Math.round((l.amount / l.quantity) * qty) } : l)) : [...cart, { product_id: p.id, name: p.name, price: p.price, quantity: 1 }])
  }

  const setQty = (i: number, raw: number) => {
    const p = byId.get(cart[i].product_id)
    let n = Math.max(1, Math.floor(raw) || 1)
    if (p && n > p.stock) { n = p.stock; notify.error(`Stock máximo: ${p.stock}`) }
    // Si el subtotal fue editado, se conserva el precio unitario editado al cambiar la cantidad
    setCart(cart.map((l, j) => (j === i ? { ...l, quantity: n, amount: l.amount == null ? null : Math.round((l.amount / l.quantity) * n) } : l)))
  }

  const setAmount = (i: number, v: number | '') => setCart(cart.map((l, j) => (j === i ? { ...l, amount: v === '' ? 0 : v } : l)))
  const resetAmount = (i: number) => setCart(cart.map((l, j) => (j === i ? { ...l, amount: null } : l)))

  // Enter en el buscador: coincidencia exacta de código (lector de barras) o único resultado
  const onSearchEnter = () => {
    const t = norm(q)
    if (!t) return
    const exact = active.find((p) => p.code && norm(p.code) === t)
    const hit = exact ?? (shown.length === 1 ? shown[0] : null)
    if (hit) { if (hit.stock > 0) add(hit); else notify.error(`"${hit.name}" no tiene stock`); setQ('') }
    else notify.error(shown.length ? 'Hay varios resultados: elige uno de la lista' : 'Código o producto no encontrado')
  }

  const submit = async (pending: boolean) => {
    if (!cart.length) return setErr('Agrega al menos un producto')
    setBusy(true); setErr('')
    try {
      const sale = await api.post<Sale>('/api/sales', {
        items: cart.map((l) => ({ product_id: l.product_id, quantity: l.quantity, ...(l.amount != null ? { amount: l.amount } : {}) })),
        pending, payment_method: pending ? '' : methodVal, student_id: studentId || null, notes: notes.trim(),
      })
      notify.ok(`Venta N° ${sale.sale_number} ${pending ? 'guardada por cobrar' : 'cobrada'}: ${money(sale.total)}`)
      setCart([]); setNotes(''); setStudentId(''); setQ('')
      reload(); onSaved()
    } catch (e) { setErr(errMsg(e)) } finally { setBusy(false) }
  }

  return (
    <div className="two" style={{ gridTemplateColumns: '1.1fr 1fr', alignItems: 'start' }}>
      <div className="card">
        <div className="vsec v1" style={{ marginTop: 0 }}>
          <h3><i>1</i> Productos a vender</h3>
          <div className="chips">
            {[{ k: '', l: 'Todo' }, ...(cfg?.product_categories ?? []).map((c) => ({ k: c, l: c }))].map((c) => (
              <button key={c.k || 'all'} type="button" className={`chip ${cat === c.k ? 'on' : ''}`} onClick={() => setCat(c.k)}>{c.l}</button>
            ))}
          </div>
          <input value={q} autoFocus placeholder="Buscar o escanear código de barras + Enter…" onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSearchEnter() } }} />
          <div className="catgrid" style={{ maxHeight: 420 }}>
            {shown.length ? shown.map((p) => (
              <button key={p.id} type="button" disabled={p.stock <= 0} style={p.stock <= 0 ? { opacity: 0.45 } : undefined} onClick={() => add(p)}>
                <b>{p.name}</b>
                <small>{money(p.price)} · Stock {p.stock}{p.code ? ` · ${p.code}` : ''}</small>
              </button>
            )) : <div className="empty" style={{ gridColumn: '1/-1' }}>{products ? 'Sin resultados' : 'Cargando…'}</div>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="vsec v2" style={{ marginTop: 0 }}>
          <h3><i>2</i> Detalle de la venta</h3>
          {cart.length ? (
            <div className="tw">
              <table style={{ minWidth: 0 }}>
                <thead><tr><th>Concepto</th><th>Cant.</th><th className="r">Subtotal</th><th /></tr></thead>
                <tbody>
                  {cart.map((l, i) => (
                    <tr key={l.product_id}>
                      <td>
                        {l.name}<br />
                        <span className="muted sm">{money(l.amount != null ? Math.round(l.amount / l.quantity) : l.price)} c/u</span>
                        {l.amount != null && l.amount !== l.price * l.quantity && (
                          <> <span className="pill warn">Precio modificado</span>{' '}
                            <button type="button" className="btn ghost sm ico" title={`Volver al precio de lista (${money(l.price * l.quantity)})`} onClick={() => resetAmount(i)}><RotateCcw /></button></>
                        )}
                      </td>
                      <td style={{ width: 84 }}><input type="number" min={1} value={l.quantity} onChange={(e) => setQty(i, Number(e.target.value))} /></td>
                      <td className="r" style={{ width: 130 }}>
                        <MoneyInput style={{ textAlign: 'right', fontWeight: 700 }} maxLength={12} aria-label={`Subtotal de ${l.name}`} value={lineTotal(l)} onChange={(v) => setAmount(i, v)} />
                      </td>
                      <td className="c" style={{ width: '1%' }}><button type="button" className="btn ghost sm ico" title="Quitar" onClick={() => setCart(cart.filter((_, j) => j !== i))}><Trash2 /></button></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="tot-row"><td colSpan={2} className="b" style={{ fontSize: 16 }}>Total</td><td className="r b" style={{ fontSize: 18 }}>{money(total)}</td><td /></tr></tfoot>
              </table>
            </div>
          ) : <div className="empty">Agrega productos desde la lista</div>}
        </div>

        <div className="vsec v3">
          <h3><i>3</i> Cobro</h3>
          <div className="fg">
            <Field label="Alumno / Cliente">
              <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                <option value="">Cliente general</option>
                {(students ?? []).map((a) => <option key={a.id} value={a.id}>{a.full_name} — {a.rut}</option>)}
              </select>
            </Field>
            <Field label="Medio de pago"><select value={methodVal} onChange={(e) => setMethod(e.target.value)}>{opts(cfg?.payment_methods ?? [])}</select></Field>
            <Field label="Comentario" className="w"><input maxLength={150} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          </div>
          <p className="err" style={{ fontWeight: 600 }}>{err}</p>
          <div className="row-actions" style={{ margin: 0 }}>
            <button className="btn primary" onClick={() => submit(false)} disabled={busy || !cart.length}><Banknote /> Cobrar</button>
            <button className="btn warn" onClick={() => submit(true)} disabled={busy || !cart.length}>Por Cobrar</button>
            <button className="btn ghost" onClick={() => { setCart([]); setErr('') }} disabled={busy}>Vaciar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
