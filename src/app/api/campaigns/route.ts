import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MOCK_CAMPAIGNS } from '@/lib/mock-campaigns'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const campaigns = await (prisma.campaign as any).findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { prospects: true, emails: true } },
      },
    })

    type CampaignRow = { id: string; name: string; description: string | null; status: string; targetCity: string | null; targetIndustry: string | null; minScore: number | null; maxProspects: number | null; sequence: unknown; totalSent: number; totalOpened: number; totalReplied: number; totalMeetings: number; createdAt: Date; updatedAt: Date; _count: { prospects: number } }
    const list = campaigns.map((c: CampaignRow) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      status: c.status,
      targetCity: c.targetCity,
      targetIndustry: c.targetIndustry,
      minScore: c.minScore ?? 0,
      maxProspects: c.maxProspects ?? 50,
      sequence: c.sequence ?? [],
      totalSent: c.totalSent,
      totalOpened: c.totalOpened,
      totalReplied: c.totalReplied,
      totalMeetings: c.totalMeetings,
      prospectsCount: c._count.prospects,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }))

    return NextResponse.json({ campaigns: list, source: 'db' })
  } catch {
    return NextResponse.json({ campaigns: MOCK_CAMPAIGNS, source: 'mock' })
  }
}

// ── POST /api/campaigns ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })
  }

  const { name, description, targetCity, targetIndustry, minScore, maxProspects } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Le nom est obligatoire' }, { status: 400 })
  }

  const sequence = [
    { step: 0, delay: 0, type: 'FIRST_CONTACT', label: 'Premier contact' },
    { step: 1, delay: 3, type: 'FOLLOW_UP_1',   label: 'Relance J+3' },
    { step: 2, delay: 7, type: 'FOLLOW_UP_2',   label: 'Relance J+7' },
  ]

  const sessionPost = await getServerSession(authOptions)
  if (!sessionPost?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  try {
    const campaign = await (prisma.campaign as any).create({
      data: {
        name: (name as string).trim(),
        description: (description as string | null) ?? null,
        status: 'DRAFT',
        targetCity: (targetCity as string | null) ?? null,
        targetIndustry: (targetIndustry as string | null) ?? null,
        minScore: Number(minScore ?? 60),
        maxProspects: Number(maxProspects ?? 50),
        sequence,
        userId: sessionPost.user.id,
      },
    })

    return NextResponse.json({ campaign, source: 'db' }, { status: 201 })
  } catch {
    // Mock fallback
    const mock = {
      id: `camp-${Date.now()}`,
      name: (name as string).trim(),
      description: (description as string | null) ?? null,
      status: 'DRAFT' as const,
      targetCity: (targetCity as string | null) ?? null,
      targetIndustry: (targetIndustry as string | null) ?? null,
      minScore: Number(minScore ?? 60),
      maxProspects: Number(maxProspects ?? 50),
      sequence,
      totalSent: 0,
      totalOpened: 0,
      totalReplied: 0,
      totalMeetings: 0,
      prospectsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _mock: true,
    }
    return NextResponse.json({ campaign: mock, source: 'mock' }, { status: 201 })
  }
}
