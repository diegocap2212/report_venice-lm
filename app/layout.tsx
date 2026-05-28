import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Torre LM — Report Hub',
  description: 'Report quinzenal da Torre LM',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  )
}
