// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { ResumeImport } from '@/components/ResumeImport'

function mockFetch(impl: (url: string, init?: RequestInit) => unknown) {
  global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
    const body = impl(url, init)
    if (url === '/api/providers') {
      return { ok: true, json: async () => ({ configured: ['gemini'], default: 'gemini' }) }
    }
    return body
  }) as unknown as typeof fetch
}

beforeEach(() => vi.restoreAllMocks())
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('ResumeImport', () => {
  it('posts pasted resume text as a text import', async () => {
    const calls: { url: string; body: Record<string, unknown> }[] = []
    mockFetch((url, init) => {
      calls.push({ url, body: JSON.parse(String(init?.body ?? '{}')) })
      return { ok: true, json: async () => ({ id: 'r1' }) }
    })
    const onImported = vi.fn()
    render(<ResumeImport onImported={onImported} />)

    fireEvent.change(screen.getByLabelText(/label/i), { target: { value: 'PM roles' } })
    fireEvent.change(screen.getByLabelText(/paste/i), { target: { value: 'Jo Candidate\nPM at Acme' } })
    fireEvent.click(screen.getByRole('button', { name: /import/i }))

    await waitFor(() => expect(onImported).toHaveBeenCalled())
    const post = calls.find(c => c.url === '/api/resumes')
    expect(post?.body).toMatchObject({
      kind: 'text',
      label: 'PM roles',
      text: 'Jo Candidate\nPM at Acme',
    })
  })

  it('surfaces the server error message when the import fails', async () => {
    mockFetch(() => ({ ok: false, json: async () => ({ error: 'empty extraction' }) }))
    render(<ResumeImport onImported={() => {}} />)

    fireEvent.change(screen.getByLabelText(/paste/i), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: /import/i }))

    await waitFor(() => expect(screen.getByText(/empty extraction/i)).toBeDefined())
  })

  it('posts a selected PDF file as a base64 import', async () => {
    const calls: { url: string; body: Record<string, unknown> }[] = []
    mockFetch((url, init) => {
      calls.push({ url, body: JSON.parse(String(init?.body ?? '{}')) })
      return { ok: true, json: async () => ({ id: 'r2' }) }
    })
    const onImported = vi.fn()
    render(<ResumeImport onImported={onImported} />)

    const file = new File([new Uint8Array([1, 2, 3])], 'my-resume.pdf', { type: 'application/pdf' })
    fireEvent.change(screen.getByLabelText(/upload/i), { target: { files: [file] } })

    const button = () => screen.getByRole('button', { name: /import/i }) as HTMLButtonElement
    await waitFor(() => expect(button().disabled).toBe(false))
    fireEvent.click(button())

    await waitFor(() => expect(onImported).toHaveBeenCalled())
    const post = calls.find(c => c.url === '/api/resumes')
    expect(post?.body.kind).toBe('pdf')
    expect(post?.body.contentBase64).toBe('AQID') // base64 of bytes 1,2,3
  })

  it('treats a .docx upload as a docx import', async () => {
    const calls: { url: string; body: Record<string, unknown> }[] = []
    mockFetch((url, init) => {
      calls.push({ url, body: JSON.parse(String(init?.body ?? '{}')) })
      return { ok: true, json: async () => ({ id: 'r3' }) }
    })
    render(<ResumeImport onImported={() => {}} />)

    const file = new File([new Uint8Array([9])], 'cv.docx')
    fireEvent.change(screen.getByLabelText(/upload/i), { target: { files: [file] } })

    const button = () => screen.getByRole('button', { name: /import/i }) as HTMLButtonElement
    await waitFor(() => expect(button().disabled).toBe(false))
    fireEvent.click(button())

    await waitFor(() => expect(calls.some(c => c.url === '/api/resumes')).toBe(true))
    expect(calls.find(c => c.url === '/api/resumes')?.body.kind).toBe('docx')
  })

  it('disables import until there is something to import', () => {
    mockFetch(() => ({ ok: true, json: async () => ({}) }))
    render(<ResumeImport onImported={() => {}} />)
    expect((screen.getByRole('button', { name: /import/i }) as HTMLButtonElement).disabled).toBe(true)
  })
})
