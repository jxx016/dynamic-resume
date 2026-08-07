import { z } from 'zod'
import { StructuredClient } from '@/lib/ai/structured-client'
import { pickPrompt } from '@/lib/ai/prompts'
import type { Resume } from '@/lib/schema/resume'

const PickSchema = z.object({ resumeId: z.string(), reason: z.string() })

export async function pickBase(
  client: StructuredClient, jdText: string, resumes: Resume[],
): Promise<string> {
  const candidates = resumes.map(r => ({ id: r.id, label: r.label, summary: r.summary }))
  const { resumeId } = await client.generateStructured(pickPrompt(jdText, candidates), PickSchema)
  return resumes.some(r => r.id === resumeId) ? resumeId : resumes[0].id
}
