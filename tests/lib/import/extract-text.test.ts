import { describe, it, expect, vi } from 'vitest'

vi.mock('pdf-parse', () => ({ default: vi.fn(async () => ({ text: 'PDF CONTENT' })) }))
vi.mock('mammoth', () => ({ default: { extractRawText: vi.fn(async () => ({ value: 'DOCX CONTENT' })) } }))

import { extractText } from '@/lib/import/extract-text'

describe('extractText', () => {
  it('returns plain text as UTF-8', async () => {
    expect(await extractText({ buffer: Buffer.from('hello'), kind: 'text' })).toBe('hello')
  })
  it('extracts pdf text', async () => {
    expect(await extractText({ buffer: Buffer.from(''), kind: 'pdf' })).toBe('PDF CONTENT')
  })
  it('extracts docx text', async () => {
    expect(await extractText({ buffer: Buffer.from(''), kind: 'docx' })).toBe('DOCX CONTENT')
  })
  it('throws on empty extraction', async () => {
    await expect(extractText({ buffer: Buffer.from('   '), kind: 'text' })).rejects.toThrow(/empty/)
  })
})
