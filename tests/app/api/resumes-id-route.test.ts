import { describe, it, expect, beforeEach } from 'vitest'
import { setContextForTest } from '@/lib/app-context'
import { SqliteResumeStore } from '@/lib/store/sqlite-store'
import { StructuredClient } from '@/lib/ai/structured-client'
import { PUT, DELETE } from '@/app/api/resumes/[id]/route'
import type { Resume } from '@/lib/schema/resume'

const base = { id: 'a', label: 'x', isBase: true,
  basics: { name: 'Jo', email: '', phone: '', location: '', links: [] },
  summary: 'S', experience: [], education: [], skills: [], projects: [],
  meta: { createdAt: '', updatedAt: '' } } as Resume

let store: SqliteResumeStore

beforeEach(() => {
  store = new SqliteResumeStore(':memory:')
  store.create(base)
  const fakeClient = new StructuredClient({ generate: async () => '' })
  setContextForTest({ store, clientFor: () => fakeClient })
})

describe('PUT /api/resumes/[id]', () => {
  it('updates and returns 200 for an existing id', async () => {
    const updated = { ...base, summary: 'Updated' }
    const req = new Request('http://t/api/resumes/a', {
      method: 'PUT', body: JSON.stringify(updated),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: 'a' }) })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.summary).toBe('Updated')
  })

  it('returns 404 for a nonexistent id', async () => {
    const req = new Request('http://t/api/resumes/missing', {
      method: 'PUT', body: JSON.stringify({ ...base, id: 'missing' }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: 'missing' }) })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/resumes/[id]', () => {
  it('removes an existing resume and returns 204', async () => {
    const res = await DELETE(new Request('http://t/api/resumes/a', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'a' }),
    })
    expect(res.status).toBe(204)
    expect(store.get('a')).toBeNull()
  })

  it('returns 404 for a nonexistent id', async () => {
    const res = await DELETE(new Request('http://t/api/resumes/missing', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'missing' }),
    })
    expect(res.status).toBe(404)
  })
})
