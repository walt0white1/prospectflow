import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildProspectDetail } from '@/lib/mock-prospect-detail'

export async function GET(
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
    const prospect = await (prisma.prospect as any).findUnique({
      where: { id },
      include: {
        emails: { orderBy: { sentAt: 'desc' } },
        notes:  { orderBy: { createdAt: 'desc' } },
      },
    })
    if (!prospect) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (prospect.userId !== userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }
    return NextResponse.json({ ...prospect, audit: null })
  } catch {
    const detail = buildProspectDetail(id)
    if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(detail)
  }
}
