import { describe, it, expect } from 'vitest'
import { ResumeSchema } from '@/lib/schema/resume'

const valid = {
  id: 'r1', label: 'PM roles', isBase: true,
  basics: { name: 'Jo', email: 'jo@x.com', phone: '', location: 'NYC', links: [] },
  summary: 'PM.',
  experience: [{ company: 'Acme', title: 'PM', start: '2020', end: '2023', location: 'NYC',
                 bullets: [{ id: 'b1', text: 'Shipped X', tags: ['product'] }] }],
  education: [], skills: [{ name: 'SQL', category: 'tech' }], projects: [],
  meta: { createdAt: '2026-07-30T00:00:00Z', updatedAt: '2026-07-30T00:00:00Z' },
}

describe('ResumeSchema', () => {
  it('accepts a valid resume', () => {
    expect(ResumeSchema.parse(valid).basics.name).toBe('Jo')
  })
  it('rejects a bad email', () => {
    expect(() => ResumeSchema.parse({ ...valid, basics: { ...valid.basics, email: 'nope' } })).toThrow()
  })
  it('rejects a missing bullet id', () => {
    const bad = structuredClone(valid); delete (bad.experience[0].bullets[0] as any).id
    expect(() => ResumeSchema.parse(bad)).toThrow()
  })
})
