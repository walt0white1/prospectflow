import { LucideIcon } from 'lucide-react'

interface PagePlaceholderProps {
  icon: LucideIcon
  title: string
  description: string
  badge?: string
}

export function PagePlaceholder({
  icon: Icon,
  title,
  description,
  badge,
}: PagePlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-112px)] text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-card border border-border flex items-center justify-center mb-5 shadow-sm">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {badge && (
          <span className="text-[10px] font-medium bg-primary/15 text-primary px-2 py-0.5 rounded-full border border-primary/20">
            {badge}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
        {description}
      </p>
      <div className="mt-6 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        <span className="text-xs text-muted-foreground">En cours de développement</span>
      </div>
    </div>
  )
}
