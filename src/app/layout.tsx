import type { Metadata } from 'next'
import './globals.css'
import './gym.css'
import { Providers } from '@/components/providers/Providers'

export const metadata: Metadata = {
  title: { default: 'Águilas Boxeo Hualpén — Gestión', template: '%s · Águilas Boxeo Hualpén' },
  description: 'Gestión de alumnos, pagos, ventas, inventario y egresos del gimnasio.',
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cpath d='M60 8 106 24v38c0 26-20 42-46 52C34 104 14 88 14 62V24Z' fill='%230F172A' stroke='%23F59E0B' stroke-width='6'/%3E%3Cpath d='M34 72l10-24 14-12 16-2 12 6 12 6-12 6-4 8-10 4-4 14-14 6Z' fill='%23D90429'/%3E%3C/svg%3E",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
