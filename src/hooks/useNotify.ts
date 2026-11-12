'use client'
import { useMemo } from 'react'
import { useToast } from '@/components/providers/ToastProvider'
import { errMsg } from '@/lib/api-client'

/** Atajos de notificación: ok('Guardado') / fail(error). */
export function useNotify() {
  const { showToast } = useToast()
  return useMemo(
    () => ({
      ok: (title: string, description?: string) => showToast(title, description, 'success'),
      warn: (title: string, description?: string) => showToast(title, description, 'warning'),
      fail: (e: unknown, title = 'No se pudo completar la acción') => showToast(title, errMsg(e), 'destructive'),
      error: (title: string, description?: string) => showToast(title, description, 'destructive'),
    }),
    [showToast],
  )
}
