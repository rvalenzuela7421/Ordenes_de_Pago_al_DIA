// Este layout ya no se usa - el layout principal está en app/layout.tsx
// Este archivo se mantiene solo para compatibilidad de rutas /dashboard/*
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Simple pasthrough - el layout real está en app/layout.tsx
  return <>{children}</>
}
