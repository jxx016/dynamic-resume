import { z } from 'zod'
import { GeminiClient } from '@/lib/ai/gemini'
import { importPrompt } from '@/lib/ai/prompts'
import { ResumeSchema, type Resume } from '@/lib/schema/resume'

const BodySchema = ResumeSchema.omit({ id: true, label: true, isBase: true, sourceResumeId: true, meta: true })

export async function importResume(
  client: GeminiClient,
  rawText: string,
  meta: { id: string; label: string; createdAt: string },
): Promise<Resume> {
  const body = await client.generateStructured(importPrompt(rawText), BodySchema)
  return ResumeSchema.parse({
    ...body, id: meta.id, label: meta.label, isBase: true,
    meta: { createdAt: meta.createdAt, updatedAt: meta.createdAt },
  })
}
