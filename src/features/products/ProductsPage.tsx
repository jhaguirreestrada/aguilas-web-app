'use client'

import { useMemo, useState } from 'react'
import { Package, Pencil, Plus, Trash2 } from 'lucide-react'
import { api, errMsg } from '@/lib/api-client'
import { useFetch } from '@/hooks/useFetch'
import { useSettings } from '@/hooks/useSettings'
import { useNotify } from '@/hooks/useNotify'
import { useConfirm } from '@/components/providers/ConfirmProvider'
import { GymModal } from '@/components/gym/GymModal'
import { DataGrid, Field, Kpi, MoneyInput, PageHeader, Pill, opts } from '@/components/gym/ui'
import { fmtDate, money, norm, num } from '@/shared/format'
import { MOVEMENT_LABEL } from '@/shared/labels'
import type { InventoryMovement, Product } from '@/shared/types'

const stockState = (p: Product) =>
  !p.is_active ? { l: 'Inactivo', c: '' as const } : p.stock <= 0 ? { l: 'Agotado', c: 'bad' as const } : p.stock <= p.min_stock ? { l: 'Stock bajo', c: 'warn' as const } : { l: 'Disponible', c: 'ok' as const }

export default function ProductsPage() {
  const notify = useNotify()
  const confirm = useConfirm()
  const { data: cfg } = useSettings()
  const { data, loading, reload } = useFetch<Product[]>('/api/products')
  const [f, setF] = useState({ q: '', cat: '', stock: '' })
  const [editing, setEditing] = useState<Product | null | undefined>(undefined)
  const [stockFor, setStockFor] = useState<Product | null>(null)
  const [initialFor, setInitialFor] = useState<Product | null>(null)

  const all = data ?? []
  const rows = useMemo(() => {
    const q = norm(f.q)
    const want = ({ ok: 'Disponible', low: 'Stock bajo', out: 'Agotado', off: 'Inactivo' } as Record<string, string>)[f.stock]
    return all.filter((p) => (!q || norm(`${p.name} ${p.code}`).includes(q)) && (!f.cat || p.category === f.cat) && (!want || stockState(p).l === want))
  }, [all, f])

  const remove = async (p: Product) => {
    if (!(await confirm({ title: 'Eliminar producto', danger: true, okLabel: 'Eliminar', message: <>Se eliminará <b>{p.name}</b> y su historial de movimientos.</> }))) return
    try { await api.del(`/api/products/${p.id}`); notify.ok('Producto eliminado'); reload() } catch (e) { notify.fail(e) }
  }

  return (
    <div className="gym">
      <PageHeader title="Productos" subtitle="Catálogo e inventario de artículos de boxeo, bebidas y snacks" actions={<button className="btn primary" onClick={() => setEditing(null)}><Plus /> Nuevo producto</button>} />
      <div className="kpis">
        <Kpi label="Productos activos" value={all.filter((p) => p.is_active).length} />
        <Kpi label="Unidades en stock" value={num(all.reduce((s, p) => s + p.stock, 0))} />
        <Kpi label="Valor inventario (costo)" value={money(all.reduce((s, p) => s + p.stock * p.cost, 0))} />
        <Kpi label="Stock bajo / agotado" value={all.filter((p) => p.is_active && p.stock <= p.min_stock).length} />
      </div>
      <div className="card">
        <div className="toolbar">
          <Field label="Código / Nombre" className=""><input placeholder="Buscar producto" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} /></Field>
          <Field label="Categoría"><select value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })}><option value="">Todas</option>{opts(cfg?.product_categories ?? [])}</select></Field>
          <Field label="Estado de stock">
            <select value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })}>
              <option value="">Todos</option>{opts([{ value: 'ok', label: 'Disponible' }, { value: 'low', label: 'Stock bajo' }, { value: 'out', label: 'Agotado' }, { value: 'off', label: 'Inactivo' }])}
            </select>
          </Field>
        </div>
        <DataGrid<Product> rows={rows} pageSize={10} resetKey={JSON.stringify(f)} empty={loading ? 'Cargando…' : 'No hay productos que coincidan'} cols={[
          { h: 'Código', cell: (p) => p.code || '—' },
          { h: 'Producto', cell: (p) => <b>{p.name}</b> },
          { h: 'Categoría', cell: (p) => p.category },
          { h: 'Precio', cls: 'r', cell: (p) => money(p.price) },
          { h: 'Costo', cls: 'r', cell: (p) => money(p.cost) },
          { h: 'Margen', cls: 'r', cell: (p) => (p.price ? `${(((p.price - p.cost) / p.price) * 100).toFixed(0)}%` : '—') },
          { h: 'Stock', cls: 'r', cell: (p) => <><b>{p.stock}</b> <span className="muted sm">/ mín. {p.min_stock}</span></> },
          { h: 'Estado', cell: (p) => { const s = stockState(p); return <Pill tone={s.c}>{s.l}</Pill> } },
          { h: 'Acciones', cls: 'c', cell: (p) => (
            <div className="acts">
              <button className="btn secondary sm ico" title="Ajustar stock" onClick={() => setStockFor(p)}><Package /></button>
              <button className="btn secondary sm ico" title="Editar" onClick={() => setEditing(p)}><Pencil /></button>
              <button className="btn secondary sm ico" style={{ color: 'hsl(var(--destructive))' }} title="Eliminar" onClick={() => remove(p)}><Trash2 /></button>
            </div>
          ) },
        ]} />
      </div>

      {editing !== undefined && (
        <ProductModal
          product={editing} categories={cfg?.product_categories ?? []} onClose={() => setEditing(undefined)}
          onSaved={(created) => { reload(); if (created) setInitialFor(created) }}
        />
      )}
      {stockFor && <StockModal product={stockFor} onClose={() => setStockFor(null)} onChanged={reload} />}
      {initialFor && <PurchaseModal title="Stock inicial" product={initialFor} onClose={() => setInitialFor(null)} onDone={reload} />}
    </div>
  )
}

/* ------------------------------ Producto ------------------------------ */
function ProductModal({ product, categories, onClose, onSaved }: { product: Product | null; categories: string[]; onClose: () => void; onSaved: (created?: Product) => void }) {
  const notify = useNotify()
  const [d, setD] = useState({
    code: product?.code ?? '', category: product?.category ?? categories[0] ?? '', name: product?.name ?? '',
    price: (product?.price ?? '') as number | '', cost: (product?.cost ?? '') as number | '', stock: product?.stock ?? 0,
    min_stock: product?.min_stock ?? 0, is_active: product?.is_active ?? true,
  })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (!d.name.trim()) return setErr('El nombre es obligatorio')
    if (d.price === '') return setErr('Ingresa un precio válido')
    setBusy(true)
    const body = {
      code: d.code.trim(), name: d.name.trim(), category: d.category, price: d.price, cost: d.cost === '' ? 0 : d.cost,
      min_stock: Number(d.min_stock) || 0, is_active: d.is_active, ...(product ? { stock: Number(d.stock) } : {}),
    }
    try {
      if (product) { await api.put(`/api/products/${product.id}`, body); notify.ok('Producto actualizado'); onSaved() }
      else { const created = await api.post<Product>('/api/products', body); notify.ok('Producto creado'); onSaved(created) }
      onClose()
    } catch (e) { setErr(errMsg(e)); setBusy(false) }
  }

  return (
    <GymModal title={product ? 'Editar producto' : 'Nuevo producto'} onClose={onClose} footer={<><button className="btn secondary" onClick={onClose}>Cancelar</button><button className="btn primary" onClick={save} disabled={busy}>Guardar</button></>}>
      <div className="gym">
        <div className="fg">
          <Field label="Código / SKU"><input maxLength={30} value={d.code} onChange={(e) => setD({ ...d, code: e.target.value })} /></Field>
          <Field label="Categoría *"><select value={d.category} onChange={(e) => setD({ ...d, category: e.target.value })}>{opts(categories)}</select></Field>
          <Field label="Nombre *" className="w"><input maxLength={100} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></Field>
          <Field label="Precio de venta (CLP) *"><MoneyInput value={d.price} onChange={(v) => setD({ ...d, price: v })} /></Field>
          <Field label="Costo (CLP)"><MoneyInput value={d.cost} onChange={(v) => setD({ ...d, cost: v })} /></Field>
          {product && <Field label="Stock actual"><input type="number" min={0} step={1} value={d.stock} onChange={(e) => setD({ ...d, stock: Number(e.target.value) })} /></Field>}
          <Field label="Stock mínimo (alerta)"><input type="number" min={0} step={1} value={d.min_stock} onChange={(e) => setD({ ...d, min_stock: Number(e.target.value) })} /></Field>
          <div className="w"><label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={d.is_active} onChange={(e) => setD({ ...d, is_active: e.target.checked })} /> Producto activo (disponible para la venta)
          </label></div>
        </div>
        <p className="err">{err}</p>
      </div>
    </GymModal>
  )
}

/* ------------------------------ Compra / stock inicial ------------------------------ */
function PurchaseModal({ title, product, onClose, onDone }: { title: string; product: Product; onClose: () => void; onDone: () => void }) {
  const notify = useNotify()
  const [qty, setQty] = useState('')
  const [price, setPrice] = useState('')
  const [doc, setDoc] = useState('')
  const [com, setCom] = useState('')
  const [err, setErr] = useState('')

  const submit = async () => {
    const q = Number(qty)
    if (!(q > 0) || !Number.isInteger(q)) return setErr('Ingresa una cantidad entera mayor a 0')
    if (price === '' || Number(price) < 0) return setErr('Ingresa un precio de compra válido')
    try {
      await api.post(`/api/products/${product.id}/stock`, { type: 'in', movement_type: 'initial_stock', quantity: q, unit_cost: Number(price), document: doc.trim(), reason: com.trim() })
      notify.ok('Stock inicial registrado'); onDone(); onClose()
    } catch (e) { setErr(errMsg(e)) }
  }

  return (
    <GymModal title={title} onClose={onClose} footer={<><button className="btn secondary" onClick={onClose}>Omitir</button><button className="btn primary" onClick={submit}>Aceptar</button></>}>
      <div className="gym">
        <p className="muted sm" style={{ marginBottom: 12 }}><b style={{ color: 'hsl(var(--foreground))' }}>{product.name}</b></p>
        <div className="fg">
          <Field label="Cantidad *"><input type="number" min={1} step={1} value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
          <Field label="Precio de compra unitario (CLP) *"><input type="number" min={0} step={1} value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
          <Field label="Documento de compra (factura / boleta)" className="w"><input maxLength={50} value={doc} onChange={(e) => setDoc(e.target.value)} /></Field>
          <Field label="Comentario (opcional)" className="w"><input maxLength={200} value={com} onChange={(e) => setCom(e.target.value)} /></Field>
        </div>
        <p className="err">{err}</p>
      </div>
    </GymModal>
  )
}

/* ------------------------------ Ajustar stock ------------------------------ */
function StockModal({ product, onClose, onChanged }: { product: Product; onClose: () => void; onChanged: () => void }) {
  const notify = useNotify()
  const { data: moves, reload } = useFetch<InventoryMovement[]>(`/api/products/${product.id}/movements`)
  const [stock, setStock] = useState(product.stock)
  const [type, setType] = useState<'in' | 'out' | 'adjustment'>('in')
  const [qty, setQty] = useState('1')
  const [doc, setDoc] = useState('')
  const [unit, setUnit] = useState<number | ''>('')
  const [total, setTotal] = useState<number | ''>('')
  const [last, setLast] = useState<'u' | 't' | null>(null)
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')

  // costo por unidad <-> total: se recalcula según el último campo editado
  const recalc = (nextQty: string, u = unit, t = total, from = last) => {
    const q = Number(nextQty)
    if (from === 't') setUnit(t === '' || !(q > 0) ? '' : Math.round(t / q))
    else if (from === 'u') setTotal(u === '' || !(q > 0) ? '' : u * q)
  }

  const submit = async () => {
    const c = Number(qty)
    if (!(c >= 0) || (type !== 'adjustment' && c === 0)) return setErr('Ingresa una cantidad válida')
    const purchase = type === 'in' && (unit !== '' || total !== '')
    try {
      const updated = await api.post<Product>(`/api/products/${product.id}/stock`, {
        type, quantity: c, reason: reason.trim(), document: type === 'in' ? doc.trim() : '',
        ...(purchase ? (unit !== '' ? { unit_cost: unit } : { total_cost: total }) : {}),
      })
      setStock(updated.stock); setErr(''); setUnit(''); setTotal(''); setDoc(''); setLast(null)
      notify.ok(purchase && updated.cost !== product.cost ? `Stock actualizado · costo del producto: ${money(updated.cost)}` : 'Stock actualizado')
      reload(); onChanged()
    } catch (e) { setErr(errMsg(e)) }
  }

  return (
    <GymModal title="Ajustar stock" size="lg" onClose={onClose} footer={<button className="btn secondary" onClick={onClose}>Cerrar</button>}>
      <div className="gym">
        <p className="muted sm" style={{ marginBottom: 12 }}><b style={{ color: 'hsl(var(--foreground))' }}>{product.name}</b> · Stock actual: <b style={{ color: 'hsl(var(--foreground))' }}>{stock}</b></p>
        <div className="fg fg3">
          <Field label="Tipo de movimiento">
            <select value={type} onChange={(e) => { setType(e.target.value as typeof type); if (e.target.value !== 'in') { setUnit(''); setTotal(''); setDoc(''); setLast(null) } }}>
              {opts([{ value: 'in', label: 'Entrada (compra / reposición)' }, { value: 'out', label: 'Salida (merma / consumo)' }, { value: 'adjustment', label: 'Ajuste a cantidad exacta' }])}
            </select>
          </Field>
          <Field label="Cantidad"><input type="number" min={0} step={1} value={qty} onChange={(e) => { setQty(e.target.value); recalc(e.target.value) }} /></Field>
          {type === 'in' && <Field label="Documento de compra"><input maxLength={50} placeholder="Factura / boleta (opcional)" value={doc} onChange={(e) => setDoc(e.target.value)} /></Field>}
        </div>
        {type === 'in' && (
          <>
            <div className="fg" style={{ marginTop: 12 }}>
              <Field label="Precio costo por unidad (CLP, opcional)"><MoneyInput placeholder="0" value={unit} onChange={(v) => { setUnit(v); setLast('u'); recalc(qty, v, total, 'u') }} /></Field>
              <Field label="Precio total de la compra (CLP, opcional)"><MoneyInput placeholder="0" value={total} onChange={(v) => { setTotal(v); setLast('t'); recalc(qty, unit, v, 't') }} /></Field>
            </div>
            <p className="muted sm" style={{ marginTop: 6 }}>Si ingresas el total, el costo por unidad se calcula con la cantidad. El costo del producto se actualiza si cambia, y la compra suma a los egresos «Productos» del mes.</p>
          </>
        )}
        <Field label="Motivo" className=""><div style={{ marginTop: 12 }}><input maxLength={150} placeholder="Opcional" value={reason} onChange={(e) => setReason(e.target.value)} /></div></Field>
        <p className="err">{err}</p>
        <div className="row-actions" style={{ margin: '10px 0 0' }}><button className="btn primary" onClick={submit}>Registrar movimiento</button></div>
        <div className="sect-title">Movimientos recientes</div>
        <DataGrid<InventoryMovement> rows={moves ?? []} pageSize={5} empty="Sin movimientos" cols={[
          { h: 'Fecha', cell: (r) => fmtDate(r.moved_on) },
          { h: 'Tipo', cell: (r) => MOVEMENT_LABEL[r.movement_type] },
          { h: 'Cantidad', cls: 'r', cell: (r) => <b style={{ color: `hsl(var(--${r.quantity >= 0 ? 'success' : 'destructive'}))` }}>{r.quantity > 0 ? '+' : ''}{r.quantity}</b> },
          { h: 'Stock resultante', cls: 'r', cell: (r) => r.resulting_stock },
          { h: 'P. compra', cls: 'r', cell: (r) => (r.purchase_price != null ? money(r.purchase_price) : '—') },
          { h: 'Documento', cell: (r) => r.document || '—' },
          { h: 'Motivo / comentario', cell: (r) => r.reason || '—' },
        ]} />
      </div>
    </GymModal>
  )
}

