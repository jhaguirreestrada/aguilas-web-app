'use client'

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface Props { page: number; limit: number; total: number; onPage: (p: number) => void; className?: string }

/** Paginación del lado del servidor (estilo Front base). */
export function Pagination({ page, limit, total, onPage, className = '' }: Props) {
  const pages = Math.max(1, Math.ceil(total / limit))
  const from = total ? (page - 1) * limit + 1 : 0
  const to = Math.min(total, page * limit)
  const btn = 'p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-40 disabled:hover:bg-card transition-colors'
  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground ${className}`}>
      <span>{total ? `Mostrando ${from}–${to} de ${total}` : '0 registros'}</span>
      <div className="flex items-center gap-1.5">
        <button className={btn} disabled={page <= 1} onClick={() => onPage(1)} aria-label="Primera"><ChevronsLeft className="w-4 h-4" /></button>
        <button className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Anterior"><ChevronLeft className="w-4 h-4" /></button>
        <span className="px-2 font-semibold text-foreground">Página {page} de {pages}</span>
        <button className={btn} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Siguiente"><ChevronRight className="w-4 h-4" /></button>
        <button className={btn} disabled={page >= pages} onClick={() => onPage(pages)} aria-label="Última"><ChevronsRight className="w-4 h-4" /></button>
      </div>
    </div>
  )
}
