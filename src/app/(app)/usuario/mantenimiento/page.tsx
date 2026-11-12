import type { Metadata } from 'next'
import { UserMaintenance } from '@/features/users/UserMaintenance'

export const metadata: Metadata = { title: 'Mantenimiento de Usuario' }
export default function Page() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Mantenimiento de Usuario</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Administra quién accede al sistema.</p>
      </div>
      <UserMaintenance />
    </div>
  )
}
