import { GeminiClient } from '@/lib/ai/gemini'
import { tailorPrompt } from '@/lib/ai/prompts'
import { TailoringResultSchema, type TailoringResult } from '@/lib/schema/tailoring'
import type { Resume } from '@/lib/schema/resume'

export async function tailorResume(
  client: GeminiClient, base: Resume, jdText: string,
): Promise<TailoringResult> {
  const result = await client.generateStructured(tailorPrompt(base, jdText), TailoringResultSchema)
  return { ...result, suggestions: result.suggestions.map(s => ({ ...s, status: 'pending' as const })) }
}
