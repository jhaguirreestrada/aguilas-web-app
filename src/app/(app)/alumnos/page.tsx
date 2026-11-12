import type { Metadata } from 'next'
import StudentsPage from '@/features/students/StudentsPage'

export const metadata: Metadata = { title: 'Alumnos' }
export default function Page() { return <StudentsPage /> }
