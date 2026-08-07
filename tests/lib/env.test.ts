import { describe, it, expect, afterEach } from 'vitest'
import {
  getProviderEnv, configuredProviders, defaultProvider, MissingKeyError,
} from '@/lib/env'

const OLD = { ...process.env }
afterEach(() => { process.env = { ...OLD } })

function clearProviderEnv() {
  delete process.env.GEMINI_API_KEY
  delete process.env.OPENAI_API_KEY
  delete process.env.GEMINI_MODEL
  delete process.env.OPENAI_MODEL
  delete process.env.AI_PROVIDER
}

describe('getProviderEnv', () => {
  it('returns the gemini key and default model', () => {
    clearProviderEnv()
    process.env.GEMINI_API_KEY = 'g-key'
    expect(getProviderEnv('gemini')).toEqual({ apiKey: 'g-key', model: 'gemini-2.5-flash' })
  })

  it('returns the openai key and default model', () => {
    clearProviderEnv()
    process.env.OPENAI_API_KEY = 'o-key'
    expect(getProviderEnv('openai')).toEqual({ apiKey: 'o-key', model: 'gpt-5.6-terra' })
  })

  it('honors a model override', () => {
    clearProviderEnv()
    process.env.OPENAI_API_KEY = 'o-key'
    process.env.OPENAI_MODEL = 'gpt-5.6-sol'
    expect(getProviderEnv('openai').model).toBe('gpt-5.6-sol')
  })

  it('throws MissingKeyError naming the exact env var', () => {
    clearProviderEnv()
    expect(() => getProviderEnv('openai')).toThrow(MissingKeyError)
    expect(() => getProviderEnv('openai')).toThrow(/OPENAI_API_KEY/)
    expect(() => getProviderEnv('gemini')).toThrow(/GEMINI_API_KEY/)
  })
})

describe('configuredProviders', () => {
  it('lists only providers whose key is set', () => {
    clearProviderEnv()
    expect(configuredProviders()).toEqual([])
    process.env.OPENAI_API_KEY = 'o-key'
    expect(configuredProviders()).toEqual(['openai'])
    process.env.GEMINI_API_KEY = 'g-key'
    expect(configuredProviders()).toEqual(['gemini', 'openai'])
  })
})

describe('defaultProvider', () => {
  it('honors AI_PROVIDER when that provider is configured', () => {
    clearProviderEnv()
    process.env.GEMINI_API_KEY = 'g-key'
    process.env.OPENAI_API_KEY = 'o-key'
    process.env.AI_PROVIDER = 'openai'
    expect(defaultProvider()).toBe('openai')
  })

  it('falls back to the first configured provider when AI_PROVIDER is unset', () => {
    clearProviderEnv()
    process.env.OPENAI_API_KEY = 'o-key'
    expect(defaultProvider()).toBe('openai')
  })

  it('ignores AI_PROVIDER naming an unconfigured provider', () => {
    clearProviderEnv()
    process.env.OPENAI_API_KEY = 'o-key'
    process.env.AI_PROVIDER = 'gemini'
    expect(defaultProvider()).toBe('openai')
  })

  it('throws when no provider is configured', () => {
    clearProviderEnv()
    expect(() => defaultProvider()).toThrow(/GEMINI_API_KEY|OPENAI_API_KEY/)
  })
})
