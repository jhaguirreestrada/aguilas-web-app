'use client'

import React from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

type ModalTone = 'warning' | 'destructive' | 'success' | 'info'

interface ModalProps {
  open: boolean
  title: string
  children: React.ReactNode
  tone?: ModalTone
  icon?: LucideIcon
  actionLabel?: string
  onAction?: () => void
  secondaryLabel?: string
  onSecondary?: () => void
}

const TONE_CONFIG: Record<ModalTone, { icon: LucideIcon; iconClass: string; boxClass: string }> = {
  warning: { icon: AlertTriangle, iconClass: 'text-warning', boxClass: 'bg-warning/10 border-warning/30' },
  destructive: { icon: XCircle, iconClass: 'text-destructive', boxClass: 'bg-destructive/10 border-destructive/30' },
  success: { icon: CheckCircle2, iconClass: 'text-success', boxClass: 'bg-success/10 border-success/30' },
  info: { icon: Info, iconClass: 'text-action', boxClass: 'bg-action/10 border-action/30' },
}

export function Modal({
  open,
  title,
  children,
  tone = 'info',
  icon,
  actionLabel = 'Aceptar',
  onAction,
  secondaryLabel,
  onSecondary,
}: ModalProps) {
  if (!open) return null

  const config = TONE_CONFIG[tone]
  const Icon = icon || config.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-center mb-6">
          <div className={cn('w-16 h-16 rounded-full flex items-center justify-center border', config.boxClass)}>
            <Icon className={cn('w-8 h-8', config.iconClass)} />
          </div>
        </div>
        <h2 className="text-xl font-bold text-center text-foreground mb-3">{title}</h2>
        <div className="text-center text-muted-foreground mb-6 text-sm leading-relaxed">{children}</div>
        <div className="flex flex-col sm:flex-row gap-3">
          {secondaryLabel && (
            <Button variant="secondary" onClick={onSecondary} type="button">
              {secondaryLabel}
            </Button>
          )}
          <Button variant="primary" onClick={onAction} type="button">
            {actionLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
