import { NextResponse } from 'next/server'
import { getContext } from '@/lib/app-context'
import { ResumeSchema } from '@/lib/schema/resume'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = getContext().store.get(id)
  return r ? NextResponse.json(r) : NextResponse.json({ error: 'not found' }, { status: 404 })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const parsed = ResumeSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'invalid resume' }, { status: 400 })
  return NextResponse.json(getContext().store.update(id, parsed.data))
}
