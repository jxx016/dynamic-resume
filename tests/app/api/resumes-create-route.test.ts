import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setContextForTest } from '@/lib/app-context'
import { SqliteResumeStore } from '@/lib/store/sqlite-store'
import { POST } from '@/app/api/resumes/route'

const OLD = { ...process.env }

beforeEach(() => {
  // The non-AI save path must work with no provider configured at all.
  delete process.env.GEMINI_API_KEY
  delete process.env.OPENAI_API_KEY
  const store = new SqliteResumeStore(':memory:')
  setContextForTest({
    store,
    clientFor: () => { throw new Error('clientFor must not be called on the non-AI resume save path') },
  })
})

afterEach(() => {
  setContextForTest(null)
  process.env = { ...OLD }
})

function resumesReq(body: Record<string, unknown>) {
  return new Request('http://t/api/resumes', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/resumes (non-AI save path)', () => {
  it('creates a resume with no AI provider configured', async () => {
    const res = await POST(resumesReq({
      kind: 'resume',
      label: 'X',
      resume: {
        basics: { name: 'Jo', email: '', phone: '', location: '', links: [] },
        summary: 'S', experience: [], education: [], skills: [], projects: [],
      },
    }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.label).toBe('X')
    expect(json.isBase).toBe(true)
    expect(typeof json.id).toBe('string')
    expect(json.id.length).toBeGreaterThan(0)
  })
})
