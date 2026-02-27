import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getMockCampaignDetail } from '@/lib/mock-campaigns'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  const { id } = await params

  try {
    const campaign = await (prisma.campaign as any).findUnique({
      where: { id, userId: session.user.id },
      include: {
        prospects: {
          select: {
            id: true,
            companyName: true,
            city: true,
            industry: true,
            prospectScore: true,
            priority: true,
            status: true,
            emailsSent: true,
            lastEmailAt: true,
          },
          orderBy: { prospectScore: 'desc' },
        },
      },
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 })
    }

    // Map prospects to expected shape
    type ProspectRow = { id: string; companyName: string; city: string; industry: string; prospectScore: number; priority: string; status: string; emailsSent: number; lastEmailAt: Date | null }
    const prospects = campaign.prospects.map((p: ProspectRow) => ({
      id: p.id,
      companyName: p.companyName,
      city: p.city,
      industry: p.industry,
      prospectScore: p.prospectScore,
      priority: p.priority,
      status: p.status,
      currentStep: Math.min(p.emailsSent, 2),
      emailsSentInCampaign: p.emailsSent,
      lastEmailAt: p.lastEmailAt?.toISOString() ?? null,
      stoppedReason: p.status === 'REPLIED' ? 'replied'
        : p.status === 'BLACKLIST' ? 'blacklist'
        : null,
    }))

    return NextResponse.json({
      campaign: {
        ...campaign,
        sequence: campaign.sequence ?? [],
        createdAt: campaign.createdAt.toISOString(),
        updatedAt: campaign.updatedAt.toISOString(),
        prospectsCount: prospects.length,
        prospects,
      },
      source: 'db',
    })
  } catch {
    const detail = getMockCampaignDetail(id)
    if (!detail) {
      return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 })
    }
    return NextResponse.json({ campaign: detail, source: 'mock' })
  }
}

// ── PATCH /api/campaigns/[id] — changer le statut ────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const sessionPatch = await getServerSession(authOptions)
  if (!sessionPatch?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  const { id } = await params
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })
  }

  const { status } = body
  const allowed = ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED']
  if (!status || !allowed.includes(status as string)) {
    return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
  }

  try {
    const campaign = await (prisma.campaign as any).update({
      where: { id, userId: sessionPatch.user.id },
      data: { status },
    })
    return NextResponse.json({ campaign })
  } catch {
    // Mock fallback — juste renvoyer un succès
    return NextResponse.json({ campaign: { id, status }, source: 'mock' })
  }
}
