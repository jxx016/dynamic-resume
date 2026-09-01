import { describe, it, expect } from 'vitest'
import { StructuredClient } from '@/lib/ai/structured-client'
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
    const client = new StructuredClient({ generate: async () => modelOut })
    const r = await tailorResume(client, base, 'JD needs SQL')
    expect(r.suggestions[0].status).toBe('pending')
    expect(r.atsReport.score).toBe(40)
  })

  it('restores source roles and rejects model-injected skills when tailoring output drops them', async () => {
    const source = {
      ...base,
      skills: [{ name: 'TypeScript', category: 'tech' }],
      experience: [
        { company: 'Current Co', title: 'Senior AI Engineer', start: '2024', end: 'Present', location: '', bullets: [{ id: 'b_current', text: 'Built agents', tags: [] }] },
        { company: 'Previous Co', title: 'Software Engineer', start: '2018', end: '2024', location: '', bullets: [{ id: 'b_previous', text: 'Built APIs', tags: [] }] },
      ],
    }
    const incomplete = JSON.stringify({
      tailoredResume: {
        ...source,
        experience: [source.experience[1]],
        skills: [...source.skills, { name: 'Explicitly claim AWS architecture experience', category: 'added' }],
      },
      changeLog: [], suggestions: [], atsReport: { jdKeywords: [], matched: [], missing: [], score: 0 },
    })

    const result = await tailorResume(new StructuredClient({ generate: async () => incomplete }), source, 'JD')

    expect(result.tailoredResume.experience.map(role => role.company)).toEqual(['Previous Co', 'Current Co'])
    expect(result.tailoredResume.skills.map(skill => skill.name)).toEqual(['TypeScript'])
  })
})
