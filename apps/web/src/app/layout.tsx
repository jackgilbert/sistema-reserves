import type { Metadata } from 'next'
import './globals.css'
import { LocaleProvider } from '@/components/LocaleProvider'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { PublicStyling } from '@/components/PublicStyling'

export const metadata: Metadata = {
  title: 'Sistema de Reservas',
  description: 'Sistema de reservas multi-tenant',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <LocaleProvider>
          <PublicStyling />
          {children}
          <LanguageSwitcher />
        </LocaleProvider>
      </body>
    </html>
  )
}
