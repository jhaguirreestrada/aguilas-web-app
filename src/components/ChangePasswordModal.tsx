'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, Lock, XCircle } from 'lucide-react'
import { FormModal } from '@/components/ui/FormModal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { api, errMsg } from '@/lib/api-client'
import { useNotify } from '@/hooks/useNotify'
import { PASSWORD_CRITERIA } from '@/lib/password-policy'
import { cn } from '@/lib/utils'

/** Cambio de contraseña del usuario autenticado. */
export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const notify = useNotify()
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [rep, setRep] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const criteria = useMemo(() => [
    ...PASSWORD_CRITERIA.map((c) => ({ key: c.key, label: c.label, passed: c.test(next) })),
    { key: 'match', label: 'Coincidencia de claves', passed: next.length > 0 && next === rep },
  ], [next, rep])
  const allMet = criteria.every((c) => c.passed)

  const close = () => { setCur(''); setNext(''); setRep(''); setErr(''); onClose() }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cur) return setErr('Ingresa tu contraseña actual')
    if (!allMet) return setErr('La nueva contraseña no cumple los requisitos de seguridad')
    if (cur === next) return setErr('La nueva contraseña debe ser diferente a la actual')
    setBusy(true)
    try {
      await api.post('/api/auth/change-password', { current_password: cur, new_password: next })
      notify.ok('Contraseña actualizada')
      close()
    } catch (e2) {
      setErr(errMsg(e2))
    } finally {
      setBusy(false)
    }
  }

  return (
    <FormModal open={open} title="Cambiar contraseña" onClose={close}>
      <form onSubmit={submit} className="space-y-4 pb-4" noValidate>
        <Input label="Contraseña actual" icon={Lock} type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />
        <Input label="Nueva contraseña" icon={Lock} type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        <Input label="Repite la nueva contraseña" icon={Lock} type="password" value={rep} onChange={(e) => setRep(e.target.value)} autoComplete="new-password" />
        <div className="p-4 rounded-xl bg-background/80 border border-border space-y-2.5">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Requisitos Mínimos de Seguridad:</span>
          <div className="grid grid-cols-1 gap-2 text-xs">
            {criteria.map((c) => (
              <div key={c.key} className={cn('flex items-center gap-2 transition-colors', c.passed ? 'text-success font-semibold' : 'text-muted-foreground')}>
                {c.passed ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                <span>{c.label}</span>
              </div>
            ))}
          </div>
        </div>
        {err && <p className="text-xs text-destructive font-medium">{err}</p>}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={close}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={!allMet} isLoading={busy}>Guardar</Button>
        </div>
      </form>
    </FormModal>
  )
}
