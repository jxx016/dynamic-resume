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
})
