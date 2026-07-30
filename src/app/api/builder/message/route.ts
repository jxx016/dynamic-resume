import { NextResponse } from 'next/server'
import { getContext } from '@/lib/app-context'
import { builderTurn } from '@/lib/agents/builder'
import { AiValidationError } from '@/lib/ai/gemini'

export async function POST(req: Request) {
  const { history, draft } = await req.json()
  try {
    return NextResponse.json(await builderTurn(getContext().client, history ?? [], draft ?? null))
  } catch (e) {
    if (e instanceof AiValidationError) return NextResponse.json({ error: e.message }, { status: 502 })
    throw e
  }
}
