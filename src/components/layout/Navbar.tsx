'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bot, ChevronDown, KeyRound, LogOut, Menu, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { MENU } from '@/components/layout/menu'
import { brand } from '@/lib/brand'
import { ChangePasswordModal } from '@/components/ChangePasswordModal'
import { AssistantChat } from '@/components/AssistantChat'
import type { SessionUser } from '@/shared/types'

interface Props {
  onMenuClick: () => void
  sidebarCollapsed: boolean
  user: SessionUser | null
  onLogout: () => void
}

export function Navbar({ onMenuClick, sidebarCollapsed, user, onLogout }: Props) {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [pwd, setPwd] = useState(false)
  const [chat, setChat] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const current = MENU.find((m) => pathname === m.href || pathname.startsWith(m.href + '/'))
  const child = current?.children?.find((c) => pathname === c.href)
  const initials = (user?.full_name || user?.username || '??').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  const dark = (theme === 'system' ? resolvedTheme : theme) === 'dark'

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-30 h-16 bg-card/80 backdrop-blur-xl border-b border-border/80 transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        <div className="flex items-center justify-between h-full px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={onMenuClick} className="p-2 rounded-xl hover:bg-accent transition-colors lg:hidden text-muted-foreground hover:text-foreground" aria-label="Abrir menú">
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground hidden sm:inline-block">{brand.gym}</span>
            <span className="text-border hidden sm:inline-block">•</span>
            <span className={`text-xs font-bold uppercase tracking-wider ${child ? 'text-muted-foreground' : 'text-primary'}`}>{current?.label ?? 'Paneles'}</span>
            {child && (<><span className="text-border">•</span><span className="text-xs font-bold text-primary">{child.label}</span></>)}
          </div>

          <div className="flex items-center gap-3">
            {mounted && (
              <button onClick={() => setTheme(dark ? 'light' : 'dark')} className="p-2 bg-secondary hover:bg-accent text-primary rounded-xl transition-colors border border-border" title="Cambiar tema" aria-label="Cambiar tema">
                {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}

            <div className="relative" ref={ref}>
              <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2.5 p-1.5 pl-3 rounded-xl bg-secondary/80 hover:bg-secondary border border-border transition-all">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-primary to-destructive flex items-center justify-center font-bold text-primary-foreground text-xs shadow-md shrink-0">{initials}</div>
                <span className="text-xs font-bold text-foreground leading-none hidden sm:block">{user?.full_name || user?.username || '…'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              {open && (
                <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-2 border-b border-border mb-1">
                    <p className="text-xs font-bold text-foreground truncate">{user?.full_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">@{user?.username}</p>
                  </div>
                  <button onClick={() => { setOpen(false); setPwd(true) }} className="flex items-center gap-2 px-3 py-2 text-xs text-foreground/80 hover:bg-accent rounded-xl transition-colors w-full text-left">
                    <KeyRound className="w-4 h-4 text-primary" /><span>Cambiar contraseña</span>
                  </button>
                  <button onClick={() => { setOpen(false); setChat(true) }} className="flex items-center gap-2 px-3 py-2 text-xs text-foreground/80 hover:bg-accent rounded-xl transition-colors w-full text-left">
                    <Bot className="w-4 h-4 text-primary" /><span>Asistente virtual</span>
                  </button>
                  <button onClick={onLogout} className="flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 rounded-xl transition-colors w-full text-left">
                    <LogOut className="w-4 h-4" /><span>Cerrar sesión</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      <ChangePasswordModal open={pwd} onClose={() => setPwd(false)} />
      <AssistantChat open={chat} onClose={() => setChat(false)} />
    </>
  )
}
