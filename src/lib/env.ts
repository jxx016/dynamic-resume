import { z } from 'zod'

export const ProviderSchema = z.enum(['gemini', 'openai'])
export type Provider = z.infer<typeof ProviderSchema>
export const PROVIDERS: readonly Provider[] = ProviderSchema.options

const KEY_VAR: Record<Provider, string> = {
  gemini: 'GEMINI_API_KEY',
  openai: 'OPENAI_API_KEY',
}
const MODEL_VAR: Record<Provider, string> = {
  gemini: 'GEMINI_MODEL',
  openai: 'OPENAI_MODEL',
}
const DEFAULT_MODEL: Record<Provider, string> = {
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-5.6-terra',
}

export class MissingKeyError extends Error {
  constructor(readonly provider: Provider, readonly envVar: string) {
    super(`${envVar} is not set`)
    this.name = 'MissingKeyError'
  }
}

export function getProviderEnv(provider: Provider): { apiKey: string; model: string } {
  const apiKey = process.env[KEY_VAR[provider]]
  if (!apiKey) throw new MissingKeyError(provider, KEY_VAR[provider])
  return { apiKey, model: process.env[MODEL_VAR[provider]] ?? DEFAULT_MODEL[provider] }
}

export function configuredProviders(): Provider[] {
  return PROVIDERS.filter(p => Boolean(process.env[KEY_VAR[p]]))
}

export function defaultProvider(): Provider {
  const configured = configuredProviders()
  if (configured.length === 0) {
    throw new Error('No AI provider configured: set GEMINI_API_KEY or OPENAI_API_KEY')
  }
  const preferred = process.env.AI_PROVIDER
  const parsed = ProviderSchema.safeParse(preferred)
  if (parsed.success && configured.includes(parsed.data)) return parsed.data
  return configured[0]
}
