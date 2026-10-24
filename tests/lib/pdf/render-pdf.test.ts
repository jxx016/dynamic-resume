import { describe, it, expect } from 'vitest'
import { renderResumePdf } from '@/lib/pdf/render-pdf'
import type { Resume } from '@/lib/schema/resume'

const resume = { id: 'a', label: 'x', isBase: true,
  basics: { name: 'Jo Candidate', email: 'jo@x.com', phone: '', location: 'NYC', links: [] },
  summary: 'Product manager.',
  experience: [{ company: 'Acme', title: 'PM', start: '2020', end: '2023', location: 'NYC',
                 bullets: [{ id: 'b1', text: 'Shipped X', tags: [] }] }],
  education: [], skills: [{ name: 'SQL', category: 'tech' }], projects: [],
  meta: { createdAt: '', updatedAt: '' } } as Resume

describe('renderResumePdf', () => {
  it('produces a non-trivial PDF buffer', async () => {
    const buf = await renderResumePdf(resume)
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-')
    expect(buf.length).toBeGreaterThan(1000)
  })

  it('renders identical bytes for the same resume', async () => {
    const a = await renderResumePdf(resume)
    const b = await renderResumePdf(resume)
    expect(a.equals(b)).toBe(true)
  })
})
