import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'VibeTrading',
  description: 'An open-source way to create quant trading strategies through conversation.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  )
}

