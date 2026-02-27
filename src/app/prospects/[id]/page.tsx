import type { Metadata } from 'next'
import { ProspectDetailClient } from './ProspectDetailClient'

export const metadata: Metadata = { title: 'Fiche prospect' }

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ProspectDetailClient id={id} />
}
