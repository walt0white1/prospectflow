'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Search,
  Users,
  Mail,
  Send,
  BarChart2,
  Settings,
  Zap,
  LogOut,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useSession, signOut } from 'next-auth/react'

const navItems = [
  { label: 'Dashboard',   href: '/',           icon: LayoutDashboard },
  { label: 'Recherche',   href: '/search',     icon: Search },
  { label: 'Prospects',   href: '/prospects',  icon: Users,    hotBadge: true },
  { label: 'Emails',      href: '/emails',     icon: Mail },
  { label: 'Campagnes',   href: '/campaigns',  icon: Send },
  { label: 'Analytics',   href: '/analytics',  icon: BarChart2 },
  { label: 'Paramètres',  href: '/settings',   icon: Settings },
]

interface SidebarProps {
  hotProspectsCount?: number
}

export function Sidebar({ hotProspectsCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()

  const userName = session?.user?.name ?? session?.user?.email?.split('@')[0] ?? 'Utilisateur'
  const userEmail = session?.user?.email ?? ''
  const userInitial = userName.charAt(0).toUpperCase()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col border-r border-border bg-card h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-white" fill="white" />
        </div>
        <span className="font-bold text-foreground text-[15px] tracking-tight">
          ProspectFlow
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon
                className={cn('w-4 h-4 flex-shrink-0', active ? 'text-primary' : '')}
              />
              <span className="flex-1">{item.label}</span>
              {item.hotBadge && hotProspectsCount > 0 && (
                <Badge className="bg-primary/20 text-primary border-0 text-[10px] px-1.5 h-4 min-w-[18px] justify-center rounded-full">
                  {hotProspectsCount}
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Séparateur + section inférieure */}
      <div className="px-3 pb-4 border-t border-border pt-3 space-y-0.5">
        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{userName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{userEmail}</p>
          </div>
        </div>
        {/* Logout button */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-150"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  )
}
