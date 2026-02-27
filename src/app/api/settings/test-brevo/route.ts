import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { apiKey } = await req.json()

    if (!apiKey) {
      return NextResponse.json({ message: 'Clé API manquante' }, { status: 400 })
    }

    const res = await fetch('https://api.brevo.com/v3/account', {
      headers: {
        'api-key': apiKey,
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      return NextResponse.json({ message: 'Clé API invalide' }, { status: 401 })
    }

    const data = await res.json()
    return NextResponse.json({
      success: true,
      email: data.email as string,
      firstName: data.firstName as string,
      lastName: data.lastName as string,
    })
  } catch {
    return NextResponse.json({ message: 'Erreur lors du test Brevo' }, { status: 500 })
  }
}
