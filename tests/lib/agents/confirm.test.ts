import { describe, it, expect } from 'vitest'
import { applyConfirmations } from '@/lib/agents/confirm'
import type { TailoringResult } from '@/lib/schema/tailoring'
import type { Resume } from '@/lib/schema/resume'

const base = { id: 'a', label: 'x', isBase: false, sourceResumeId: 'src',
  basics: { name: 'Jo', email: '', phone: '', location: '', links: [] },
  summary: 'S', experience: [], education: [], skills: [{ name: 'SQL', category: 'tech' }], projects: [],
  meta: { createdAt: '', updatedAt: '' } } as Resume

const result: TailoringResult = {
  tailoredResume: base,
  changeLog: [],
  suggestions: [
    { text: 'Kubernetes', rationale: 'JD', status: 'pending' },
    { text: 'Terraform', rationale: 'JD', status: 'pending' },
  ],
  atsReport: { jdKeywords: [], matched: [], missing: [], score: 0 },
}

describe('applyConfirmations', () => {
  it('adds accepted suggestions as skills and drops rejected', () => {
    const final = applyConfirmations(result, [{ index: 0, accept: true }, { index: 1, accept: false }])
    expect(final.skills.some(s => s.name === 'Kubernetes')).toBe(true)
    expect(final.skills.some(s => s.name === 'Terraform')).toBe(false)
  })

  it('never turns a pending question or instruction into a skill', () => {
    const questioned: TailoringResult = {
      ...result,
      suggestions: [{ text: 'Explicitly mention AWS architecture if you have relevant experience.', rationale: 'JD', status: 'pending' }],
    }

    const final = applyConfirmations(questioned, [{ index: 0, accept: true }])

    expect(final.skills.map(skill => skill.name)).toEqual(['SQL'])
  })
})
