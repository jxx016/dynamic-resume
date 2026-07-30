import { describe, it, expect } from 'vitest'
import { tailorPrompt, importPrompt, pickPrompt } from '@/lib/ai/prompts'
import type { Resume } from '@/lib/schema/resume'

const base = { id: 'a', label: 'x', isBase: true,
  basics: { name: 'Jo', email: '', phone: '', location: '', links: [] },
  summary: 'S', experience: [], education: [], skills: [], projects: [],
  meta: { createdAt: '', updatedAt: '' } } as Resume

describe('prompts', () => {
  it('tailorPrompt includes the JD, the honesty rule, and JSON-only instruction', () => {
    const p = tailorPrompt(base, 'Senior PM, needs SQL')
    expect(p).toContain('Senior PM, needs SQL')
    expect(p).toMatch(/do not (invent|fabricate)/i)
    expect(p).toMatch(/suggestions/i)
    expect(p).toMatch(/JSON/i)
  })
  it('importPrompt embeds the raw text', () => {
    expect(importPrompt('RAW RESUME TEXT')).toContain('RAW RESUME TEXT')
  })
  it('pickPrompt lists candidate labels', () => {
    expect(pickPrompt('jd', [{ id: 'a', label: 'PM', summary: 's' }])).toContain('PM')
  })
})
