'use client'

import { usePathname } from 'next/navigation'
import { Search, Bell } from 'lucide-react'
import { Input } from '@/components/ui/input'

const PAGE_TITLES: Record<string, string> = {
  '/':           'Dashboard',
  '/search':     'Recherche de prospects',
  '/prospects':  'Prospects',
  '/emails':     'Emails',
  '/campaigns':  'Campagnes',
  '/analytics':  'Analytics',
  '/settings':   'Paramètres',
}

function getPageTitle(pathname: string): string {
  for (const [path, label] of Object.entries(PAGE_TITLES)) {
    if (path === '/' ? pathname === '/' : pathname.startsWith(path)) {
      return label
    }
  }
  return 'ProspectFlow'
}

export function Header() {
  const pathname = usePathname()

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-border bg-background flex-shrink-0 sticky top-0 z-10">
      {/* Titre page actuelle */}
      <h1 className="text-sm font-semibold text-foreground">
        {getPageTitle(pathname)}
      </h1>

      {/* Actions droite */}
      <div className="flex items-center gap-2">
        {/* Recherche globale */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher un prospect..."
            className="pl-8 w-60 h-8 bg-card border-border text-xs placeholder:text-muted-foreground focus-visible:ring-primary/50"
          />
        </div>

        {/* Notifications */}
        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors relative">
          <Bell className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  )
}
