import { Inter } from 'next/font/google'
import '@/styles/globals.css'
import ClientLayout from './ClientLayout'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Centro de Órdenes de Pago - COP',
  description: 'Sistema de automatización para el flujo del Centro de Órdenes de Pago',
  keywords: ['COP', 'órdenes de pago', 'automatización', 'pagaduría'],
  authors: [{ name: 'Sistema COP' }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="h-full bg-gray-50">
      <body className={`${inter.className} h-full`}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  )
}
