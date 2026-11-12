import type { Metadata } from 'next'
import { AuditLog } from '@/features/users/AuditLog'

export const metadata: Metadata = { title: 'Log de Auditoría' }
export default function Page() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Log de Auditoría</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Todo lo que ocurre en el sistema, con el antes y el después de cada cambio.</p>
      </div>
      <AuditLog />
    </div>
  )
}
