import { SqliteResumeStore } from '@/lib/store/sqlite-store'
import { GeminiClient } from '@/lib/ai/gemini'
import { createRealTransport } from '@/lib/ai/transport'
import type { ResumeStore } from '@/lib/store/resume-store'

export interface AppContext { store: ResumeStore; client: GeminiClient }
let override: AppContext | null = null
let real: AppContext | null = null

export function setContextForTest(ctx: AppContext | null) { override = ctx }
export function getContext(): AppContext {
  if (override) return override
  if (!real) {
    real = {
      store: new SqliteResumeStore(process.env.DB_PATH ?? 'data/resumes.db'),
      client: new GeminiClient(createRealTransport()),
    }
  }
  return real
}
