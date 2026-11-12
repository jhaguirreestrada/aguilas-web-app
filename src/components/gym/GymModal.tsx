'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

const stack: symbol[] = []

interface Props {
  title: string
  size?: '' | 'mid' | 'lg' | 'xl'
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}

/** Modal de las pantallas migradas (estilo `.mb/.md` del HTML original). Escape cierra el más reciente. */
export function GymModal({ title, size = '', onClose, children, footer }: Props) {
  const [mounted, setMounted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    setMounted(true)
    const id = Symbol('modal')
    stack.push(id)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stack[stack.length - 1] === id) closeRef.current()
    }
    window.addEventListener('keydown', onKey)
    const t = setTimeout(() => {
      const el = ref.current?.querySelector<HTMLElement>('input:not([readonly]):not([type=hidden]):not([type=checkbox]),select,textarea')
      el?.focus()
    }, 40)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(t)
      const i = stack.indexOf(id)
      if (i >= 0) stack.splice(i, 1)
    }
  }, [])

  if (!mounted) return null
  return createPortal(
    <div className="gym">
      <div className="mb">
        <div ref={ref} className={`md ${size}`} role="dialog" aria-modal="true" aria-label={title}>
          <div className="md-h">
            <h2>{title}</h2>
            <button type="button" className="btn ghost ico" onClick={onClose} aria-label="Cerrar"><X /></button>
          </div>
          <div className="md-b">{children}</div>
          {footer ? <div className="md-f">{footer}</div> : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}
