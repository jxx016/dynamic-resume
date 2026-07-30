import { describe, it, expect, afterEach } from 'vitest'
import { getEnv } from '@/lib/env'

const OLD = { ...process.env }
afterEach(() => { process.env = { ...OLD } })

describe('getEnv', () => {
  it('reads key and defaults the model', () => {
    process.env.GEMINI_API_KEY = 'k'
    delete process.env.GEMINI_MODEL
    expect(getEnv()).toEqual({ geminiApiKey: 'k', geminiModel: 'gemini-2.5-flash' })
  })
  it('throws when the key is missing', () => {
    delete process.env.GEMINI_API_KEY
    expect(() => getEnv()).toThrow(/GEMINI_API_KEY/)
  })
})
