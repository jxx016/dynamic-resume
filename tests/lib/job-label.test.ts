import { describe, expect, it } from 'vitest'
import { formatResumePdfFilename, formatTailoredResumeLabel, uniqueTailoredResumeLabel } from '@/lib/job-label'

describe('job labels', () => {
  it('formats company and title together', () => {
    expect(formatTailoredResumeLabel('Demo Corp', 'Forward Deployed Engineer')).toBe('Demo Corp — Forward Deployed Engineer')
  })

  it('deduplicates repeated tailored labels', () => {
    const existing = ['Demo Corp — Forward Deployed Engineer']
    expect(uniqueTailoredResumeLabel(existing, 'Demo Corp', 'Forward Deployed Engineer')).toBe('Demo Corp — Forward Deployed Engineer (2)')
  })

  it('builds a pdf filename from the saved resume label', () => {
    expect(formatResumePdfFilename(
      'John Soh',
      'Future Opportunities Singapore',
      'Solution Architect – Future Opportunities (Singapore)',
      'Accenture — Solution Architect – Future Opportunities (Singapore)',
    )).toBe('John_Soh_Accenture_Solution_Architect_Future_Opportunities_Singapore.pdf')
  })

  it('avoids repeating company text already present in the title', () => {
    expect(formatTailoredResumeLabel('Future Opportunities Singapore', 'Solution Architect – Future Opportunities (Singapore)'))
      .toBe('Solution Architect – Future Opportunities (Singapore)')
  })
})
