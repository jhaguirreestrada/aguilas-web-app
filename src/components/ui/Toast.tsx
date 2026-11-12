'use client'

import React from 'react'
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'warning' | 'destructive'

export interface ToastData {
  id: number
  title: string
  description?: string
  type: ToastType
}

const TYPE_CONFIG: Record<ToastType, { icon: typeof CheckCircle; iconClass: string; borderClass: string }> = {
  success: { icon: CheckCircle, iconClass: 'text-success', borderClass: 'border-success/40' },
  warning: { icon: AlertTriangle, iconClass: 'text-warning', borderClass: 'border-warning/40' },
  destructive: { icon: XCircle, iconClass: 'text-destructive', borderClass: 'border-destructive/40' },
}

export function Toast({ title, description, type }: ToastData) {
  const config = TYPE_CONFIG[type]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'max-w-md w-full bg-card/90 backdrop-blur-md border text-foreground p-4 rounded-2xl shadow-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300',
        config.borderClass
      )}
    >
      <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', config.iconClass)} />
      <div className="flex-1">
        <h4 className="text-sm font-bold text-foreground">{title}</h4>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </div>
  )
}
