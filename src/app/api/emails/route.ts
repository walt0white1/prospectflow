import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MOCK_PROSPECTS } from '@/lib/mock-prospects'
import { generateMockEmails } from '@/lib/mock-prospect-detail'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  const userId = session.user.id

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'all'
  const page   = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit  = 20

  try {
    const where: Record<string, unknown> = {
      prospect: { userId },
      status: { not: 'DRAFT' },
    }
    if (status !== 'all') {
      where.status = status
    }

    const [total, emails] = await Promise.all([
      (prisma.email as any).count({ where }),
      (prisma.email as any).findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          subject: true,
          status: true,
          sentAt: true,
          openedAt: true,
          clickedAt: true,
          repliedAt: true,
          createdAt: true,
          prospect: {
            select: {
              id: true,
              companyName: true,
              city: true,
              industry: true,
              email: true,
            },
          },
          campaign: {
            select: { id: true, name: true },
          },
        },
      }),
    ])

    const [statSent, statOpened, statClicked, statReplied, statBounced] = await Promise.all([
      (prisma.email as any).count({ where: { prospect: { userId }, status: { not: 'DRAFT' } } }),
      (prisma.email as any).count({ where: { prospect: { userId }, status: { in: ['OPENED', 'CLICKED', 'REPLIED'] } } }),
      (prisma.email as any).count({ where: { prospect: { userId }, status: 'CLICKED' } }),
      (prisma.email as any).count({ where: { prospect: { userId }, status: 'REPLIED' } }),
      (prisma.email as any).count({ where: { prospect: { userId }, status: 'BOUNCED' } }),
    ])

    return NextResponse.json({
      emails: emails.map((e: {
        id: string; subject: string; status: string;
        sentAt: Date | null; openedAt: Date | null; clickedAt: Date | null;
        repliedAt: Date | null; createdAt: Date;
        prospect: { id: string; companyName: string; city: string; industry: string; email: string | null };
        campaign: { id: string; name: string } | null;
      }) => ({
        id: e.id,
        subject: e.subject,
        status: e.status,
        sentAt: e.sentAt?.toISOString() ?? null,
        openedAt: e.openedAt?.toISOString() ?? null,
        clickedAt: e.clickedAt?.toISOString() ?? null,
        repliedAt: e.repliedAt?.toISOString() ?? null,
        createdAt: e.createdAt.toISOString(),
        prospect: e.prospect,
        campaign: e.campaign,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
      stats: {
        sent: statSent,
        opened: statOpened,
        clicked: statClicked,
        replied: statReplied,
        bounced: statBounced,
        openRate: statSent > 0 ? Math.round((statOpened / statSent) * 100) : 0,
        replyRate: statSent > 0 ? Math.round((statReplied / statSent) * 100) : 0,
      },
      source: 'db',
    })
  } catch {
    // Mock fallback
    const allEmails = MOCK_PROSPECTS.flatMap(p =>
      generateMockEmails(p).map(e => ({
        ...e,
        prospect: {
          id: p.id,
          companyName: p.companyName,
          city: p.city,
          industry: p.industry,
          email: p.email,
        },
        campaign: null as null | { id: string; name: string },
      })),
    ).sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())

    const filtered = status === 'all' ? allEmails : allEmails.filter(e => e.status === status)
    const paged    = filtered.slice((page - 1) * limit, page * limit)

    const sent    = allEmails.length
    const opened  = allEmails.filter(e => ['OPENED','CLICKED','REPLIED'].includes(e.status)).length
    const clicked = allEmails.filter(e => e.status === 'CLICKED').length
    const replied = allEmails.filter(e => e.status === 'REPLIED').length
    const bounced = allEmails.filter(e => e.status === 'BOUNCED').length

    return NextResponse.json({
      emails: paged,
      total: filtered.length,
      page,
      pages: Math.ceil(filtered.length / limit),
      stats: {
        sent,
        opened,
        clicked,
        replied,
        bounced,
        openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
        replyRate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
      },
      source: 'mock',
    })
  }
}
