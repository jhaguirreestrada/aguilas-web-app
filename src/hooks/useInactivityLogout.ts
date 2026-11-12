'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'] as const

/**
 * Cierra la sesión tras `minutes` sin actividad. Los últimos segundos (hasta 30, nunca más de la mitad
 * del tiempo) se muestra un aviso con cuenta regresiva; mientras el aviso está abierto la actividad
 * del ratón no lo cancela: hay que pulsar «Extender sesión».
 * Usa la hora de la última actividad (no temporizadores encadenados) para ser exacto aunque la pestaña
 * esté en segundo plano.
 */
export function useInactivityLogout(minutes: number | null, onLogout: () => void) {
  const [remaining, setRemaining] = useState<number | null>(null) // null = sin aviso
  const last = useRef(Date.now())
  const warning = useRef(false)
  const logoutRef = useRef(onLogout)
  logoutRef.current = onLogout

  const total = minutes ? minutes * 60 : 0
  const grace = Math.min(30, Math.floor(total / 2))

  const extend = useCallback(() => {
    last.current = Date.now()
    warning.current = false
    setRemaining(null)
  }, [])

  useEffect(() => {
    if (!total) return
    last.current = Date.now()
    warning.current = false
    setRemaining(null)

    const onActivity = () => { if (!warning.current) last.current = Date.now() }
    EVENTS.forEach((e) => document.addEventListener(e, onActivity, { passive: true }))

    const tick = setInterval(() => {
      const idle = (Date.now() - last.current) / 1000
      if (idle >= total) {
        clearInterval(tick)
        logoutRef.current()
      } else if (idle >= total - grace) {
        warning.current = true
        setRemaining(Math.ceil(total - idle))
      }
    }, 1000)

    return () => {
      clearInterval(tick)
      EVENTS.forEach((e) => document.removeEventListener(e, onActivity))
    }
  }, [total, grace])

  return { showWarning: remaining !== null, remaining: remaining ?? 0, graceSeconds: grace, extend }
}
