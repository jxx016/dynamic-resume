import { z } from 'zod'
import { StructuredClient } from '@/lib/ai/structured-client'
import { builderPrompt } from '@/lib/ai/prompts'
import { ResumeSchema, type Resume } from '@/lib/schema/resume'

const DraftBody = ResumeSchema.omit({ id: true, label: true, isBase: true, sourceResumeId: true, meta: true })
const TurnSchema = z.object({ message: z.string(), draft: DraftBody })

export async function builderTurn(
  client: StructuredClient,
  history: { role: 'user' | 'assistant'; text: string }[],
  draft: Partial<Resume> | null,
): Promise<{ message: string; draft: Resume }> {
  const out = await client.generateStructured(builderPrompt(history, draft), TurnSchema)
  const stamped = ResumeSchema.parse({
    ...out.draft, id: 'draft', label: 'Draft', isBase: true,
    meta: { createdAt: '', updatedAt: '' },
  })
  return { message: out.message, draft: stamped }
}
