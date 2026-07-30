import { describe, it, expect } from 'vitest'
import { GeminiClient } from '@/lib/ai/gemini'
import { importResume } from '@/lib/import/resume-importer'

const modelBody = JSON.stringify({
  basics: { name: 'Jo', email: '', phone: '', location: '', links: [] },
  summary: 'PM', experience: [], education: [], skills: [], projects: [],
})

describe('importResume', () => {
  it('produces a validated base Resume with stamped meta', async () => {
    const client = new GeminiClient({ generate: async () => modelBody })
    const r = await importResume(client, 'raw', { id: 'r1', label: 'Imported', createdAt: '2026-07-30T00:00:00Z' })
    expect(r.id).toBe('r1')
    expect(r.isBase).toBe(true)
    expect(r.basics.name).toBe('Jo')
    expect(r.meta.createdAt).toBe('2026-07-30T00:00:00Z')
  })
})
