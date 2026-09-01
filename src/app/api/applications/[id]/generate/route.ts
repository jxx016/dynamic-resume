import { NextResponse } from 'next/server'
import { getContext } from '@/lib/app-context'
import { tailorResume } from '@/lib/agents/tailor'
import { AiValidationError } from '@/lib/ai/structured-client'
import { nowIso } from '@/lib/ids'

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { applications, store, clientFor } = getContext()
  const application = applications.get(id)
  if (!application) return NextResponse.json({ error: 'application not found' }, { status: 404 })
  if (application.status === 'ready' || application.status === 'finalized') return NextResponse.json(application)
  if (application.status === 'generating') return NextResponse.json({ error: 'generation already in progress' }, { status: 409 })
  const base = store.get(application.baseResumeId)
  if (!base) return NextResponse.json({ error: 'base resume not found' }, { status: 404 })

  const generating = applications.update(id, { ...application, status: 'generating', error: undefined, updatedAt: nowIso(() => new Date()) })
  try {
    const tailoringResult = await tailorResume(clientFor(generating.provider), base, generating.jdText)
    return NextResponse.json(applications.update(id, {
      ...generating,
      status: 'ready',
      tailoringResult,
      updatedAt: nowIso(() => new Date()),
    }))
  } catch (error) {
    const failed = applications.update(id, {
      ...generating,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Generation failed',
      updatedAt: nowIso(() => new Date()),
    })
    if (error instanceof AiValidationError) return NextResponse.json(failed, { status: 502 })
    return NextResponse.json(failed, { status: 500 })
  }
}
