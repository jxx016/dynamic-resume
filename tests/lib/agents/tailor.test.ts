import { describe, it, expect } from 'vitest'
import { GeminiClient } from '@/lib/ai/gemini'
import { tailorResume } from '@/lib/agents/tailor'
import type { Resume } from '@/lib/schema/resume'

const base = { id: 'a', label: 'x', isBase: true,
  basics: { name: 'Jo', email: '', phone: '', location: '', links: [] },
  summary: 'S', experience: [], education: [], skills: [], projects: [],
  meta: { createdAt: '', updatedAt: '' } } as Resume

const modelOut = JSON.stringify({
  tailoredResume: base,
  changeLog: [{ field: 'summary', before: 'S', after: 'S2', reason: 'match JD' }],
  suggestions: [{ text: 'Add Kubernetes', rationale: 'JD wants it', status: 'accepted' }],
  atsReport: { jdKeywords: ['sql'], matched: [], missing: ['sql'], score: 40 },
})

describe('tailorResume', () => {
  it('validates and forces suggestions to pending', async () => {
    const client = new GeminiClient({ generate: async () => modelOut })
    const r = await tailorResume(client, base, 'JD needs SQL')
    expect(r.suggestions[0].status).toBe('pending')
    expect(r.atsReport.score).toBe(40)
  })
})
