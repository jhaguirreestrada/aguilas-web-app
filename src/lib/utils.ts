import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combina clases condicionales (clsx) y resuelve conflictos de Tailwind
 * (tailwind-merge), p.ej. cn('px-2', condition && 'px-4') -> 'px-4'.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
