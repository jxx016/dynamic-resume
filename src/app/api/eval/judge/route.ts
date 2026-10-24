import { NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveProviderClient } from '@/lib/ai/resolve-provider'
import { EvalJudgeSchema, judgePrompt, resumeToEvalText } from '@/lib/eval/judge'
import { ResumeSchema } from '@/lib/schema/resume'
import { AiValidationError } from '@/lib/ai/structured-client'

const BodySchema = z.object({
  jdText: z.string().min(40),
  resume: ResumeSchema.optional(),
  resumeText: z.string().min(40).optional(),
  provider: z.string().optional(),
})

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'invalid judge request' }, { status: 400 })

  const resumeText = parsed.data.resumeText
    ?? (parsed.data.resume ? resumeToEvalText(parsed.data.resume) : '')
  if (!resumeText) return NextResponse.json({ error: 'resume or resumeText required' }, { status: 400 })

  const resolved = resolveProviderClient(parsed.data.provider)
  if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: 400 })

  try {
    const judgment = await resolved.client.generateStructured(
      judgePrompt(parsed.data.jdText, resumeText),
      EvalJudgeSchema,
    )
    return NextResponse.json(judgment)
  } catch (error) {
    if (error instanceof AiValidationError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
