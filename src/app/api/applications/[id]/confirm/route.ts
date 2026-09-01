import { NextResponse } from 'next/server'
import { getContext } from '@/lib/app-context'
import { applyConfirmations } from '@/lib/agents/confirm'
import { newId, nowIso } from '@/lib/ids'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { applications, store } = getContext()
  const application = applications.get(id)
  if (!application) return NextResponse.json({ error: 'application not found' }, { status: 404 })
  if (!application.tailoringResult) return NextResponse.json({ error: 'application has no generated resume' }, { status: 409 })
  if (application.finalResumeId) {
    const existing = store.get(application.finalResumeId)
    return existing ? NextResponse.json(existing) : NextResponse.json({ error: 'final resume not found' }, { status: 500 })
  }

  const { decisions = [] } = await req.json()
  const body = applyConfirmations(application.tailoringResult, decisions)
  const timestamp = nowIso(() => new Date())
  const finalResume = store.create({
    ...body,
    id: newId('t', store.list().length + 1),
    label: `${application.job.title} — tailored`,
    isBase: false,
    sourceResumeId: application.baseResumeId,
    meta: { createdAt: timestamp, updatedAt: timestamp },
  })
  applications.update(id, {
    ...application,
    status: 'finalized',
    finalResumeId: finalResume.id,
    updatedAt: timestamp,
  })
  return NextResponse.json(finalResume)
}
