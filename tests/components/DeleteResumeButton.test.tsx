// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { DeleteResumeButton } from '@/components/DeleteResumeButton'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

beforeEach(() => { vi.restoreAllMocks(); push.mockClear() })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('DeleteResumeButton', () => {
  it('asks for confirmation before deleting anything', () => {
    const fetchSpy = vi.fn()
    global.fetch = fetchSpy as unknown as typeof fetch
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(<DeleteResumeButton resumeId="r_1" />)
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('deletes and redirects to the library on confirm', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<DeleteResumeButton resumeId="r_1" />)
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/'))
    expect(global.fetch).toHaveBeenCalledWith('/api/resumes/r_1', { method: 'DELETE' })
  })

  it('surfaces an error and does not redirect when the delete fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<DeleteResumeButton resumeId="r_1" />)
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))

    await waitFor(() => expect(screen.getByText(/failed to delete/i)).toBeDefined())
    expect(push).not.toHaveBeenCalled()
  })
})
