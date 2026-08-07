import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setContextForTest } from '@/lib/app-context'
import { SqliteResumeStore } from '@/lib/store/sqlite-store'
import { StructuredClient } from '@/lib/ai/structured-client'
import { POST } from '@/app/api/tailor/route'
import type { Resume } from '@/lib/schema/resume'

const base = { id: 'a', label: 'x', isBase: true,
  basics: { name: 'Jo', email: '', phone: '', location: '', links: [] },
  summary: 'S', experience: [], education: [], skills: [], projects: [],
  meta: { createdAt: '', updatedAt: '' } } as Resume

const modelOut = JSON.stringify({
  tailoredResume: base, changeLog: [],
  suggestions: [{ text: 'X', rationale: 'y', status: 'accepted' }],
  atsReport: { jdKeywords: [], matched: [], missing: [], score: 10 },
})

const OLD = { ...process.env }

beforeEach(() => {
  // The request below omits `provider`, so the route falls back to the
  // configured default; give it one key to resolve against.
  process.env.GEMINI_API_KEY = 'g-key'
  const store = new SqliteResumeStore(':memory:'); store.create(base)
  const fakeClient = new StructuredClient({ generate: async () => modelOut })
  setContextForTest({ store, clientFor: () => fakeClient })
})

afterEach(() => {
  setContextForTest(null)
  process.env = { ...OLD }
})

describe('POST /api/tailor', () => {
  it('returns a TailoringResult with pending suggestions', async () => {
    const req = new Request('http://t/api/tailor', {
      method: 'POST', body: JSON.stringify({ baseResumeId: 'a', jdText: 'JD' }),
    })
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.suggestions[0].status).toBe('pending')
  })
})
