import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import SettingsPage from '@/features/settings/SettingsPage'
import { SETTINGS_SECTIONS } from '@/features/settings/sections'

export const metadata: Metadata = { title: 'Configuración' }

export function generateStaticParams() {
  return SETTINGS_SECTIONS.map((s) => ({ section: s.slug }))
}

export default function Page({ params }: { params: { section: string } }) {
  const found = SETTINGS_SECTIONS.find((s) => s.slug === params.section)
  if (!found) notFound()
  return <SettingsPage section={found.slug} />
}
