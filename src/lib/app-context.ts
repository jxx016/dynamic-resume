import { SqliteResumeStore } from '@/lib/store/sqlite-store'
import { StructuredClient } from '@/lib/ai/structured-client'
import { createTransport } from '@/lib/ai/transport'
import type { ResumeStore } from '@/lib/store/resume-store'
import type { Provider } from '@/lib/env'

export interface AppContext {
  store: ResumeStore
  clientFor(provider: Provider): StructuredClient
}

let override: AppContext | null = null
let realStore: ResumeStore | null = null
const realClients = new Map<Provider, StructuredClient>()

export function setContextForTest(ctx: AppContext | null) { override = ctx }

export function getContext(): AppContext {
  if (override) return override
  if (!realStore) realStore = new SqliteResumeStore(process.env.DB_PATH ?? 'data/resumes.db')
  const store = realStore
  return {
    store,
    // Built lazily and cached per provider, so a provider with no key is never constructed.
    clientFor(provider: Provider): StructuredClient {
      let client = realClients.get(provider)
      if (!client) {
        client = new StructuredClient(createTransport(provider))
        realClients.set(provider, client)
      }
      return client
    },
  }
}
