import type { ZodType } from 'zod'
import type { GenerateTransport } from './transport'

export class AiValidationError extends Error {
  constructor(msg: string, readonly raw: string) { super(msg); this.name = 'AiValidationError' }
}

function tryParse<T>(raw: string, schema: ZodType<T>): T | null {
  try { return schema.parse(JSON.parse(stripFences(raw))) } catch { return null }
}
function stripFences(s: string): string {
  return s.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
}

export class StructuredClient {
  constructor(private transport: GenerateTransport) {}

  async generateStructured<T>(prompt: string, schema: ZodType<T>): Promise<T> {
    const first = await this.transport.generate(prompt)
    const ok = tryParse(first, schema)
    if (ok) return ok

    const repair = `${prompt}\n\nYour previous reply was not valid JSON matching the required schema. ` +
      `Reply with ONLY valid JSON, no prose, no code fences.`
    const second = await this.transport.generate(repair)
    const ok2 = tryParse(second, schema)
    if (ok2) return ok2

    throw new AiValidationError('Model did not return schema-valid JSON after repair', second)
  }
}
