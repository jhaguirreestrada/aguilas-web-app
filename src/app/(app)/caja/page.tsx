import type { Metadata } from 'next'
import CashierPage from '@/features/cashier/CashierPage'

export const metadata: Metadata = { title: 'Caja y Ventas' }
export default function Page() { return <CashierPage /> }
