import { z } from 'zod'
import { StructuredClient } from '@/lib/ai/structured-client'
import { importPrompt } from '@/lib/ai/prompts'
import { ResumeSchema, type Resume } from '@/lib/schema/resume'

/**
 * The model reports how many roles it found in the source text, and we check
 * the transcription against that count. Models intermittently abbreviate long
 * resumes — a real run dropped a role in 1 of 4 attempts — and a shortfall is
 * otherwise invisible: the JSON is well-formed, just missing the user's work
 * history. A mismatch fails validation, which triggers the client's repair
 * retry with the specific shortfall named.
 */
const ImportBodySchema = ResumeSchema
  .omit({ id: true, label: true, isBase: true, sourceResumeId: true, meta: true })
  .extend({
    sourceRoleCount: z.number().int().nonnegative()
      .describe('How many distinct roles/positions appear in the resume text'),
  })
  .superRefine((value, ctx) => {
    if (value.experience.length !== value.sourceRoleCount) {
      ctx.addIssue({
        code: 'custom',
        path: ['experience'],
        message:
          `You transcribed ${value.experience.length} role(s) but counted ` +
          `${value.sourceRoleCount} in the resume text. Return every role — do not omit or merge any.`,
      })
    }
  })

export async function importResume(
  client: StructuredClient,
  rawText: string,
  meta: { id: string; label: string; createdAt: string },
): Promise<Resume> {
  const { sourceRoleCount: _count, ...body } =
    await client.generateStructured(importPrompt(rawText), ImportBodySchema)

  return ResumeSchema.parse({
    ...body, id: meta.id, label: meta.label, isBase: true,
    meta: { createdAt: meta.createdAt, updatedAt: meta.createdAt },
  })
}
