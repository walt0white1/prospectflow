import type { Metadata } from 'next'
import { SearchClient } from './SearchClient'

export const metadata: Metadata = { title: 'Recherche' }

export default function SearchPage() {
  return <SearchClient />
}
