import { NextResponse } from 'next/server'
import { builderTurn } from '@/lib/agents/builder'
import { AiValidationError } from '@/lib/ai/structured-client'
import { resolveProviderClient } from '@/lib/ai/resolve-provider'

export async function POST(req: Request) {
  const { history, draft, provider } = await req.json()

  const resolved = resolveProviderClient(provider)
  if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: 400 })

  try {
    return NextResponse.json(await builderTurn(resolved.client, history ?? [], draft ?? null))
  } catch (e) {
    if (e instanceof AiValidationError) return NextResponse.json({ error: e.message }, { status: 502 })
    throw e
  }
}
