import type { Metadata } from 'next'
import DashboardPage from '@/features/dashboard/DashboardPage'

export const metadata: Metadata = { title: 'Paneles' }
export default function Page() { return <DashboardPage /> }
