import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MOCK_PROSPECTS } from '@/lib/mock-prospects'
import { generateMockEmails } from '@/lib/mock-prospect-detail'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ActivityItem = {
  type: 'email_sent' | 'email_opened' | 'email_replied' | 'prospect_added' | 'status_won' | 'status_meeting'
  companyName: string
  date: string
  meta?: string
}

export type DashboardStats = {
  totalProspects: number
  emailsSentThisMonth: number
  openRate: number
  meetingsBooked: number
}

export type LineChartPoint = {
  date: string
  sent: number
  opened: number
  replied: number
}

export type FunnelStep = {
  label: string
  value: number
  color: string
}

export type TopHotItem = {
  id: string
  companyName: string
  industry: string
  city: string
  prospectScore: number
  priority: string
  status: string
  hasWebsite: boolean
  googleRating: number | null
  phone: string | null
}

export type SourceBreakdownItem = {
  source: string
  label: string
  count: number
}

export type DashboardData = {
  stats: DashboardStats
  lineChart: LineChartPoint[]
  funnel: FunnelStep[]
  topHot: TopHotItem[]
  recentActivity: ActivityItem[]
  sourceBreakdown: SourceBreakdownItem[]
  source: 'db' | 'mock'
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  OPENSTREETMAP: 'OpenStreetMap',
  GOOGLE_MAPS: 'Google Maps',
  MANUAL: 'Manuel',
  IMPORT_CSV: 'Import CSV',
}

function buildDays30(now: number): string[] {
  const days: string[] = []
  for (let i = 29; i >= 0; i--) {
    days.push(new Date(now - i * 86_400_000).toISOString().split('T')[0])
  }
  return days
}

// ── Mock computation ──────────────────────────────────────────────────────────

function computeMockStats(): Omit<DashboardData, 'source'> {
  const now = Date.now()
  const thisMonthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  ).getTime()

  let emailsSentThisMonth = 0
  let totalSent = 0
  let totalOpened = 0
  let totalReplied = 0

  const activities: ActivityItem[] = []
  const days30 = buildDays30(now)
  const emailsByDay: Record<string, { sent: number; opened: number; replied: number }> = {}
  days30.forEach(d => { emailsByDay[d] = { sent: 0, opened: 0, replied: 0 } })

  MOCK_PROSPECTS.forEach(p => {
    // Prospect added activity
    activities.push({
      type: 'prospect_added',
      companyName: p.companyName,
      date: p.createdAt,
      meta: `Score ${p.prospectScore} · ${p.priority}`,
    })

    // Status-level activities
    if (p.status === 'WON' && p.lastContactAt) {
      activities.push({ type: 'status_won', companyName: p.companyName, date: p.lastContactAt })
    }
    if (p.status === 'MEETING' && p.lastContactAt) {
      activities.push({ type: 'status_meeting', companyName: p.companyName, date: p.lastContactAt })
    }

    // Email activities
    if (p.emailsSent > 0 && p.lastEmailAt) {
      const emails = generateMockEmails(p)
      emails.forEach(e => {
        totalSent++
        const sentTs = new Date(e.sentAt).getTime()
        if (sentTs >= thisMonthStart) emailsSentThisMonth++

        if (e.status !== 'SENT' && e.status !== 'BOUNCED') {
          totalOpened++
          const d = e.sentAt.split('T')[0]
          if (emailsByDay[d]) emailsByDay[d].opened++
        }
        if (e.status === 'REPLIED') {
          totalReplied++
          const d = e.sentAt.split('T')[0]
          if (emailsByDay[d]) emailsByDay[d].replied++
        }

        const d = e.sentAt.split('T')[0]
        if (emailsByDay[d]) emailsByDay[d].sent++

        activities.push({ type: 'email_sent', companyName: p.companyName, date: e.sentAt, meta: e.subject })
        if (e.openedAt) {
          activities.push({ type: 'email_opened', companyName: p.companyName, date: e.openedAt, meta: e.subject })
        }
        if (e.repliedAt) {
          activities.push({ type: 'email_replied', companyName: p.companyName, date: e.repliedAt, meta: e.subject })
        }
      })
    }
  })

  const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0
  const meetingsBooked = MOCK_PROSPECTS.filter(p =>
    ['MEETING', 'PROPOSAL'].includes(p.status),
  ).length

  // Funnel
  const s = (statuses: string[]) =>
    MOCK_PROSPECTS.filter(p => statuses.includes(p.status)).length

  const funnel: FunnelStep[] = [
    { label: 'Prospects', value: MOCK_PROSPECTS.length, color: '#6366f1' },
    { label: 'Contactés', value: s(['CONTACTED', 'OPENED', 'REPLIED', 'MEETING', 'PROPOSAL', 'WON']), color: '#8b5cf6' },
    { label: 'Ouverts', value: s(['OPENED', 'REPLIED', 'MEETING', 'PROPOSAL', 'WON']), color: '#a78bfa' },
    { label: 'Répondu', value: s(['REPLIED', 'MEETING', 'PROPOSAL', 'WON']), color: '#f59e0b' },
    { label: 'RDV', value: s(['MEETING', 'PROPOSAL', 'WON']), color: '#10b981' },
    { label: 'Gagné', value: s(['WON']), color: '#22c55e' },
  ]

  // Top 10 HOT not yet contacted
  const topHot: TopHotItem[] = MOCK_PROSPECTS
    .filter(p =>
      p.priority === 'HOT' &&
      !['CONTACTED', 'OPENED', 'REPLIED', 'MEETING', 'PROPOSAL', 'WON', 'BLACKLIST'].includes(p.status),
    )
    .sort((a, b) => b.prospectScore - a.prospectScore)
    .slice(0, 10)
    .map(p => ({
      id: p.id,
      companyName: p.companyName,
      industry: p.industry,
      city: p.city,
      prospectScore: p.prospectScore,
      priority: p.priority,
      status: p.status,
      hasWebsite: p.hasWebsite,
      googleRating: p.googleRating,
      phone: p.phone,
    }))

  // Line chart
  const lineChart: LineChartPoint[] = days30.map(date => ({
    date: date.slice(5), // MM-DD
    sent: emailsByDay[date].sent,
    opened: emailsByDay[date].opened,
    replied: emailsByDay[date].replied,
  }))

  // Source breakdown
  const sourceMap: Record<string, number> = {}
  MOCK_PROSPECTS.forEach(p => {
    sourceMap[p.source] = (sourceMap[p.source] ?? 0) + 1
  })
  const sourceBreakdown: SourceBreakdownItem[] = Object.entries(sourceMap).map(([source, count]) => ({
    source,
    label: SOURCE_LABELS[source] ?? source,
    count,
  }))

  // Recent activity (sorted, top 15)
  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const recentActivity = activities.slice(0, 15)

  return {
    stats: {
      totalProspects: MOCK_PROSPECTS.length,
      emailsSentThisMonth,
      openRate,
      meetingsBooked,
    },
    lineChart,
    funnel,
    topHot,
    recentActivity,
    sourceBreakdown,
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000)

    const [
      totalProspects,
      emailsSentThisMonth,
      emailsOpened,
      emailsTotal,
      meetingsBooked,
      topHotDb,
      sourceGroups,
      statusGroups,
      recentEmailsDb,
    ] = await Promise.all([
      (prisma.prospect as any).count({ where: { userId } }),
      (prisma.email as any).count({
        where: { prospect: { userId }, sentAt: { gte: startOfMonth }, status: { not: 'FAILED' } },
      }),
      (prisma.email as any).count({
        where: { prospect: { userId }, status: { in: ['OPENED', 'CLICKED', 'REPLIED'] } },
      }),
      (prisma.email as any).count({ where: { prospect: { userId }, status: { not: 'FAILED' } } }),
      (prisma.prospect as any).count({
        where: { userId, status: { in: ['MEETING', 'PROPOSAL'] } },
      }),
      (prisma.prospect as any).findMany({
        where: {
          userId,
          priority: 'HOT',
          status: { notIn: ['CONTACTED', 'OPENED', 'REPLIED', 'MEETING', 'PROPOSAL', 'WON', 'BLACKLIST'] },
        },
        orderBy: { prospectScore: 'desc' },
        take: 10,
        select: {
          id: true, companyName: true, industry: true, city: true,
          prospectScore: true, priority: true, status: true,
          hasWebsite: true, googleRating: true, phone: true,
        },
      }),
      (prisma.prospect as any).groupBy({ by: ['source'], where: { userId }, _count: { id: true } }),
      (prisma.prospect as any).groupBy({ by: ['status'], where: { userId }, _count: { id: true } }),
      (prisma.email as any).findMany({
        where: { prospect: { userId }, sentAt: { gte: thirtyDaysAgo } },
        select: {
          sentAt: true, openedAt: true, repliedAt: true,
          status: true, subject: true,
          prospect: { select: { companyName: true } },
        },
        orderBy: { sentAt: 'desc' },
      }),
    ])

    const openRate = emailsTotal > 0
      ? Math.round((emailsOpened / emailsTotal) * 100)
      : 0

    // Source breakdown
    const sourceBreakdown: SourceBreakdownItem[] = (
      sourceGroups as Array<{ source: string; _count: { id: number } }>
    ).map(g => ({
      source: g.source,
      label: SOURCE_LABELS[g.source] ?? g.source,
      count: g._count.id,
    }))

    // Funnel
    const statusCountMap: Record<string, number> = {}
    ;(statusGroups as Array<{ status: string; _count: { id: number } }>).forEach(g => {
      statusCountMap[g.status] = g._count.id
    })
    const sum = (...statuses: string[]) =>
      statuses.reduce((acc, s) => acc + (statusCountMap[s] ?? 0), 0)

    const funnel: FunnelStep[] = [
      { label: 'Prospects', value: totalProspects, color: '#6366f1' },
      { label: 'Contactés', value: sum('CONTACTED', 'OPENED', 'REPLIED', 'MEETING', 'PROPOSAL', 'WON'), color: '#8b5cf6' },
      { label: 'Ouverts', value: sum('OPENED', 'REPLIED', 'MEETING', 'PROPOSAL', 'WON'), color: '#a78bfa' },
      { label: 'Répondu', value: sum('REPLIED', 'MEETING', 'PROPOSAL', 'WON'), color: '#f59e0b' },
      { label: 'RDV', value: sum('MEETING', 'PROPOSAL', 'WON'), color: '#10b981' },
      { label: 'Gagné', value: sum('WON'), color: '#22c55e' },
    ]

    // Line chart
    const days30 = buildDays30(now.getTime())
    const emailsByDay: Record<string, { sent: number; opened: number; replied: number }> = {}
    days30.forEach(d => { emailsByDay[d] = { sent: 0, opened: 0, replied: 0 } })
    ;(recentEmailsDb as Array<{
      sentAt: string; openedAt: string | null; repliedAt: string | null
      status: string; subject: string; prospect: { companyName: string }
    }>).forEach(e => {
      const d = new Date(e.sentAt).toISOString().split('T')[0]
      if (!emailsByDay[d]) return
      emailsByDay[d].sent++
      if (['OPENED', 'CLICKED', 'REPLIED'].includes(e.status)) emailsByDay[d].opened++
      if (e.status === 'REPLIED') emailsByDay[d].replied++
    })

    const lineChart: LineChartPoint[] = days30.map(date => ({
      date: date.slice(5),
      sent: emailsByDay[date].sent,
      opened: emailsByDay[date].opened,
      replied: emailsByDay[date].replied,
    }))

    // Recent activity from emails
    const recentActivity: ActivityItem[] = (
      recentEmailsDb as Array<{
        sentAt: string; openedAt: string | null; repliedAt: string | null
        status: string; subject: string; prospect: { companyName: string }
      }>
    ).slice(0, 15).map(e => ({
      type: (e.status === 'REPLIED'
        ? 'email_replied'
        : e.openedAt
        ? 'email_opened'
        : 'email_sent') as ActivityItem['type'],
      companyName: e.prospect.companyName,
      date: e.repliedAt ?? e.openedAt ?? e.sentAt,
      meta: e.subject,
    }))

    return NextResponse.json({
      stats: { totalProspects, emailsSentThisMonth, openRate, meetingsBooked },
      lineChart,
      funnel,
      topHot: topHotDb,
      recentActivity,
      sourceBreakdown,
      source: 'db',
    } satisfies DashboardData)
  } catch {
    return NextResponse.json({ ...computeMockStats(), source: 'mock' } satisfies DashboardData)
  }
}
