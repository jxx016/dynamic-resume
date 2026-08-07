import { NextResponse } from 'next/server'
import { getContext } from '@/lib/app-context'
import { tailorResume } from '@/lib/agents/tailor'
import { pickBase } from '@/lib/agents/base-picker'
import { AiValidationError } from '@/lib/ai/structured-client'

export async function POST(req: Request) {
  const { baseResumeId, jdText } = await req.json()
  if (!jdText?.trim()) return NextResponse.json({ error: 'jdText is required' }, { status: 400 })
  const { store, client } = getContext()
  try {
    let id = baseResumeId
    if (baseResumeId === 'auto') {
      const resumes = store.list()
      if (resumes.length === 0) return NextResponse.json({ error: 'no base resumes' }, { status: 400 })
      id = await pickBase(client, jdText, resumes)
    }
    const base = store.get(id)
    if (!base) return NextResponse.json({ error: 'resume not found' }, { status: 404 })
    return NextResponse.json(await tailorResume(client, base, jdText))
  } catch (e) {
    if (e instanceof AiValidationError) return NextResponse.json({ error: e.message }, { status: 502 })
    throw e
  }
}
