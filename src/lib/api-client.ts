/**
 * Cliente HTTP del navegador. Solo habla con /api/* (mismo origen); la sesión viaja en la cookie httpOnly.
 */
export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('No se pudo conectar con el servidor', 0, 'NETWORK')
  }
  const text = await res.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch { /* respuesta no JSON */ }

  if (!res.ok) {
    if (res.status === 401 && !url.startsWith('/api/auth/login') && typeof window !== 'undefined') {
      window.location.href = '/login?expired=1'
    }
    throw new ApiError(data?.message ?? `Error ${res.status}`, res.status, data?.code)
  }
  return data as T
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, body?: unknown) => request<T>('POST', url, body ?? {}),
  put: <T>(url: string, body: unknown) => request<T>('PUT', url, body),
  del: <T>(url: string) => request<T>('DELETE', url),
}

export const qs = (params: Record<string, string | number | undefined | null>) => {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Ocurrió un error inesperado')
