'use client'

import React from 'react'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'action' | 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  isLoading?: boolean
  loadingText?: string
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  // Gradiente indigo — CTA del login (urpi_authentication_system.tsx:484)
  action:
    'bg-gradient-to-r from-action to-action-to hover:brightness-110 text-action-foreground shadow-lg shadow-action/25 focus:ring-action/50',
  // Amber — marca y cambio de clave (urpi_authentication_system.tsx:635)
  primary:
    'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 focus:ring-primary/50',
  secondary:
    'bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border focus:ring-secondary',
  ghost: 'bg-transparent hover:bg-secondary/60 text-foreground focus:ring-border',
}

export function Button({
  variant = 'primary',
  isLoading = false,
  loadingText,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={cn(
        'w-full py-3 px-4 font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>{loadingText || 'Procesando...'}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}
