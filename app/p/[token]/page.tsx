import type { Metadata } from 'next'
import { PublicPresentation } from './PublicPresentation'

export const metadata: Metadata = { title: 'Sélection de maquettes', robots: { index: false, follow: false } }

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <PublicPresentation token={token} />
}
