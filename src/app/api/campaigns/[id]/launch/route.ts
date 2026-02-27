import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MOCK_CAMPAIGNS } from '@/lib/mock-campaigns'
import { MOCK_PROSPECTS } from '@/lib/mock-prospects'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  const userId = session.user.id
  const { id } = await params

  try {
    const campaign = await (prisma.campaign as any).findUnique({ where: { id, userId } })
    if (!campaign) {
      return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 })
    }

    // Construire les critères de recherche
    const where: Record<string, unknown> = {
      userId,
      campaignId: null,
      status: { notIn: ['BLACKLIST', 'WON'] },
      prospectScore: { gte: campaign.minScore ?? 0 },
    }
    if (campaign.targetCity) {
      where.city = { contains: campaign.targetCity, mode: 'insensitive' }
    }
    if (campaign.targetIndustry) {
      where.industry = { contains: campaign.targetIndustry, mode: 'insensitive' }
    }

    const matching = await (prisma.prospect as any).findMany({
      where,
      orderBy: { prospectScore: 'desc' },
      take: campaign.maxProspects ?? 50,
      select: { id: true },
    })

    if (matching.length > 0) {
      await (prisma.prospect as any).updateMany({
        where: { id: { in: matching.map((p: { id: string }) => p.id) } },
        data: { campaignId: id },
      })
    }

    await (prisma.campaign as any).update({
      where: { id },
      data: { status: 'ACTIVE' },
    })

    return NextResponse.json({
      count: matching.length,
      message: `${matching.length} prospect(s) assignés à la campagne`,
    })
  } catch {
    // Mock fallback — simuler le matching sur les données mock
    const campaign = MOCK_CAMPAIGNS.find(c => c.id === id)
    if (!campaign) {
      return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 })
    }

    const matching = MOCK_PROSPECTS.filter(p => {
      if (['BLACKLIST', 'WON'].includes(p.status)) return false
      if (p.prospectScore < campaign.minScore) return false
      if (campaign.targetCity && !p.city.toLowerCase().includes(campaign.targetCity.toLowerCase())) return false
      if (campaign.targetIndustry && !p.industry.toLowerCase().includes(campaign.targetIndustry.toLowerCase())) return false
      return true
    }).slice(0, campaign.maxProspects)

    return NextResponse.json({
      count: matching.length,
      message: `${matching.length} prospect(s) seraient assignés selon les critères`,
      source: 'mock',
    })
  }
}

