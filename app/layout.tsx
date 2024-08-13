import type { Metadata } from 'next'
import { Noto_Sans } from 'next/font/google'
import './globals.css'

const font = Noto_Sans({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Project Caleana',
  description: 'Manage your links more easily and access them at faster speeds.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en'>
      <body className={font.className}>{children}</body>
    </html>
  )
}
