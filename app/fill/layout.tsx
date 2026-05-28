import { Suspense } from 'react'
export default function FillLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Carregando...</div>}>{children}</Suspense>
}
