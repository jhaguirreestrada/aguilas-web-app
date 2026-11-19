import {
  LayoutDashboard, Banknote, Users, Package, Wallet, ClipboardList, UserCog, SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react'
import { SETTINGS_SECTIONS } from '@/features/settings/sections'

export interface MenuChild { href: string; label: string }
export interface MenuItem { href: string; label: string; icon: LucideIcon; children?: MenuChild[] }

/** Orden del menú: «Usuario» va justo después de «Planificación». «Configuración» agrupa sus mantenedores en submenús. */
export const MENU: MenuItem[] = [
  { href: '/dashboard', label: 'Paneles', icon: LayoutDashboard },
  { href: '/caja', label: 'Caja y Ventas', icon: Banknote },
  { href: '/alumnos', label: 'Alumnos', icon: Users },
  { href: '/productos', label: 'Productos', icon: Package },
  { href: '/egresos', label: 'Egresos', icon: Wallet },
  { href: '/planificacion', label: 'Planificación', icon: ClipboardList },
  {
    href: '/usuario',
    label: 'Usuario',
    icon: UserCog,
    children: [
      { href: '/usuario/mantenimiento', label: 'Mantenimiento de Usuario' },
      { href: '/usuario/auditoria', label: 'Log de Auditoría' },
    ],
  },
  {
    href: '/configuracion',
    label: 'Configuración',
    icon: SlidersHorizontal,
    children: SETTINGS_SECTIONS.map((s) => ({ href: `/configuracion/${s.slug}`, label: s.label })),
  },
]
