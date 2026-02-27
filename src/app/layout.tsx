import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { SessionProvider } from '@/components/providers/SessionProvider'
import { AppShell } from '@/components/layout/AppShell'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    template: '%s | ProspectFlow',
    default: 'ProspectFlow',
  },
  description: 'Outil de prospection automatisée pour agences web',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionProvider>
          <AppShell>
            {children}
          </AppShell>
          <Toaster richColors position="bottom-right" />
        </SessionProvider>
      </body>
    </html>
  )
}
