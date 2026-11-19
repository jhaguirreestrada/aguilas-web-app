import { fmtDate, money } from '@/shared/format'
import { SALE_STATUS_LABEL } from '@/shared/labels'
import type { Sale } from '@/shared/types'

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** Imprime un documento HTML desde un iframe oculto (no depende de ventanas emergentes). */
export function printHtml(title: string, html: string) {
  const f = document.createElement('iframe')
  f.setAttribute('aria-hidden', 'true')
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(f)
  const doc = f.contentDocument!
  doc.open()
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    @page{margin:14mm}
    body{font:13px system-ui,-apple-system,sans-serif;color:#111;margin:0}
    .doc{max-width:560px;margin:0 auto}
    .head{text-align:center;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:14px}
    .head b{display:block;font-size:18px;letter-spacing:.04em}.head span{color:#555;font-size:12px}
    h1{font-size:15px;margin:0 0 2px}.sub{color:#555;margin:0 0 14px}
    .kv{display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;margin-bottom:14px}
    .kv span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#666;font-weight:700}
    table{width:100%;border-collapse:collapse}th,td{padding:6px 4px;border-bottom:1px solid #ddd;text-align:left}
    th{font-size:10px;text-transform:uppercase;color:#555}.n{text-align:right}
    .tot{display:flex;justify-content:space-between;font-size:17px;font-weight:800;padding:12px 4px;border-top:2px solid #111;margin-top:6px}
    .tag{display:inline-block;border:1px solid #111;padding:1px 8px;border-radius:99px;font-size:11px;font-weight:700}
    .foot{text-align:center;color:#555;font-size:11px;margin-top:22px}
  </style></head><body>${html}</body></html>`)
  doc.close()
  const win = f.contentWindow!
  const done = () => setTimeout(() => f.remove(), 1000)
  win.onafterprint = done
  setTimeout(() => { win.focus(); win.print(); setTimeout(done, 60_000) }, 150)
}

/** Comprobante de una venta de productos. */
export function printSaleReceipt(sale: Sale, gymName: string) {
  const rows = sale.items.map((i) => `<tr><td>${esc(i.product_name)}</td><td class="n">${i.quantity}</td><td class="n">${money(i.unit_price)}</td><td class="n">${money(i.subtotal)}</td></tr>`).join('')
  const state = SALE_STATUS_LABEL[sale.status]
  printHtml(`Comprobante venta ${sale.sale_number}`, `<div class="doc">
    <div class="head"><b>${esc(gymName || 'Gimnasio')}</b><span>Comprobante de venta</span></div>
    <h1>VENTA N° ${sale.sale_number}</h1>
    <p class="sub">Emitido el ${fmtDate(sale.sold_on)} ${esc(sale.sold_time?.slice(0, 5) ?? '')}</p>
    <div class="kv">
      <div><span>Alumno / Cliente</span>${esc(sale.student_name || 'Cliente general')}</div>
      <div><span>Estado</span><b class="tag">${esc(state)}</b></div>
      <div><span>Medio de pago</span>${esc(sale.payment_method || '—')}</div>
      <div><span>Fecha de pago</span>${sale.paid_on ? fmtDate(sale.paid_on) : 'Pendiente de pago'}</div>
    </div>
    <table><thead><tr><th>Producto</th><th class="n">Cant.</th><th class="n">Precio</th><th class="n">Subtotal</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="tot"><span>TOTAL</span><span>${money(sale.total)}</span></div>
    ${sale.notes ? `<p class="sub">Comentario: ${esc(sale.notes)}</p>` : ''}
    <p class="foot">Gracias por su compra</p></div>`)
}
