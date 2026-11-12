'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { GymModal } from '@/components/gym/GymModal'

interface ConfirmOptions {
  title: string
  message: React.ReactNode
  okLabel?: string
  danger?: boolean
}
type ConfirmFn = (o: ConfirmOptions) => Promise<boolean>

const Ctx = createContext<ConfirmFn | null>(null)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((o) => new Promise<boolean>((res) => {
    resolver.current = res
    setOpts(o)
  }), [])

  const finish = (v: boolean) => {
    resolver.current?.(v)
    resolver.current = null
    setOpts(null)
  }

  return (
    <Ctx.Provider value={confirm}>
      {children}
      {opts && (
        <GymModal
          title={opts.title}
          onClose={() => finish(false)}
          footer={
            <>
              <button className="btn secondary" onClick={() => finish(false)}>Cancelar</button>
              <button className={`btn ${opts.danger ? 'danger' : 'primary'}`} onClick={() => finish(true)}>{opts.okLabel ?? 'Aceptar'}</button>
            </>
          }
        >
          <div className="gym"><p className="muted" style={{ lineHeight: 1.6, paddingBottom: 8 }}>{opts.message}</p></div>
        </GymModal>
      )}
    </Ctx.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const c = useContext(Ctx)
  if (!c) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>')
  return c
}
