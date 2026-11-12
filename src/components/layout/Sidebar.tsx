'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Menu, Sparkles, X } from 'lucide-react'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { MENU } from '@/components/layout/menu'
import { brand } from '@/lib/brand'

interface Props {
  isOpen: boolean
  onClose: () => void
  isCollapsed: boolean
  onToggle: () => void
}

export function Sidebar({ isOpen, onClose, isCollapsed, onToggle }: Props) {
  const pathname = usePathname()
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const close = () => { if (window.innerWidth < 1024) onClose() }

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed top-0 left-0 z-50 h-full bg-card/90 backdrop-blur-xl border-r border-border transition-all duration-300 flex flex-col justify-between ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${isCollapsed ? 'w-16' : 'w-64'}`}
      >
        <div className="min-h-0 flex-1 flex flex-col">
          <div className="h-16 shrink-0 flex items-center justify-between px-3 border-b border-border/80">
            <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
              <BrandLogo className="w-8 h-8 shrink-0" />
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <span className="font-black text-xl tracking-wider text-foreground block leading-none truncate">{brand.name}</span>
                  <span className="block text-[9px] font-extrabold tracking-widest text-primary uppercase truncate">{brand.tagline}</span>
                </div>
              )}
            </Link>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={onToggle} className="hidden lg:flex p-1.5 rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}>
                <Menu className="w-5 h-5" />
              </button>
              <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground transition-colors lg:hidden" aria-label="Cerrar menú">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <nav className="p-3 space-y-1.5 overflow-y-auto flex-1">
            {MENU.map((item) => {
              const { href, label, icon: Icon, children } = item
              const active = pathname === href || pathname.startsWith(href + '/')
              const cls = `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-colors w-full ${
                active
                  ? 'bg-gradient-to-r from-primary/20 to-action/20 text-primary border-primary/40'
                  : 'text-muted-foreground border-transparent hover:bg-accent hover:text-foreground'
              } ${isCollapsed ? 'justify-center' : ''}`

              if (!children) {
                return (
                  <Link key={href} href={href} onClick={close} title={isCollapsed ? label : undefined} className={cls}>
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                    {!isCollapsed && <span className="truncate">{label}</span>}
                  </Link>
                )
              }

              const isOpen = !!open[href] || (active && open[href] !== false)
              // colapsado: el ícono lleva al primer submenú
              if (isCollapsed) {
                return (
                  <Link key={href} href={children[0].href} onClick={close} title={label} className={cls}>
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                  </Link>
                )
              }
              return (
                <div key={href}>
                  <button type="button" onClick={() => setOpen((o) => ({ ...o, [href]: !isOpen }))} className={cls} aria-expanded={isOpen}>
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                    <span className="flex-1 text-left truncate">{label}</span>
                    {isOpen ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="mt-1 ml-6 pl-2 border-l border-border space-y-1">
                      {children.map((c) => {
                        const on = pathname === c.href
                        return (
                          <Link
                            key={c.href}
                            href={c.href}
                            onClick={close}
                            className={`block px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${on ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                          >
                            {c.label}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </div>

        {!isCollapsed && (
          <div className="p-4 border border-border/80 bg-background/40 m-3 rounded-2xl shrink-0">
            <div className="flex items-center gap-2 text-[11px] font-bold text-primary">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>{brand.gym}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Pagos, alumnos, ventas y egresos del gimnasio</p>
            <span className="block mt-2 text-[10px] font-semibold tracking-wide opacity-70">v{brand.version}</span>
          </div>
        )}
      </aside>
    </>
  )
}
