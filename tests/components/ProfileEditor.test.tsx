// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ProfileEditor } from '@/components/ProfileEditor'

const profile = {
  id: 'profile',
  basics: {
    id: 'basics',
    value: { name: 'Jo', email: 'jo@example.com', phone: '', location: '', links: [] },
    provenance: [{ sourceId: 'r_1', sourceType: 'resume', originalText: 'Jo' }],
  },
  summary: {
    id: 'summary',
    value: 'Engineer',
    provenance: [{ sourceId: 'r_1', sourceType: 'resume', originalText: 'Engineer' }],
  },
  experience: [],
  education: [],
  skills: [{
    id: 'skill_ts',
    value: { name: 'TypeScript', category: 'technical' },
    provenance: [{ sourceId: 'r_1', sourceType: 'resume', originalText: 'TypeScript' }],
  }],
  projects: [],
  updatedAt: '2026-09-03T00:00:00.000Z',
}

beforeEach(() => {
  global.fetch = vi.fn()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ProfileEditor', () => {
  it('loads profile and saves edits', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => profile })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...profile,
          summary: {
            ...profile.summary,
            value: 'Solutions engineer',
            provenance: [{ sourceId: 'user', sourceType: 'user', originalText: 'Solutions engineer' }],
          },
        }),
      })

    render(<ProfileEditor />)
    expect(await screen.findByDisplayValue('Engineer')).toBeDefined()

    fireEvent.change(screen.getByLabelText(/summary/i), { target: { value: 'Solutions engineer' } })
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/profile', expect.objectContaining({ method: 'PUT' })))
    expect(await screen.findByText(/profile saved/i)).toBeDefined()
  })
})
