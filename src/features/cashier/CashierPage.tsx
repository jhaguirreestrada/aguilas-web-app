'use client'

import { useState } from 'react'
import { Banknote, CreditCard, FileClock, History, ReceiptText, ShoppingCart } from 'lucide-react'
import { useFetch } from '@/hooks/useFetch'
import { PageHeader, Tabs } from '@/components/gym/ui'
import StudentPayments from './StudentPayments'
import NewSale, { type CartLine } from './NewSale'
import { PendingSales, SalesHistory } from './SalesLists'
import CashClosingTab from './CashClosingTab'
import type { Sale } from '@/shared/types'

type Tab = 'students' | 'new' | 'pending' | 'history' | 'closing'

export default function CashierPage() {
  const [tab, setTab] = useState<Tab>('students')
  // el carro vive en la página: se conserva al cambiar de pestaña
  const [cart, setCart] = useState<CartLine[]>([])
  // sube cada vez que cambia algo de caja, para que el cierre se recargue
  const [stamp, setStamp] = useState(0)
  const { data: pending, loading, reload } = useFetch<Sale[]>('/api/sales?status=pending')
  const changed = () => { reload(); setStamp((n) => n + 1) }

  return (
    <div className="gym">
      <PageHeader title="Caja y Ventas" subtitle="Pagos de alumnos, venta de productos y cierre diario de caja" />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { key: 'students', label: 'Pago alumnos', icon: <CreditCard /> },
        { key: 'new', label: 'Nueva venta', icon: <ShoppingCart /> },
        { key: 'pending', label: `Por cobrar (${pending?.length ?? 0})`, icon: <FileClock /> },
        { key: 'history', label: 'Historial', icon: <History /> },
        { key: 'closing', label: 'Cierre de caja', icon: <ReceiptText /> },
      ]} />
      {tab === 'students' && <StudentPayments />}
      {tab === 'new' && <NewSale cart={cart} setCart={setCart} onSaved={changed} />}
      {tab === 'pending' && <PendingSales sales={pending ?? []} loading={loading} onChanged={changed} />}
      {tab === 'history' && <SalesHistory onChanged={changed} />}
      {tab === 'closing' && <CashClosingTab refreshKey={stamp} />}
    </div>
  )
}
