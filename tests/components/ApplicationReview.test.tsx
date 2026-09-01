// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { ApplicationReview } from '@/components/ApplicationReview'

const ready = {
  id: 'a_1', baseResumeId: 'r_1', job: { url: 'https://jobs.example.com', title: 'Solution Architect' },
  jdText: 'JD', tailoringInstructions: 'Emphasize customer discovery and solution design.', provider: 'gemini', status: 'ready', createdAt: '', updatedAt: '',
  tailoringResult: {
    tailoredResume: { id: 'ignored', label: 'ignored', isBase: false, sourceResumeId: 'r_1', basics: { name: 'Jo', email: '', phone: '', location: '', links: [] }, summary: 'S', experience: [], education: [], skills: [], projects: [], meta: { createdAt: '', updatedAt: '' } },
    changeLog: [], suggestions: [], atsReport: { jdKeywords: [], matched: [], missing: [], score: 75 },
  },
}

beforeEach(() => {
  global.fetch = vi.fn()
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('ApplicationReview', () => {
  it('generates a draft application once and shows its ATS review', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...ready, status: 'draft', tailoringResult: undefined }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ready })

    render(<ApplicationReview applicationId="a_1" />)
    expect(screen.getByText(/generating enhanced resume/i)).toBeDefined()

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/applications/a_1/generate', { method: 'POST' }))
    expect(await screen.findByText(/ATS keyword coverage: 75%/i)).toBeDefined()
    expect(screen.getByText(/customer discovery and solution design/i)).toBeDefined()
  })

  it('shows a retry action when a saved generation failed', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ ...ready, status: 'failed', error: 'Provider timed out' }) })

    render(<ApplicationReview applicationId="a_1" />)

    expect(await screen.findByText(/provider timed out/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /try generation again/i })).toBeDefined()
  })
})
