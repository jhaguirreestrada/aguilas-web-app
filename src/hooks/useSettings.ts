'use client'
import { useFetch } from './useFetch'
import type { Settings } from '@/shared/types'

export const useSettings = () => useFetch<Settings>('/api/settings')
