'use client'

import React, { useId, useState } from 'react'
import { Eye, EyeOff, XCircle, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type InputAccent = 'action' | 'primary'

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label?: string
  icon?: LucideIcon
  error?: string
  accent?: InputAccent
  containerClassName?: string
}

const ACCENT_FOCUS: Record<InputAccent, string> = {
  action: 'focus:border-action focus:ring-action/30',
  primary: 'focus:border-primary focus:ring-primary/30',
}

export function Input({
  label,
  icon: Icon,
  error,
  accent = 'action',
  containerClassName,
  type = 'text',
  id,
  ...props
}: InputProps) {
  const generatedId = useId()
  const inputId = id || generatedId
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const resolvedType = isPassword ? (showPassword ? 'text' : 'password') : type

  return (
    <div className={cn('space-y-1.5', containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          id={inputId}
          type={resolvedType}
          className={cn(
            'w-full py-2.5 text-sm bg-background/80 border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 transition-all',
            Icon ? 'pl-10' : 'pl-4',
            isPassword ? 'pr-11' : 'pr-4',
            error
              ? 'border-destructive focus:ring-destructive/30 focus:border-destructive'
              : cn('border-border', ACCENT_FOCUS[accent])
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
            title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1 animate-in fade-in">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
