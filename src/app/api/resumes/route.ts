import { NextResponse } from 'next/server'
import { getContext } from '@/lib/app-context'
import { importResume } from '@/lib/import/resume-importer'
import { extractText } from '@/lib/import/extract-text'
import { newId, nowIso } from '@/lib/ids'
import { AiValidationError } from '@/lib/ai/structured-client'
import { resolveProviderClient } from '@/lib/ai/resolve-provider'
import { ResumeSchema } from '@/lib/schema/resume'

// Body for the AI-free save path: an already-structured resume from the builder.
const ResumeBodySchema = ResumeSchema.omit({ id: true, label: true, isBase: true, sourceResumeId: true, meta: true })

export async function GET() {
  return NextResponse.json(getContext().store.list())
}

export async function POST(req: Request) {
  const body = await req.json() // { label, kind, contentBase64 | text | resume }
  const { store } = getContext()
  try {
    // Non-AI path: builder-produced, already-validated resume. No Gemini call.
    if (body.kind === 'resume') {
      const parsedBody = ResumeBodySchema.parse(body.resume)
      const id = newId('r', store.list().length + 1)
      const createdAt = nowIso(() => new Date())
      const resume = ResumeSchema.parse({
        ...parsedBody,
        id,
        label: body.label ?? 'My Resume',
        isBase: true,
        meta: { createdAt, updatedAt: createdAt },
      })
      return NextResponse.json(store.create(resume))
    }

    const resolved = resolveProviderClient(body.provider)
    if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: 400 })

    const buffer = body.kind === 'text'
      ? Buffer.from(body.text ?? '', 'utf-8')
      : Buffer.from(body.contentBase64 ?? '', 'base64')
    const raw = await extractText({ buffer, kind: body.kind })
    const id = newId('r', store.list().length + 1)
    const resume = await importResume(resolved.client, raw, { id, label: body.label ?? 'Imported', createdAt: nowIso(() => new Date()) })
    return NextResponse.json(store.create(resume))
  } catch (e) {
    if (e instanceof AiValidationError) return NextResponse.json({ error: e.message }, { status: 502 })
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
