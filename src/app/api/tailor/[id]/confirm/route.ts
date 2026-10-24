import { NextResponse } from 'next/server'
import { getContext } from '@/lib/app-context'
import { applyConfirmations } from '@/lib/agents/confirm'
import { TailoringResultSchema } from '@/lib/schema/tailoring'
import { newId, nowIso } from '@/lib/ids'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json() // { result, decisions }
  const parsed = TailoringResultSchema.safeParse(body.result)
  if (!parsed.success) return NextResponse.json({ error: 'invalid result' }, { status: 400 })
  const { store } = getContext()
  const finalBody = applyConfirmations(parsed.data, body.decisions ?? [])
  const saved = store.create({
    ...finalBody,
    id: newId('t', store.list().length + 1),
    isBase: false,
    sourceResumeId: id,
    label: `Tailored from ${id}`,
    meta: { createdAt: nowIso(() => new Date()), updatedAt: nowIso(() => new Date()) },
  })
  return NextResponse.json(saved)
}
