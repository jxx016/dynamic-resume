import { NextResponse } from 'next/server'
import { getContext } from '@/lib/app-context'
import { importResume } from '@/lib/import/resume-importer'
import { extractText } from '@/lib/import/extract-text'
import { newId, nowIso } from '@/lib/ids'
import { AiValidationError } from '@/lib/ai/gemini'

export async function GET() {
  return NextResponse.json(getContext().store.list())
}

export async function POST(req: Request) {
  const body = await req.json() // { label, kind, contentBase64 | text }
  const { store, client } = getContext()
  try {
    const buffer = body.kind === 'text'
      ? Buffer.from(body.text ?? '', 'utf-8')
      : Buffer.from(body.contentBase64 ?? '', 'base64')
    const raw = await extractText({ buffer, kind: body.kind })
    const id = newId('r', store.list().length + 1)
    const resume = await importResume(client, raw, { id, label: body.label ?? 'Imported', createdAt: nowIso(() => new Date()) })
    return NextResponse.json(store.create(resume))
  } catch (e) {
    if (e instanceof AiValidationError) return NextResponse.json({ error: e.message }, { status: 502 })
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
