import { describe, it, expect, afterEach } from 'vitest'
import { createTransport } from '@/lib/ai/transport'
import { MissingKeyError } from '@/lib/env'

const OLD = { ...process.env }
afterEach(() => { process.env = { ...OLD } })

describe('createTransport', () => {
  it('builds a gemini transport when the key is present', () => {
    process.env.GEMINI_API_KEY = 'g-key'
    expect(typeof createTransport('gemini').generate).toBe('function')
  })

  it('builds an openai transport when the key is present', () => {
    process.env.OPENAI_API_KEY = 'o-key'
    expect(typeof createTransport('openai').generate).toBe('function')
  })

  it('throws MissingKeyError for a provider with no key', () => {
    delete process.env.OPENAI_API_KEY
    expect(() => createTransport('openai')).toThrow(MissingKeyError)
    delete process.env.GEMINI_API_KEY
    expect(() => createTransport('gemini')).toThrow(MissingKeyError)
  })
})
