import { z, type ZodType } from 'zod'
import type { GenerateTransport } from './transport'

export class AiValidationError extends Error {
  constructor(msg: string, readonly raw: string) { super(msg); this.name = 'AiValidationError' }
}

function stripFences(s: string): string {
  return s.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
}

/**
 * Describe the target shape to the model. Without this, models fill in a
 * plausible-looking shape from memory — real Gemini answered our resume
 * import with the JSON Resume standard, which is valid JSON, valid *a*
 * resume, and wrong for our schema.
 */
function describeSchema(schema: ZodType<unknown>): string {
  try {
    return JSON.stringify(z.toJSONSchema(schema))
  } catch {
    return '' // Some schemas can't be represented; fall back to the bare prompt.
  }
}

type ParseOutcome<T> = { ok: true; value: T } | { ok: false; problems: string }

function tryParse<T>(raw: string, schema: ZodType<T>): ParseOutcome<T> {
  let json: unknown
  try {
    json = JSON.parse(stripFences(raw))
  } catch (e) {
    return { ok: false, problems: `The reply was not parseable JSON: ${(e as Error).message}` }
  }
  const result = schema.safeParse(json)
  return result.success
    ? { ok: true, value: result.data }
    : { ok: false, problems: z.prettifyError(result.error) }
}

export class StructuredClient {
  constructor(private transport: GenerateTransport) {}

  async generateStructured<T>(prompt: string, schema: ZodType<T>): Promise<T> {
    const shape = describeSchema(schema)
    const first = shape
      ? `${prompt}\n\nYour reply MUST be a single JSON object validating against this JSON Schema. ` +
        `Use exactly these field names — do not substitute a different resume format:\n${shape}`
      : prompt

    const attempt1 = await this.transport.generate(first)
    const parsed1 = tryParse(attempt1, schema)
    if (parsed1.ok) return parsed1.value

    // Tell the model exactly what was wrong; "send valid JSON" cannot fix a
    // reply that was already valid JSON of the wrong shape.
    const repair =
      `${first}\n\nYour previous reply was rejected. It was:\n${attempt1}\n\n` +
      `These problems must be fixed:\n${parsed1.problems}\n\n` +
      `Reply with ONLY the corrected JSON — no prose, no code fences.`

    const attempt2 = await this.transport.generate(repair)
    const parsed2 = tryParse(attempt2, schema)
    if (parsed2.ok) return parsed2.value

    throw new AiValidationError(
      `Model did not return schema-valid JSON after repair: ${parsed2.problems}`,
      attempt2,
    )
  }
}
