'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, Send, X } from 'lucide-react'
import { api, errMsg } from '@/lib/api-client'

interface Msg { role: 'user' | 'assistant'; content: string }

const HELLO: Msg = {
  role: 'assistant',
  content: '¡Hola! Soy el asistente virtual. Pregúntame cómo hacer algo en la aplicación, por ejemplo: «¿cómo registro un pago?» o «¿dónde veo los alumnos con pago vencido?».',
}

/** Chat de orientación sobre el uso de la aplicación (consulta /api/assistant). */
export function AssistantChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([HELLO])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [msgs, busy, open])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = text.trim()
    if (!q || busy) return
    const next = [...msgs, { role: 'user' as const, content: q }]
    setMsgs(next); setText(''); setErr(''); setBusy(true)
    try {
      const r = await api.post<{ reply: string }>('/api/assistant', { messages: next.slice(1) })
      setMsgs([...next, { role: 'assistant', content: r.reply }])
    } catch (e2) {
      setErr(errMsg(e2))
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-end p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md h-[500px] max-h-[90vh] bg-card border border-border rounded-3xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <h3 className="font-bold text-foreground">Asistente Virtual</h3>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="p-2 hover:bg-accent rounded-xl transition-colors text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>{m.content}</div>
            </div>
          ))}
          {busy && <p className="text-xs text-muted-foreground animate-pulse">Escribiendo…</p>}
          {err && <p className="text-xs text-destructive font-medium">{err}</p>}
          <div ref={end} />
        </div>

        <form onSubmit={send} className="p-4 border-t border-border">
          <div className="flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Escribe tu mensaje..." autoFocus
              className="flex-1 px-4 py-2 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground" />
            <button type="submit" disabled={busy || !text.trim()} aria-label="Enviar" className="p-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
