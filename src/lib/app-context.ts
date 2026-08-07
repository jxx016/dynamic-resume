import { SqliteResumeStore } from '@/lib/store/sqlite-store'
import { StructuredClient } from '@/lib/ai/structured-client'
import { createRealTransport } from '@/lib/ai/transport'
import type { ResumeStore } from '@/lib/store/resume-store'

export interface AppContext { store: ResumeStore; client: StructuredClient }
let override: AppContext | null = null
let realStore: ResumeStore | null = null
let realClient: StructuredClient | null = null

export function setContextForTest(ctx: AppContext | null) { override = ctx }
export function getContext(): AppContext {
  if (override) return override
  if (!realStore) realStore = new SqliteResumeStore(process.env.DB_PATH ?? 'data/resumes.db')
  const store = realStore
  return {
    store,
    // Build the Gemini client lazily so store-only paths don't require GEMINI_API_KEY.
    get client(): StructuredClient {
      if (!realClient) realClient = new StructuredClient(createRealTransport())
      return realClient
    },
  }
}
