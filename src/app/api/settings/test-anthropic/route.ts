import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: Request) {
  try {
    const { apiKey } = await req.json()

    if (!apiKey) {
      return NextResponse.json({ message: 'Clé API manquante' }, { status: 400 })
    }

    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Say "ok"' }],
    })

    return NextResponse.json({ success: true, model: response.model })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Clé API invalide'
    return NextResponse.json({ message }, { status: 401 })
  }
}
