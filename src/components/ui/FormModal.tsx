'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'md' | 'lg' | 'xl'
  /** Contenido más alto que la pantalla: el cuerpo hace scroll. */
}

const SIZE = { md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-5xl' }

/** Modal con formulario en el estilo del Front base (Tailwind). */
export function FormModal({ open, title, subtitle, onClose, children, footer, size = 'md' }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className={cn('w-full max-h-[92vh] flex flex-col bg-card border border-border rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200', SIZE[size])} role="dialog" aria-modal="true" aria-label={title}>
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-2 overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 mt-2 border-t border-border/60 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">{footer}</div>}
      </div>
    </div>
  )
}
