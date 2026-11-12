import type { Metadata } from 'next'
import ActivitiesPage from '@/features/activities/ActivitiesPage'

export const metadata: Metadata = { title: 'Planificación' }
export default function Page() { return <ActivitiesPage /> }
