import { ProviderSchema, defaultProvider, MissingKeyError, type Provider } from '@/lib/env'
import { getContext } from '@/lib/app-context'
import type { StructuredClient } from './structured-client'

export type ProviderResolution =
  | { ok: true; provider: Provider; client: StructuredClient }
  | { ok: false; error: string }

/**
 * Resolves the provider for a request body's `provider` field (absent → the
 * configured default) and returns its client. Every failure here is a caller
 * or configuration problem, so routes map `ok: false` to HTTP 400.
 */
export function resolveProviderClient(raw: unknown): ProviderResolution {
  let provider: Provider
  if (raw === undefined || raw === null) {
    try {
      provider = defaultProvider()
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  } else {
    const parsed = ProviderSchema.safeParse(raw)
    if (!parsed.success) return { ok: false, error: `invalid provider: ${String(raw)}` }
    provider = parsed.data
  }

  try {
    return { ok: true, provider, client: getContext().clientFor(provider) }
  } catch (e) {
    if (e instanceof MissingKeyError) return { ok: false, error: e.message }
    throw e
  }
}
