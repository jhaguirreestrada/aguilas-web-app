'use client'

import { useCallback, useEffect, useState } from 'react'
import { api, errMsg } from '@/lib/api-client'

/** Carga un GET /api/... y expone {data, loading, error, reload, setData}. `url = null` pausa la carga. */
export function useFetch<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(!!url)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!url) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    api.get<T>(url)
      .then((d) => { if (!cancelled) { setData(d); setError(null) } })
      .catch((e) => { if (!cancelled) setError(errMsg(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [url, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, error, loading, reload, setData }
}
