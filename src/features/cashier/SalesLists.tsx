'use client'

import { useState } from 'react'
import { Ban, Banknote, Eye, Printer } from 'lucide-react'
import { api, errMsg, qs } from '@/lib/api-client'
import { useFetch } from '@/hooks/useFetch'
import { useSettings } from '@/hooks/useSettings'
import { useNotify } from '@/hooks/useNotify'
import { useConfirm } from '@/components/providers/ConfirmProvider'
import { GymModal } from '@/components/gym/GymModal'
import { DataGrid, Field, Pill, opts, type Col } from '@/components/gym/ui'
import { fmtDate, money } from '@/shared/format'
import { SALE_STATUS_LABEL, SALE_STATUS_TONE } from '@/shared/labels'
import { printSaleReceipt } from './print'
import type { Sale } from '@/shared/types'

const detailText = (v: Sale) => v.items.map((i) => `${i.quantity}× ${i.product_name}`).join(', ')

/* ------------------------------ Acciones compartidas ------------------------------ */
function useSaleActions(onChanged: () => void) {
  const notify = useNotify()
  const confirm = useConfirm()
  const [detail, setDetail] = useState<Sale | null>(null)
  const [collecting, setCollecting] = useState<Sale | null>(null)

  const voidSale = async (v: Sale) => {
    const msg = v.status === 'pending'
      ? <>Se anulará la venta <b>N° {v.sale_number}</b> ({money(v.total)}) que está por cobrar y el stock será devuelto al inventario.</>
      : <>Se anulará la venta <b>N° {v.sale_number}</b> ({money(v.total)}) y el stock de sus productos será devuelto al inventario.</>
    if (!(await confirm({ title: 'Anular venta', danger: true, okLabel: 'Anular venta', message: msg }))) return
    try { await api.post(`/api/sales/${v.id}/void`); notify.ok('Venta anulada'); onChanged() } catch (e) { notify.fail(e) }
  }

  const modals = (
    <>
      {detail && <SaleDetailModal sale={detail} onClose={() => setDetail(null)} />}
      {collecting && <CollectModal sale={collecting} onClose={() => setCollecting(null)} onDone={onChanged} />}
    </>
  )
  return { setDetail, setCollecting, voidSale, modals }
}

/* ------------------------------ Por cobrar ------------------------------ */
export function PendingSales({ sales, loading, onChanged }: { sales: Sale[]; loading: boolean; onChanged: () => void }) {
  const { setDetail, setCollecting, voidSale, modals } = useSaleActions(onChanged)
  const total = sales.reduce((s, v) => s + v.total, 0)
  return (
    <div className="card">
      <h2>Cobros pendientes</h2>
      <p className="sub">Ventas registradas que aún no se pagan · total <b>{money(total)}</b></p>
      <DataGrid<Sale> rows={sales} pageSize={10} empty={loading ? 'Cargando…' : 'No hay cobros pendientes ✔'} cols={[
        { h: 'N°', cell: (v) => `#${v.sale_number}` },
        { h: 'Fecha', cell: (v) => fmtDate(v.sold_on) },
        { h: 'Alumno / Cliente', cell: (v) => v.student_name || <span className="muted">General</span> },
        { h: 'Detalle', cell: detailText },
        { h: 'Total', cls: 'r', cell: (v) => <b>{money(v.total)}</b> },
        { h: 'Acciones', cell: (v) => (
          <div className="acts start">
            <button className="btn secondary sm ico" title="Ver detalle" onClick={() => setDetail(v)}><Eye /></button>
            <button className="btn secondary sm ico" title="Anular venta" onClick={() => voidSale(v)}><Ban /></button>
            <button className="btn primary sm" onClick={() => setCollecting(v)}><Banknote /> Cobrar</button>
          </div>
        ) },
      ]} />
      {modals}
    </div>
  )
}

/* ------------------------------ Historial ------------------------------ */
export function SalesHistory({ onChanged }: { onChanged: () => void }) {
  const { data: cfg } = useSettings()
  const [f, setF] = useState({ from: '', to: '', payment_method: '', status: '' })
  const { data, loading, reload } = useFetch<Sale[]>(`/api/sales${qs(f)}`)
  const { setDetail, setCollecting, voidSale, modals } = useSaleActions(() => { reload(); onChanged() })
  const list = data ?? []
  const ok = list.filter((v) => v.status === 'completed')
  const pend = list.filter((v) => v.status === 'pending')

  const cols: Col<Sale>[] = [
    { h: 'N°', cell: (v) => `#${v.sale_number}` },
    { h: 'Fecha', cell: (v) => <>{fmtDate(v.sold_on)} <span className="muted sm">{v.sold_time?.slice(0, 5)}</span></> },
    { h: 'Detalle', cell: detailText },
    { h: 'Alumno / Cliente', cell: (v) => v.student_name || <span className="muted">General</span> },
    { h: 'Pago', cell: (v) => v.payment_method || <span className="muted">—</span> },
    { h: 'Total', cls: 'r', cell: (v) => <b>{money(v.total)}</b> },
    { h: 'Estado', cell: (v) => <Pill tone={SALE_STATUS_TONE[v.status]}>{SALE_STATUS_LABEL[v.status]}</Pill> },
    { h: 'Acciones', cell: (v) => (
      <div className="acts start">
        <button className="btn secondary sm ico" title="Ver detalle" onClick={() => setDetail(v)}><Eye /></button>
        {v.status !== 'voided' ? <button className="btn secondary sm ico" title="Anular venta" onClick={() => voidSale(v)}><Ban /></button> : <span className="btn sm ico" style={{ visibility: 'hidden' }} aria-hidden><Ban /></span>}
        {v.status === 'pending' && <button className="btn primary sm" onClick={() => setCollecting(v)}><Banknote /> Cobrar</button>}
      </div>
    ) },
  ]

  return (
    <div className="card">
      <h2>Historial de ventas</h2>
      <p className="sub">Filtra por fecha, tipo de pago o estado</p>
      <div className="toolbar">
        <Field label="Desde"><input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field>
        <Field label="Hasta"><input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></Field>
        <Field label="Tipo de pago"><select value={f.payment_method} onChange={(e) => setF({ ...f, payment_method: e.target.value })}><option value="">Todos</option>{opts(cfg?.payment_methods ?? [])}</select></Field>
        <Field label="Estado">
          <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
            <option value="">Todos</option>
            {opts([{ value: 'completed', label: 'Pagada' }, { value: 'pending', label: 'Por cobrar' }, { value: 'voided', label: 'Anulada' }])}
          </select>
        </Field>
      </div>
      <DataGrid<Sale> rows={list} pageSize={8} resetKey={JSON.stringify(f)} empty={loading ? 'Cargando…' : 'No hay ventas registradas'} cols={cols} />
      <p className="muted sm" style={{ marginTop: 8 }}>
        {ok.length} venta(s) pagada(s) · Total <b>{money(ok.reduce((s, v) => s + v.total, 0))}</b> · Utilidad <b>{money(ok.reduce((s, v) => s + v.total - v.cost_total, 0))}</b>
        {pend.length ? <> · {pend.length} por cobrar ({money(pend.reduce((s, v) => s + v.total, 0))})</> : null}
      </p>
      {modals}
    </div>
  )
}

/* ------------------------------ Modales ------------------------------ */
function SaleDetailModal({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const { data: cfg } = useSettings()
  return (
    <GymModal title={`Venta N° ${sale.sale_number}`} onClose={onClose} footer={
      <>
        <button className="btn secondary" onClick={onClose}>Cerrar</button>
        <button className="btn primary" onClick={() => printSaleReceipt(sale, cfg?.gym_name ?? '')}><Printer /> Imprimir comprobante</button>
      </>
    }>
      <div className="gym">
        <div className="kv" style={{ marginBottom: 12 }}>
          <div><span>Fecha</span><b>{fmtDate(sale.sold_on)} {sale.sold_time?.slice(0, 5)}</b></div>
          <div><span>Tipo de pago</span><b>{sale.payment_method || '—'}</b></div>
          <div><span>Alumno / Cliente</span><b>{sale.student_name || 'Cliente general'}</b></div>
          <div><span>Estado</span><b>{SALE_STATUS_LABEL[sale.status]}</b></div>
          {sale.paid_on && <div><span>Fecha de cobro</span><b>{fmtDate(sale.paid_on)}</b></div>}
        </div>
        <div className="tw"><table style={{ minWidth: 0 }}>
          <thead><tr><th>Producto</th><th className="r">Cant.</th><th className="r">Precio</th><th className="r">Subtotal</th></tr></thead>
          <tbody>{sale.items.map((i) => <tr key={i.id}><td>{i.product_name}</td><td className="r">{i.quantity}</td><td className="r">{money(i.unit_price)}</td><td className="r">{money(i.subtotal)}</td></tr>)}</tbody>
        </table></div>
        <div className="cart-total"><span>Total</span><span>{money(sale.total)}</span></div>
        {sale.notes && <p className="muted sm">Comentario: {sale.notes}</p>}
      </div>
    </GymModal>
  )
}

/** Cobra una venta que quedó por cobrar: se elige el medio de pago y queda con fecha de cobro de hoy. */
function CollectModal({ sale, onClose, onDone }: { sale: Sale; onClose: () => void; onDone: () => void }) {
  const notify = useNotify()
  const { data: cfg } = useSettings()
  const [method, setMethod] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const methodVal = method || cfg?.payment_methods[0] || ''

  const submit = async () => {
    setBusy(true); setErr('')
    try {
      await api.post(`/api/sales/${sale.id}/collect`, { payment_method: methodVal })
      notify.ok(`Pago de ${money(sale.total)} registrado`)
      onDone(); onClose()
    } catch (e) { setErr(errMsg(e)); setBusy(false) }
  }

  return (
    <GymModal title={`Cobrar venta N° ${sale.sale_number}`} size="mid" onClose={onClose}
      footer={<><button className="btn secondary" onClick={onClose}>Cancelar</button><button className="btn primary" onClick={submit} disabled={busy || !cfg}>Registrar pago</button></>}>
      <div className="gym">
        <div className="hl" style={{ marginBottom: 12 }}>
          <div className="muted sm">{detailText(sale)}</div>
          <div className="cart-total" style={{ padding: '6px 0 0' }}><span>Total</span><span>{money(sale.total)}</span></div>
        </div>
        <Field label="Medio de pago"><select value={methodVal} onChange={(e) => setMethod(e.target.value)}>{opts(cfg?.payment_methods ?? [])}</select></Field>
        <p className="err">{err}</p>
      </div>
    </GymModal>
  )
}
