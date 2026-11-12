'use client'

import { useState } from 'react'
import { Lock } from 'lucide-react'
import { FormModal } from '@/components/ui/FormModal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { api, errMsg } from '@/lib/api-client'
import { useNotify } from '@/hooks/useNotify'

/** Cambio de contraseña del usuario autenticado. */
export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const notify = useNotify()
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [rep, setRep] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const close = () => { setCur(''); setNext(''); setRep(''); setErr(''); onClose() }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (next.length < 8) return setErr('La nueva contraseña debe tener al menos 8 caracteres')
    if (next !== rep) return setErr('La confirmación no coincide')
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
        {err && <p className="text-xs text-destructive font-medium">{err}</p>}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={close}>Cancelar</Button>
          <Button type="submit" variant="primary" isLoading={busy}>Guardar</Button>
        </div>
      </form>
    </FormModal>
  )
}
