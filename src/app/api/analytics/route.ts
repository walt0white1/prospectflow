import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MOCK_CAMPAIGNS } from '@/lib/mock-campaigns'
import { MOCK_PROSPECTS } from '@/lib/mock-prospects'
import { generateMockEmails } from '@/lib/mock-prospect-detail'

// ── Types ─────────────────────────────────────────────────────────────────────

export type CampaignStat = {
  id: string
  name: string
  status: string
  sent: number
  opened: number
  replied: number
  meetings: number
  openRate: number
  replyRate: number
}

export type SectorStat = {
  sector: string
  count: number
  hot: number
  contacted: number
  replied: number
}

export type WeekdayStat = {
  day: string
  sent: number
  opened: number
  openRate: number
}

export type AnalyticsData = {
  campaigns: CampaignStat[]
  sectors: SectorStat[]
  weekdays: WeekdayStat[]
  summary: {
    totalProspects: number
    totalEmails: number
    avgOpenRate: number
    avgReplyRate: number
    totalMeetings: number
    conversionRate: number  // replied / total prospects
  }
}

// ── GET /api/analytics ────────────────────────────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const dbCampaigns = await (prisma.campaign as any).findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { prospects: true } },
      },
    })

    const campaigns: CampaignStat[] = dbCampaigns.map((c: {
      id: string; name: string; status: string;
      totalSent: number; totalOpened: number; totalReplied: number; totalMeetings: number;
    }) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      sent: c.totalSent,
      opened: c.totalOpened,
      replied: c.totalReplied,
      meetings: c.totalMeetings,
      openRate: c.totalSent > 0 ? Math.round((c.totalOpened / c.totalSent) * 100) : 0,
      replyRate: c.totalSent > 0 ? Math.round((c.totalReplied / c.totalSent) * 100) : 0,
    }))

    const prospects = await (prisma.prospect as any).findMany({
      where: { userId },
      select: { industry: true, priority: true, status: true },
    })

    const sectorMap = new Map<string, SectorStat>()
    for (const p of prospects) {
      const key = p.industry as string
      if (!sectorMap.has(key)) {
        sectorMap.set(key, { sector: key, count: 0, hot: 0, contacted: 0, replied: 0 })
      }
      const s = sectorMap.get(key)!
      s.count++
      if (p.priority === 'HOT') s.hot++
      if (['CONTACTED','OPENED','CLICKED','REPLIED','MEETING','PROPOSAL','WON'].includes(p.status)) s.contacted++
      if (['REPLIED','MEETING','PROPOSAL','WON'].includes(p.status)) s.replied++
    }
    const sectors = Array.from(sectorMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const emails = await (prisma.email as any).findMany({
      where: { prospect: { userId }, status: { not: 'DRAFT' } },
      select: { sentAt: true, status: true },
    })

    const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
    const dayMap = new Map<number, { sent: number; opened: number }>()
    for (let d = 0; d < 7; d++) dayMap.set(d, { sent: 0, opened: 0 })

    for (const e of emails) {
      if (!e.sentAt) continue
      const day = new Date(e.sentAt).getDay()
      const entry = dayMap.get(day)!
      entry.sent++
      if (['OPENED', 'CLICKED', 'REPLIED'].includes(e.status)) entry.opened++
    }

    const weekdays: WeekdayStat[] = DAY_NAMES.map((name, i) => {
      const d = dayMap.get(i)!
      return {
        day: name,
        sent: d.sent,
        opened: d.opened,
        openRate: d.sent > 0 ? Math.round((d.opened / d.sent) * 100) : 0,
      }
    })

    const totalProspects = await (prisma.prospect as any).count({ where: { userId } })
    const totalEmails    = emails.length
    const totalOpened    = emails.filter((e: { status: string }) => ['OPENED','CLICKED','REPLIED'].includes(e.status)).length
    const totalReplied   = emails.filter((e: { status: string }) => e.status === 'REPLIED').length
    const totalMeetings  = dbCampaigns.reduce((acc: number, c: { totalMeetings: number }) => acc + c.totalMeetings, 0)
    const replied        = await (prisma.prospect as any).count({ where: { userId, status: { in: ['REPLIED','MEETING','PROPOSAL','WON'] } } })

    return NextResponse.json({
      campaigns,
      sectors,
      weekdays,
      summary: {
        totalProspects,
        totalEmails,
        avgOpenRate: totalEmails > 0 ? Math.round((totalOpened / totalEmails) * 100) : 0,
        avgReplyRate: totalEmails > 0 ? Math.round((totalReplied / totalEmails) * 100) : 0,
        totalMeetings,
        conversionRate: totalProspects > 0 ? Math.round((replied / totalProspects) * 100) : 0,
      },
      source: 'db',
    } satisfies { campaigns: CampaignStat[]; sectors: SectorStat[]; weekdays: WeekdayStat[]; summary: AnalyticsData['summary']; source: string })

  } catch {
    // ── Mock fallback ──────────────────────────────────────────────────────────
    const campaigns: CampaignStat[] = MOCK_CAMPAIGNS.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status,
      sent: c.totalSent,
      opened: c.totalOpened,
      replied: c.totalReplied,
      meetings: c.totalMeetings,
      openRate: c.totalSent > 0 ? Math.round((c.totalOpened / c.totalSent) * 100) : 0,
      replyRate: c.totalSent > 0 ? Math.round((c.totalReplied / c.totalSent) * 100) : 0,
    }))

    // Secteurs depuis MOCK_PROSPECTS
    const sectorMap = new Map<string, SectorStat>()
    for (const p of MOCK_PROSPECTS) {
      const key = p.industry
      if (!sectorMap.has(key)) {
        sectorMap.set(key, { sector: key, count: 0, hot: 0, contacted: 0, replied: 0 })
      }
      const s = sectorMap.get(key)!
      s.count++
      if (p.priority === 'HOT') s.hot++
      if (['CONTACTED','OPENED','CLICKED','REPLIED','MEETING','PROPOSAL','WON'].includes(p.status)) s.contacted++
      if (['REPLIED','MEETING','PROPOSAL','WON'].includes(p.status)) s.replied++
    }
    const sectors = Array.from(sectorMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Emails mock pour jours de semaine
    const allEmails = MOCK_PROSPECTS.flatMap(p => generateMockEmails(p))
    const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
    const dayMap = new Map<number, { sent: number; opened: number }>()
    for (let d = 0; d < 7; d++) dayMap.set(d, { sent: 0, opened: 0 })
    for (const e of allEmails) {
      const day = new Date(e.sentAt).getDay()
      const entry = dayMap.get(day)!
      entry.sent++
      if (['OPENED','CLICKED','REPLIED'].includes(e.status)) entry.opened++
    }
    const weekdays: WeekdayStat[] = DAY_NAMES.map((name, i) => {
      const d = dayMap.get(i)!
      return { day: name, sent: d.sent, opened: d.opened, openRate: d.sent > 0 ? Math.round((d.opened / d.sent) * 100) : 0 }
    })

    const totalEmails  = allEmails.length
    const totalOpened  = allEmails.filter(e => ['OPENED','CLICKED','REPLIED'].includes(e.status)).length
    const totalReplied = allEmails.filter(e => e.status === 'REPLIED').length
    const totalMeetings = MOCK_CAMPAIGNS.reduce((acc, c) => acc + c.totalMeetings, 0)
    const replied = MOCK_PROSPECTS.filter(p => ['REPLIED','MEETING','PROPOSAL','WON'].includes(p.status)).length

    return NextResponse.json({
      campaigns,
      sectors,
      weekdays,
      summary: {
        totalProspects: MOCK_PROSPECTS.length,
        totalEmails,
        avgOpenRate: totalEmails > 0 ? Math.round((totalOpened / totalEmails) * 100) : 0,
        avgReplyRate: totalEmails > 0 ? Math.round((totalReplied / totalEmails) * 100) : 0,
        totalMeetings,
        conversionRate: MOCK_PROSPECTS.length > 0 ? Math.round((replied / MOCK_PROSPECTS.length) * 100) : 0,
      },
      source: 'mock',
    })
  }
}
