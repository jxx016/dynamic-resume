import { NextResponse } from 'next/server'
import { getContext } from '@/lib/app-context'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const application = getContext().applications.get(id)
  return application ? NextResponse.json(application) : NextResponse.json({ error: 'application not found' }, { status: 404 })
}
