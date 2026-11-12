'use client'

import { useMemo, useState } from 'react'
import { Ban, CreditCard, Eye, Plus, ShoppingCart, X } from 'lucide-react'
import { api, errMsg, qs } from '@/lib/api-client'
import { useFetch } from '@/hooks/useFetch'
import { useSettings } from '@/hooks/useSettings'
import { useNotify } from '@/hooks/useNotify'
import { useConfirm } from '@/components/providers/ConfirmProvider'
import { GymModal } from '@/components/gym/GymModal'
import { DataGrid, Field, MoneyInput, PageHeader, Pill, Tabs, opts } from '@/components/gym/ui'
import { fmtDate, money } from '@/shared/format'
import { SALE_STATUS_LABEL } from '@/shared/labels'
import type { Product, Sale, StudentSummary } from '@/shared/types'

interface CartLine { product_id: string; name: string; quantity: number; amount: number }
type Tab = 'new' | 'history'

export default function SalesPage() {
  const [tab, setTab] = useState<Tab>('new')
  // el carro vive en la página: se conserva al cambiar de pestaña
  const [cart, setCart] = useState<CartLine[]>([])

  return (
    <div className="gym">
      <PageHeader title="Ventas" subtitle="Registra ventas de productos y consulta el historial" />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { key: 'new', label: 'Ventas', icon: <ShoppingCart /> },
        { key: 'history', label: 'Historial de Ventas', icon: <CreditCard /> },
      ]} />
      {tab === 'new' ? <NewSale cart={cart} setCart={setCart} /> : <SalesHistory />}
    </div>
  )
}

/* ------------------------------ Nueva venta ------------------------------ */
function NewSale({ cart, setCart }: { cart: CartLine[]; setCart: (c: CartLine[]) => void }) {
  const notify = useNotify()
  const { data: cfg } = useSettings()
  const { data: products, reload } = useFetch<Product[]>('/api/products')
  const { data: students } = useFetch<StudentSummary[]>('/api/students')
  const [prodId, setProdId] = useState('')
  const [qty, setQty] = useState(1)
  const [amount, setAmount] = useState<number | ''>('')
  const [touched, setTouched] = useState(false)
  const [method, setMethod] = useState('')
  const [studentId, setStudentId] = useState('')
  const [notes, setNotes] = useState('')
  const [errAdd, setErrAdd] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const available = useMemo(() => (products ?? []).filter((p) => p.is_active && p.stock > 0).sort((a, b) => a.name.localeCompare(b.name, 'es')), [products])
  const sel = available.find((p) => p.id === prodId)
  const amountVal = touched ? amount : sel ? Math.round(sel.price * (qty || 0)) : ''
  const total = cart.reduce((s, l) => s + l.amount, 0)

  const add = () => {
    const q = Math.floor(qty)
    const fail = (t: string) => { setErrAdd(t); notify.error(t) }
    if (!sel) return fail('Selecciona un producto')
    if (!(q >= 1)) return fail('La cantidad debe ser al menos 1')
    const ya = cart.find((l) => l.product_id === sel.id)
    const tot = (ya?.quantity ?? 0) + q
    if (tot > sel.stock) return fail(`Stock insuficiente de "${sel.name}" (disponible: ${sel.stock})`)
    if (amountVal === '') return fail('Ingresa un monto válido')
    setErrAdd('')
    setCart(ya ? cart.map((l) => (l === ya ? { ...l, quantity: tot, amount: l.amount + Number(amountVal) } : l)) : [...cart, { product_id: sel.id, name: sel.name, quantity: q, amount: Number(amountVal) }])
    setProdId(''); setQty(1); setTouched(false); setAmount('')
  }

  const submit = async () => {
    setBusy(true); setErr('')
    try {
      const sale = await api.post<Sale>('/api/sales', {
        items: cart.map((l) => ({ product_id: l.product_id, quantity: l.quantity, amount: l.amount })),
        payment_method: method || cfg?.payment_methods[0], student_id: studentId || null, notes: notes.trim(),
      })
      notify.ok(`Venta N° ${sale.sale_number} registrada por ${money(sale.total)}`)
      setCart([]); setNotes(''); setStudentId(''); reload()
    } catch (e) { setErr(errMsg(e)) } finally { setBusy(false) }
  }

  return (
    <div className="card">
      <h2>Nueva venta</h2>
      <p className="sub">Selecciona el producto y la cantidad; el monto se calcula con el precio vigente y puedes editarlo</p>

      <div className="vsec v1">
        <h3><i>1</i> Producto vendido</h3>
        <div className="toolbar">
          <div style={{ flex: 3 }}>
            <Field label="Producto">
              <select value={prodId} onChange={(e) => { setProdId(e.target.value); setTouched(false) }}>
                <option value="">Seleccionar producto</option>
                {available.map((p) => <option key={p.id} value={p.id}>{p.name} — {money(p.price)} (stock {p.stock})</option>)}
              </select>
            </Field>
          </div>
          <div style={{ maxWidth: 120 }}><Field label="Cantidad"><input type="number" min={1} step={1} value={qty} onChange={(e) => { setQty(Number(e.target.value)); setTouched(false) }} /></Field></div>
          <div style={{ maxWidth: 160 }}><Field label="Monto"><MoneyInput placeholder="0" value={amountVal} onChange={(v) => { setAmount(v); setTouched(true) }} /></Field></div>
          <div className="fx"><button className="btn action" onClick={add} disabled={!available.length}><Plus /> Agregar</button></div>
        </div>
        <p className="err" style={{ fontSize: 13, fontWeight: 600 }}>{errAdd}</p>
      </div>

      <div className="vsec v2">
        <h3><i>2</i> Detalle de la venta</h3>
        {cart.length ? (
          <div className="tw" style={{ margin: '6px 0' }}>
            <table style={{ minWidth: 0 }}>
              <thead><tr><th>Producto</th><th className="r">Precio</th><th className="r">Cant.</th><th className="r">Subtotal</th><th style={{ width: '1%', paddingLeft: 0 }} /></tr></thead>
              <tbody>
                {cart.map((l, i) => (
                  <tr key={l.product_id}>
                    <td>{l.name}</td><td className="r">{money(l.amount / l.quantity)}</td><td className="r">{l.quantity}</td><td className="r b">{money(l.amount)}</td>
                    <td className="c" style={{ width: '1%', paddingLeft: 0 }}><button className="btn ghost sm ico" title="Quitar" onClick={() => setCart(cart.filter((_, j) => j !== i))}><X /></button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="tot-row"><td colSpan={3} className="b" style={{ fontSize: 16 }}>Total</td><td className="r b" style={{ fontSize: 18 }}>{money(total)}</td><td style={{ width: '1%', paddingLeft: 0 }} /></tr></tfoot>
            </table>
          </div>
        ) : <div className="empty" style={{ padding: 14 }}>Aún no hay productos en la venta</div>}
      </div>

      <div className="vsec v3">
        <h3><i>3</i> Pago y cliente</h3>
        <div className="fg fg3">
          <Field label="Tipo de pago"><select value={method || cfg?.payment_methods[0] || ''} onChange={(e) => setMethod(e.target.value)}>{opts(cfg?.payment_methods ?? [])}</select></Field>
          <Field label="Alumno (opcional)">
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">Cliente general</option>
              {(students ?? []).map((a) => <option key={a.id} value={a.id}>{a.full_name} — {a.rut}</option>)}
            </select>
          </Field>
          <Field label="Comentario"><input maxLength={150} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        </div>
        <p className="err">{err}</p>
        <div className="row-actions" style={{ margin: '18px 0 0' }}>
          <button className="btn primary" onClick={submit} disabled={busy || !cart.length}><ShoppingCart /> Realizar Pago</button>
          <button className="btn secondary" onClick={() => setCart([])}>Vaciar</button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------ Historial ------------------------------ */
function SalesHistory() {
  const notify = useNotify()
  const confirm = useConfirm()
  const { data: cfg } = useSettings()
  const [f, setF] = useState({ from: '', to: '', payment_method: '', status: '' })
  const { data, loading, reload } = useFetch<Sale[]>(`/api/sales${qs(f)}`)
  const [detail, setDetail] = useState<Sale | null>(null)
  const list = data ?? []
  const ok = list.filter((v) => v.status === 'completed')

  const voidSale = async (v: Sale) => {
    if (!(await confirm({ title: 'Anular venta', danger: true, okLabel: 'Anular venta', message: <>Se anulará la venta <b>N° {v.sale_number}</b> ({money(v.total)}) y el stock de sus productos será devuelto al inventario.</> }))) return
    try { await api.post(`/api/sales/${v.id}/void`); notify.ok('Venta anulada'); reload() } catch (e) { notify.fail(e) }
  }

  return (
    <div className="card">
      <h2>Historial de ventas</h2>
      <p className="sub">Filtra por fecha, tipo de pago o estado</p>
      <div className="toolbar">
        <Field label="Desde"><input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field>
        <Field label="Hasta"><input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></Field>
        <Field label="Tipo de pago"><select value={f.payment_method} onChange={(e) => setF({ ...f, payment_method: e.target.value })}><option value="">Todos</option>{opts(cfg?.payment_methods ?? [])}</select></Field>
        <Field label="Estado"><select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">Todos</option>{opts([{ value: 'completed', label: 'Completada' }, { value: 'voided', label: 'Anulada' }])}</select></Field>
      </div>
      <DataGrid<Sale> rows={list} pageSize={8} resetKey={JSON.stringify(f)} empty={loading ? 'Cargando…' : 'No hay ventas registradas'} cols={[
        { h: 'N°', cell: (v) => `#${v.sale_number}` },
        { h: 'Fecha', cell: (v) => <>{fmtDate(v.sold_on)} <span className="muted sm">{v.sold_time?.slice(0, 5)}</span></> },
        { h: 'Detalle', cell: (v) => v.items.map((i) => `${i.quantity}× ${i.product_name}`).join(', ') },
        { h: 'Alumno', cell: (v) => v.student_name || <span className="muted">General</span> },
        { h: 'Pago', cell: (v) => v.payment_method },
        { h: 'Total', cls: 'r', cell: (v) => <b>{money(v.total)}</b> },
        { h: 'Estado', cell: (v) => <Pill tone={v.status === 'completed' ? 'ok' : 'bad'}>{SALE_STATUS_LABEL[v.status]}</Pill> },
        { h: 'Acciones', cls: 'c', cell: (v) => (
          <div className="acts">
            <button className="btn secondary sm ico" title="Ver detalle" onClick={() => setDetail(v)}><Eye /></button>
            {v.status === 'completed' && <button className="btn secondary sm ico" style={{ color: 'hsl(var(--destructive))' }} title="Anular venta" onClick={() => voidSale(v)}><Ban /></button>}
          </div>
        ) },
      ]} />
      <p className="muted sm" style={{ marginTop: 8 }}>
        {ok.length} venta(s) completada(s) · Total <b>{money(ok.reduce((s, v) => s + v.total, 0))}</b> · Utilidad <b>{money(ok.reduce((s, v) => s + v.total - v.cost_total, 0))}</b>
      </p>

      {detail && (
        <GymModal title={`Venta N° ${detail.sale_number}`} onClose={() => setDetail(null)} footer={<button className="btn secondary" onClick={() => setDetail(null)}>Cerrar</button>}>
          <div className="gym">
            <div className="kv" style={{ marginBottom: 12 }}>
              <div><span>Fecha</span><b>{fmtDate(detail.sold_on)} {detail.sold_time?.slice(0, 5)}</b></div>
              <div><span>Tipo de pago</span><b>{detail.payment_method}</b></div>
              <div><span>Alumno</span><b>{detail.student_name || 'Cliente general'}</b></div>
              <div><span>Estado</span><b>{SALE_STATUS_LABEL[detail.status]}</b></div>
            </div>
            <div className="tw"><table style={{ minWidth: 0 }}>
              <thead><tr><th>Producto</th><th className="r">Cant.</th><th className="r">Precio</th><th className="r">Subtotal</th></tr></thead>
              <tbody>{detail.items.map((i) => <tr key={i.id}><td>{i.product_name}</td><td className="r">{i.quantity}</td><td className="r">{money(i.unit_price)}</td><td className="r">{money(i.subtotal)}</td></tr>)}</tbody>
            </table></div>
            <div className="cart-total"><span>Total</span><span>{money(detail.total)}</span></div>
            {detail.notes && <p className="muted sm">Comentario: {detail.notes}</p>}
          </div>
        </GymModal>
      )}
    </div>
  )
}
