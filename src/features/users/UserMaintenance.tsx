'use client'

import { useEffect, useState } from 'react'
import { KeyRound, Mail, Pencil, Plus, Power, Search, ShieldCheck, Trash2, User as UserIcon, UserPlus } from 'lucide-react'
import { api, errMsg, qs } from '@/lib/api-client'
import { useFetch } from '@/hooks/useFetch'
import { useDebounced } from '@/hooks/useDebounced'
import { useNotify } from '@/hooks/useNotify'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { FormModal } from '@/components/ui/FormModal'
import { Pagination } from '@/components/ui/Pagination'
import { fmtDateTime } from '@/shared/format'
import type { AppUser, Paginated } from '@/shared/types'

const LIMIT = 10

export function UserMaintenance() {
  const notify = useNotify()
  const [search, setSearch] = useState('')
  const dSearch = useDebounced(search, 300)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const { data, loading, error, reload } = useFetch<Paginated<AppUser>>(`/api/users${qs({ search: dSearch, status, page, limit: LIMIT })}`)
  const { data: me } = useFetch<{ user: { id: string } }>('/api/auth/me')
  const [editing, setEditing] = useState<AppUser | null | undefined>(undefined) // undefined = cerrado, null = nuevo
  const [deleting, setDeleting] = useState<AppUser | null>(null)

  useEffect(() => setPage(1), [dSearch, status])

  const toggle = async (u: AppUser) => {
    try {
      await api.put(`/api/users/${u.id}`, { full_name: u.full_name, email: u.email ?? '', is_active: !u.is_active })
      notify.ok(u.is_active ? 'Usuario desactivado' : 'Usuario activado')
      reload()
    } catch (e) { notify.fail(e) }
  }

  const remove = async () => {
    if (!deleting) return
    try { await api.del(`/api/users/${deleting.id}`); notify.ok('Usuario eliminado'); setDeleting(null); reload() }
    catch (e) { notify.fail(e); setDeleting(null) }
  }

  const rows = data?.data ?? []

  return (
    <div className="space-y-5">
      <div className="bg-card/80 backdrop-blur-xl border border-border/80 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2"><Input label="Buscar" icon={Search} placeholder="Usuario, nombre o correo" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <Select label="Estado" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos</option><option value="active">Activos</option><option value="inactive">Inactivos</option>
            </Select>
          </div>
          <Button variant="primary" className="lg:w-auto" onClick={() => setEditing(null)}><UserPlus className="w-4 h-4" /> Nuevo usuario</Button>
        </div>
      </div>

      <div className="bg-card/80 backdrop-blur-xl border border-border/80 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="bg-secondary/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                {['Usuario', 'Correo', 'Estado', 'Último acceso', 'Creado', 'Acciones'].map((h, i) => (
                  <th key={h} className={`px-4 py-3 font-bold ${i === 5 ? 'text-center' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {error ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-destructive">{error}</td></tr>
              ) : loading && !data ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Cargando…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No hay usuarios que coincidan con la búsqueda</td></tr>
              ) : rows.map((u) => {
                const self = u.id === me?.user.id
                return (
                  <tr key={u.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-destructive flex items-center justify-center font-bold text-primary-foreground text-xs shrink-0">
                          {u.full_name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate">{u.full_name} {self && <span className="ml-1 text-[10px] font-bold text-primary border border-primary/40 rounded-full px-1.5 py-0.5">Tú</span>}</p>
                          <p className="text-xs text-muted-foreground font-mono">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email || '—'}</td>
                    <td className="px-4 py-3">
                      {u.is_active
                        ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">ACTIVO</span>
                        : <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-500/15 text-muted-foreground border border-slate-500/30">INACTIVO</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(u.last_login_at)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button title="Editar" onClick={() => setEditing(u)} className="p-2 rounded-xl border border-border bg-secondary hover:bg-accent text-foreground transition-colors"><Pencil className="w-4 h-4" /></button>
                        <button title={u.is_active ? 'Desactivar' : 'Activar'} disabled={self} onClick={() => toggle(u)} className="p-2 rounded-xl border border-border bg-secondary hover:bg-accent text-warning disabled:opacity-40 transition-colors"><Power className="w-4 h-4" /></button>
                        <button title="Eliminar" disabled={self} onClick={() => setDeleting(u)} className="p-2 rounded-xl border border-border bg-secondary hover:bg-destructive/10 text-destructive disabled:opacity-40 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-border"><Pagination page={page} limit={LIMIT} total={data?.total ?? 0} onPage={setPage} /></div>
      </div>

      {editing !== undefined && <UserFormModal user={editing} onClose={() => setEditing(undefined)} onSaved={reload} />}

      <Modal open={!!deleting} tone="destructive" title="Eliminar usuario" actionLabel="Eliminar" onAction={remove} secondaryLabel="Cancelar" onSecondary={() => setDeleting(null)}>
        Se eliminará a <b>{deleting?.full_name}</b> (@{deleting?.username}). Esta acción no se puede deshacer; el log de auditoría conservará su historial.
      </Modal>
    </div>
  )
}

function UserFormModal({ user, onClose, onSaved }: { user: AppUser | null; onClose: () => void; onSaved: () => void }) {
  const notify = useNotify()
  const isEdit = !!user
  const [username, setUsername] = useState(user?.username ?? '')
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [active, setActive] = useState(user?.is_active ?? true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (!isEdit && !/^[A-Za-z0-9._-]{3,40}$/.test(username.trim())) er.username = 'Usa 3–40 caracteres: letras, números, punto, guion y guion bajo'
    if (!fullName.trim()) er.full_name = 'El nombre es obligatorio'
    if (email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) er.email = 'El correo no es válido'
    if ((!isEdit || password) && password.length < 8) er.password = 'La contraseña debe tener al menos 8 caracteres'
    setErrors(er)
    if (Object.keys(er).length) return

    setBusy(true)
    try {
      if (isEdit) {
        await api.put(`/api/users/${user!.id}`, { full_name: fullName.trim(), email: email.trim(), is_active: active, ...(password ? { password } : {}) })
        notify.ok('Usuario actualizado')
      } else {
        await api.post('/api/users', { username: username.trim(), full_name: fullName.trim(), email: email.trim(), password, is_active: active })
        notify.ok('Usuario creado')
      }
      onSaved(); onClose()
    } catch (e2) {
      setErrors({ form: errMsg(e2) }); setBusy(false)
    }
  }

  return (
    <FormModal open title={isEdit ? 'Editar usuario' : 'Nuevo usuario'} subtitle={isEdit ? `@${user!.username}` : 'Los usuarios por ahora no tienen perfil: todos acceden a todas las opciones.'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 pb-4" noValidate>
        <Input label="Usuario" icon={UserIcon} value={username} readOnly={isEdit} maxLength={40} autoComplete="off" onChange={(e) => setUsername(e.target.value)} error={errors.username} placeholder="Ej: jperez" />
        <Input label="Nombre completo" icon={UserIcon} value={fullName} maxLength={120} onChange={(e) => setFullName(e.target.value)} error={errors.full_name} />
        <Input label="Correo (opcional)" icon={Mail} type="email" value={email} maxLength={120} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <Input label={isEdit ? 'Nueva contraseña (opcional)' : 'Contraseña'} icon={KeyRound} type="password" value={password} autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} error={errors.password} placeholder={isEdit ? 'Dejar vacío para no cambiarla' : 'Mínimo 8 caracteres'} />
        <label className="flex items-center gap-2.5 text-sm font-semibold text-foreground cursor-pointer select-none">
          <input type="checkbox" className="w-4 h-4 accent-[hsl(var(--primary))]" checked={active} onChange={(e) => setActive(e.target.checked)} />
          <ShieldCheck className="w-4 h-4 text-success" /> Usuario activo (puede iniciar sesión)
        </label>
        {errors.form && <p className="text-xs text-destructive font-medium">{errors.form}</p>}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" isLoading={busy}><Plus className="w-4 h-4" />{isEdit ? 'Guardar cambios' : 'Crear usuario'}</Button>
        </div>
      </form>
    </FormModal>
  )
}
