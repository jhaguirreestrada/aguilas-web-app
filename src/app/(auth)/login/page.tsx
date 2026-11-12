'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Building2, KeyRound, Lock, ShieldCheck, User } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { brand } from '@/lib/brand'
import { api, ApiError } from '@/lib/api-client'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<{ title: string; text: string; tone: 'destructive' | 'warning' } | null>(
    params.get('expired') ? { title: 'Sesión finalizada', text: 'Tu sesión expiró o fue cerrada. Inicia sesión nuevamente.', tone: 'warning' } : null,
  )

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: typeof errors = {}
    if (!username.trim()) errs.username = 'El nombre de usuario es obligatorio.'
    else if (username.length > 40) errs.username = 'El usuario no puede exceder los 40 caracteres.'
    if (!password) errs.password = 'La contraseña es obligatoria.'
    setErrors(errs)
    if (Object.keys(errs).length) return

    setLoading(true)
    try {
      await api.post('/api/auth/login', { username, password })
      const next = params.get('next')
      router.push(next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard')
      router.refresh()
    } catch (err) {
      const e2 = err as ApiError
      setModal({
        title: e2.code === 'USER_INACTIVE' ? 'Usuario inactivo' : e2.code === 'RATE_LIMITED' ? 'Demasiados intentos' : 'Credenciales inválidas',
        text: e2.message,
        tone: 'destructive',
      })
      setLoading(false)
    }
  }

  return (
    <>
      <div className="w-full max-w-5xl bg-card/80 backdrop-blur-xl border border-border/80 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px] animate-in fade-in duration-300">
        <div className="lg:col-span-6 bg-gradient-to-br from-background via-[#0B132B] to-card p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-border/80">
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-destructive/10 rounded-full blur-3xl pointer-events-none" />
          <div>
            <div className="flex items-center gap-3">
              <BrandLogo className="w-10 h-10" />
              <div>
                <span className="font-black text-2xl tracking-wider text-foreground">{brand.name}</span>
                <span className="block text-[9px] font-extrabold tracking-widest text-primary uppercase">{brand.tagline}</span>
              </div>
            </div>
            <div className="mt-12 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/80 border border-border text-primary text-xs font-semibold">
                <Building2 className="w-3.5 h-3.5" /><span>{brand.badge}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight">{brand.headline}</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">{brand.description}</p>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-border/80 space-y-3">
            <div className="flex items-center gap-3 text-xs text-foreground/80"><ShieldCheck className="w-4 h-4 text-success shrink-0" /><span>{brand.features[0].text}</span></div>
            <div className="flex items-center gap-3 text-xs text-foreground/80"><KeyRound className="w-4 h-4 text-primary shrink-0" /><span>{brand.features[1].text}</span></div>
          </div>
        </div>

        <div className="lg:col-span-6 p-8 sm:p-12 flex flex-col justify-center bg-card/40">
          <div className="max-w-md mx-auto w-full">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Iniciar Sesión</h2>
              <p className="text-xs text-muted-foreground mt-1">Ingresa tus credenciales para acceder al sistema.</p>
            </div>
            <form onSubmit={submit} className="space-y-5" noValidate>
              <Input label="Usuario / Credencial" icon={User} maxLength={40} accent="action" autoComplete="username" autoFocus value={username}
                onChange={(e) => { setUsername(e.target.value); if (errors.username) setErrors((p) => ({ ...p, username: undefined })) }}
                placeholder="Ej: admin" error={errors.username} />
              <Input label="Contraseña" icon={Lock} type="password" accent="action" autoComplete="current-password" value={password}
                onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((p) => ({ ...p, password: undefined })) }}
                placeholder="••••••••" error={errors.password} />
              <Button type="submit" variant="action" isLoading={loading} loadingText="Verificando credenciales...">
                <span>Iniciar Sesión</span><ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>

      <Modal open={!!modal} tone={modal?.tone ?? 'destructive'} title={modal?.title ?? ''} actionLabel="Aceptar" onAction={() => setModal(null)}>
        {modal?.text}
      </Modal>
    </>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
