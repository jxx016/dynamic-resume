import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { StructuredClient, AiValidationError } from '@/lib/ai/structured-client'

const Schema = z.object({ n: z.number() })

describe('StructuredClient.generateStructured', () => {
  it('parses valid JSON on the first try', async () => {
    const generate = vi.fn().mockResolvedValue('{"n": 5}')
    const c = new StructuredClient({ generate })
    expect(await c.generateStructured('p', Schema)).toEqual({ n: 5 })
    expect(generate).toHaveBeenCalledTimes(1)
  })
  it('retries once with a repair prompt, then succeeds', async () => {
    const generate = vi.fn()
      .mockResolvedValueOnce('not json')
      .mockResolvedValueOnce('{"n": 7}')
    const c = new StructuredClient({ generate })
    expect(await c.generateStructured('p', Schema)).toEqual({ n: 7 })
    expect(generate).toHaveBeenCalledTimes(2)
    expect(generate.mock.calls[1][0]).toMatch(/valid JSON/i)
  })
  it('throws AiValidationError after the repair also fails', async () => {
    const generate = vi.fn().mockResolvedValue('still not json')
    const c = new StructuredClient({ generate })
    await expect(c.generateStructured('p', Schema)).rejects.toBeInstanceOf(AiValidationError)
    expect(generate).toHaveBeenCalledTimes(2)
  })

  // Regression: without the target schema in the prompt, models guess a
  // plausible-but-wrong shape (real Gemini returned the JSON Resume standard
  // for our resume import, which failed validation twice and errored out).
  it('describes the target schema in the prompt', async () => {
    const generate = vi.fn().mockResolvedValue('{"n": 1}')
    const Nested = z.object({ bullets: z.array(z.object({ tags: z.array(z.string()) })) })
    const c = new StructuredClient({ generate })
    await c.generateStructured('p', Nested).catch(() => {})

    const sent = generate.mock.calls[0][0]
    // Nested field names the model could not otherwise guess must be present.
    expect(sent).toContain('bullets')
    expect(sent).toContain('tags')
  })

  it('includes the validation errors in the repair prompt', async () => {
    // Syntactically valid JSON of the wrong shape — the exact failure mode
    // the old repair prompt could not fix, because it only said "send JSON".
    const generate = vi.fn()
      .mockResolvedValueOnce('{"wrongField": "x"}')
      .mockResolvedValueOnce('{"n": 3}')
    const c = new StructuredClient({ generate })
    expect(await c.generateStructured('p', Schema)).toEqual({ n: 3 })

    const repair = generate.mock.calls[1][0]
    // The specific Zod complaint, not a generic "send valid JSON" nudge.
    expect(repair).toContain('expected number')
    expect(repair).toContain('wrongField') // the rejected reply is echoed back
  })
})
