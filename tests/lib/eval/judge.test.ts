import { describe, expect, it } from 'vitest'
import { resumeToEvalText } from '@/lib/eval/judge'

describe('resumeToEvalText', () => {
  it('flattens resume content for the judge', () => {
    const text = resumeToEvalText({
      basics: { name: 'Jo', email: 'jo@x.com', phone: '', location: 'Austin' },
      summary: 'Solutions engineer',
      experience: [{
        title: 'SE', company: 'Acme', start: '2024', end: 'Present', location: 'Remote',
        bullets: [{ text: 'Shipped agents' }],
      }],
      skills: [{ name: 'LangChain' }],
      projects: [],
      education: [],
    })
    expect(text).toContain('Jo')
    expect(text).toContain('Solutions engineer')
    expect(text).toContain('Shipped agents')
    expect(text).toContain('LangChain')
  })
})
