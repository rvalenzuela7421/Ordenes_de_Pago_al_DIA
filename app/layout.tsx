import { Inter } from 'next/font/google'
import '@/styles/globals.css'
import ClientLayout from './ClientLayout'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Mis Pagos ALDIA - COP',
  description: 'Sistema de automatización para el flujo de Mis Pagos ALDIA',
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
