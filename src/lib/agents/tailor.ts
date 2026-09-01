import { StructuredClient } from '@/lib/ai/structured-client'
import { tailorPrompt } from '@/lib/ai/prompts'
import { TailoringResultSchema, type TailoringResult } from '@/lib/schema/tailoring'
import type { Resume } from '@/lib/schema/resume'

export async function tailorResume(
  client: StructuredClient, base: Resume, jdText: string, tailoringInstructions?: string,
): Promise<TailoringResult> {
  const result = await client.generateStructured(tailorPrompt(base, jdText, tailoringInstructions), TailoringResultSchema)
  return { ...result, suggestions: result.suggestions.map(s => ({ ...s, status: 'pending' as const })) }
}
