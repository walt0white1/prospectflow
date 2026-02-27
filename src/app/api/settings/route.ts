import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true },
    })

    if (!user) {
      return NextResponse.json({ profile: null, brevo: null, anthropic: null, limits: null })
    }

    return NextResponse.json({
      profile: {
        name: user.name ?? '',
        email: user.email,
        company: user.company ?? '',
        phone: user.phone ?? '',
        signature: user.signature ?? '',
      },
      brevo: {
        apiKey: user.settings?.brevoApiKey ?? '',
        fromEmail: user.settings?.brevoFromEmail ?? '',
        fromName: user.settings?.brevoFromName ?? '',
      },
      anthropic: {
        apiKey: user.settings?.anthropicKey ?? '',
      },
      limits: {
        dailyEmailLimit: user.settings?.dailyEmailLimit ?? 50,
        delayBetweenEmails: user.settings?.delayBetweenEmails ?? 30,
        defaultCity: user.settings?.defaultCity ?? '',
        defaultIndustry: user.settings?.defaultIndustry ?? '',
        defaultSearchRadius: user.settings?.defaultSearchRadius ?? 15,
        autoAudit: user.settings?.autoAudit ?? true,
      },
    })
  } catch {
    return NextResponse.json(
      { message: 'Base de données non configurée' },
      { status: 503 }
    )
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const body = await req.json()
    const { profile, brevo, anthropic, limits } = body

    await prisma.user.update({
      where: { id: userId },
      data: {
        name: profile?.name ?? undefined,
        company: profile?.company ?? undefined,
        phone: profile?.phone ?? undefined,
        signature: profile?.signature ?? undefined,
      },
    })

    await (prisma.settings as any).upsert({
      where: { userId },
      create: {
        userId,
        brevoApiKey: brevo?.apiKey || null,
        brevoFromEmail: brevo?.fromEmail || null,
        brevoFromName: brevo?.fromName || null,
        anthropicKey: anthropic?.apiKey || null,
        dailyEmailLimit: limits?.dailyEmailLimit ?? 50,
        delayBetweenEmails: limits?.delayBetweenEmails ?? 30,
        defaultCity: limits?.defaultCity || null,
        defaultIndustry: limits?.defaultIndustry || null,
        defaultSearchRadius: limits?.defaultSearchRadius ?? 15,
        autoAudit: limits?.autoAudit ?? true,
      },
      update: {
        brevoApiKey: brevo?.apiKey || null,
        brevoFromEmail: brevo?.fromEmail || null,
        brevoFromName: brevo?.fromName || null,
        anthropicKey: anthropic?.apiKey || null,
        dailyEmailLimit: limits?.dailyEmailLimit ?? 50,
        delayBetweenEmails: limits?.delayBetweenEmails ?? 30,
        defaultCity: limits?.defaultCity || null,
        defaultIndustry: limits?.defaultIndustry || null,
        defaultSearchRadius: limits?.defaultSearchRadius ?? 15,
        autoAudit: limits?.autoAudit ?? true,
      },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { message: 'Base de données non configurée. Ajoutez DATABASE_URL dans votre .env.' },
      { status: 503 }
    )
  }
}
