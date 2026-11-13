import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { badRequest, AppError } from '@/server/common/errors'

export interface ChatMessage { role: 'user' | 'assistant'; content: string }

const MAX_HISTORY = 10
const MAX_CHARS = 2000

let guideCache: string | null = null

/** Lee del README la sección «Guía de uso del sistema» (hasta «Arquitectura»). */
async function loadGuide(): Promise<string> {
  if (guideCache) return guideCache
  try {
    const md = await readFile(path.join(process.cwd(), 'README.md'), 'utf8')
    const start = md.indexOf('## Guía de uso del sistema')
    const end = md.indexOf('## Arquitectura')
    guideCache = start >= 0 ? md.slice(start, end > start ? end : undefined) : md
  } catch {
    guideCache = ''
  }
  return guideCache
}

const systemPrompt = (guide: string, user: string) => `Eres el Asistente virtual de la aplicación de gestión del gimnasio de boxeo "Águilas Boxeo Hualpén". Hablas con ${user}.
Tu función es orientar al usuario sobre cómo usar la aplicación: indica en qué opción del menú está lo que busca y los pasos concretos. También puedes responder consultas generales breves, pero vuelve a orientar hacia las opciones de la aplicación cuando corresponda.
Reglas: responde en español, de forma breve y clara (listas cortas de pasos). Usa SOLO la guía de abajo para describir la aplicación; si algo no aparece en ella, dilo con honestidad y no inventes pantallas ni botones. No tienes acceso a los datos del gimnasio (alumnos, pagos, ventas): no los inventes. Nunca pidas ni repitas contraseñas.

=== GUÍA DE LA APLICACIÓN ===
${guide}`

export class AssistantService {
  async reply(messages: ChatMessage[], userName: string): Promise<string> {
    const apiKey = process.env.ASSISTANT_API_KEY
    if (!apiKey) throw new AppError(503, 'El asistente virtual no está configurado (falta ASSISTANT_API_KEY).', 'ASSISTANT_DISABLED')
    const history = messages.slice(-MAX_HISTORY).map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }))
    if (!history.length || history[history.length - 1].role !== 'user') throw badRequest('Falta la pregunta del usuario')

    const base = (process.env.ASSISTANT_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '')
    let res: Response
    try {
      res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: process.env.ASSISTANT_MODEL || 'deepseek-chat',
          temperature: 0.3,
          max_tokens: 700,
          messages: [{ role: 'system', content: systemPrompt(await loadGuide(), userName) }, ...history],
        }),
        signal: AbortSignal.timeout(30_000),
      })
    } catch {
      throw new AppError(502, 'No se pudo contactar al servicio de IA. Intenta nuevamente.', 'ASSISTANT_UNREACHABLE')
    }
    if (!res.ok) {
      console.error('[assistant] proveedor respondió', res.status, await res.text().catch(() => ''))
      throw new AppError(502, 'El servicio de IA no pudo responder en este momento.', 'ASSISTANT_ERROR')
    }
    const data = await res.json().catch(() => null)
    const text: string | undefined = data?.choices?.[0]?.message?.content
    if (!text?.trim()) throw new AppError(502, 'El servicio de IA devolvió una respuesta vacía.', 'ASSISTANT_ERROR')
    return text.trim()
  }
}
