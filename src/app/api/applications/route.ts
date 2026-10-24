import { NextResponse } from 'next/server'
import { getContext } from '@/lib/app-context'
import { ProviderSchema } from '@/lib/env'
import { newId, nowIso } from '@/lib/ids'
import { profileToResume } from '@/lib/profile/profile-service'

export async function POST(req: Request) {
  const body = await req.json()
  const provider = ProviderSchema.safeParse(body.provider)
  if (!provider.success) return NextResponse.json({ error: `invalid provider: ${body.provider ?? ''}` }, { status: 400 })
  if (!body.jdText?.trim() || !body.job?.url || !body.job?.title) {
    return NextResponse.json({ error: 'job URL/title and jdText are required' }, { status: 400 })
  }
  if (body.tailoringInstructions !== undefined && (typeof body.tailoringInstructions !== 'string' || body.tailoringInstructions.trim().length > 1000)) {
    return NextResponse.json({ error: 'tailoringInstructions must be at most 1000 characters' }, { status: 400 })
  }

  const { store, applications, profiles } = getContext()
  if (body.baseResumeId && !store.get(body.baseResumeId)) return NextResponse.json({ error: 'base resume not found' }, { status: 404 })

  const timestamp = nowIso(() => new Date())
  const application = applications.create({
    id: newId('a', applications.list().length + 1),
    baseResumeId: body.baseResumeId,
    profileSnapshot: body.baseResumeId ? undefined : profileToResume(profiles.get(), `profile_${newId('snapshot', applications.list().length + 1)}`, timestamp),
    job: { url: body.job.url, title: body.job.title, company: body.job.company?.trim() || undefined },
    jdText: body.jdText.trim(),
    tailoringInstructions: body.tailoringInstructions?.trim() || undefined,
    provider: provider.data,
    status: 'draft',
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  return NextResponse.json(application)
}
