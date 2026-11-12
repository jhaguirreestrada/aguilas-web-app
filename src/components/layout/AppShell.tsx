'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import { Sidebar } from '@/components/layout/Sidebar'
import { SessionWarningModal } from '@/components/SessionWarningModal'
import { useInactivityLogout } from '@/hooks/useInactivityLogout'
import { api } from '@/lib/api-client'
import type { SessionUser, Settings } from '@/shared/types'

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [user, setUser] = useState<SessionUser | null>(null)
  const [idleMinutes, setIdleMinutes] = useState<number | null>(null)

  useEffect(() => {
    try { setCollapsed(localStorage.getItem('sidebar.collapsed') === '1') } catch { /* almacenamiento no disponible */ }
    api.get<{ user: SessionUser }>('/api/auth/me').then((r) => setUser(r.user)).catch(() => { /* api-client redirige en 401 */ })
    const loadTimeout = () => api.get<Settings>('/api/settings').then((c) => setIdleMinutes(c.inactivity_minutes)).catch(() => undefined)
    loadTimeout()
    window.addEventListener('settings:updated', loadTimeout) // se guardó la configuración: tomar el nuevo tiempo
    return () => window.removeEventListener('settings:updated', loadTimeout)
  }, [])

  const toggle = () => {
    setCollapsed((c) => {
      try { localStorage.setItem('sidebar.collapsed', c ? '0' : '1') } catch { /* noop */ }
      return !c
    })
  }

  const logout = useCallback(async () => {
    try { await api.post('/api/auth/logout') } catch { /* igual se sale */ }
    router.push('/login')
    router.refresh()
  }, [router])

  const expire = useCallback(async () => {
    try { await api.post('/api/auth/logout') } catch { /* igual se sale */ }
    window.location.href = '/login?expired=1' // recarga completa: descarta cualquier estado en memoria
  }, [])
  const idle = useInactivityLogout(idleMinutes, expire)

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed inset-0 pointer-events-none opacity-20 bg-[radial-gradient(hsl(var(--primary))_1px,transparent_1px)] [background-size:24px_24px] z-0" />
      <Sidebar isOpen={open} onClose={() => setOpen(false)} isCollapsed={collapsed} onToggle={toggle} />
      <Navbar onMenuClick={() => setOpen(true)} sidebarCollapsed={collapsed} user={user} onLogout={logout} />
      <main className={`relative z-10 pt-16 min-h-screen flex flex-col transition-all duration-300 ${collapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        <div className="p-4 sm:p-6 flex-1 w-full">{children}</div>
      </main>
      <SessionWarningModal show={idle.showWarning} remaining={idle.remaining} onExtend={idle.extend} onLogout={logout} />
    </div>
  )
}
