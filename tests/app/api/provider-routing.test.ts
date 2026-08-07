import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setContextForTest } from '@/lib/app-context'
import { SqliteResumeStore } from '@/lib/store/sqlite-store'
import { StructuredClient } from '@/lib/ai/structured-client'
import { POST as tailorPost } from '@/app/api/tailor/route'
import { GET as providersGet } from '@/app/api/providers/route'
import type { Resume } from '@/lib/schema/resume'

const base = {
  id: 'a', label: 'x', isBase: true,
  basics: { name: 'Jo', email: '', phone: '', location: '', links: [] },
  summary: 'S', experience: [], education: [], skills: [], projects: [],
  meta: { createdAt: '', updatedAt: '' },
} as Resume

const modelOut = JSON.stringify({
  tailoredResume: base,
  changeLog: [],
  suggestions: [],
  atsReport: { jdKeywords: [], matched: [], missing: [], score: 10 },
})

const OLD = { ...process.env }
let requested: string[] = []

beforeEach(() => {
  requested = []
  const store = new SqliteResumeStore(':memory:')
  store.create(base)
  const fake = new StructuredClient({ generate: async () => modelOut })
  setContextForTest({
    store,
    clientFor: (p) => { requested.push(p); return fake },
  })
})

afterEach(() => {
  setContextForTest(null)
  process.env = { ...OLD }
})

function tailorReq(body: Record<string, unknown>) {
  return new Request('http://t/api/tailor', { method: 'POST', body: JSON.stringify(body) })
}

describe('provider selection on POST /api/tailor', () => {
  it('uses the requested provider', async () => {
    const res = await tailorPost(tailorReq({ baseResumeId: 'a', jdText: 'JD', provider: 'openai' }))
    expect(res.status).toBe(200)
    expect(requested).toEqual(['openai'])
  })

  it('falls back to the configured default when provider is omitted', async () => {
    process.env.GEMINI_API_KEY = 'g-key'
    delete process.env.OPENAI_API_KEY
    delete process.env.AI_PROVIDER
    const res = await tailorPost(tailorReq({ baseResumeId: 'a', jdText: 'JD' }))
    expect(res.status).toBe(200)
    expect(requested).toEqual(['gemini'])
  })

  it('rejects an unknown provider with 400', async () => {
    const res = await tailorPost(tailorReq({ baseResumeId: 'a', jdText: 'JD', provider: 'bogus' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/invalid provider/)
    expect(requested).toEqual([])
  })

  it('returns 400 when no provider is configured and none is given', async () => {
    delete process.env.GEMINI_API_KEY
    delete process.env.OPENAI_API_KEY
    const res = await tailorPost(tailorReq({ baseResumeId: 'a', jdText: 'JD' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/GEMINI_API_KEY|OPENAI_API_KEY/)
  })
})

describe('GET /api/providers', () => {
  it('reports configured providers and the default', async () => {
    process.env.GEMINI_API_KEY = 'g-key'
    process.env.OPENAI_API_KEY = 'o-key'
    process.env.AI_PROVIDER = 'openai'
    expect(await (await providersGet()).json()).toEqual({
      configured: ['gemini', 'openai'], default: 'openai',
    })
  })

  it('reports an empty list with a null default when nothing is configured', async () => {
    delete process.env.GEMINI_API_KEY
    delete process.env.OPENAI_API_KEY
    expect(await (await providersGet()).json()).toEqual({ configured: [], default: null })
  })
})
