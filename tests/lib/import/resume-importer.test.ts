import { describe, it, expect, vi } from 'vitest'
import { StructuredClient } from '@/lib/ai/structured-client'
import { importResume } from '@/lib/import/resume-importer'

const role = (company: string) => ({
  company, title: 'Engineer', start: '2020', end: '2023', location: 'NY',
  bullets: [{ id: `${company}-1`, text: 'Did the thing', tags: [] }],
})

function body(fields: Record<string, unknown>) {
  return JSON.stringify({
    basics: { name: 'Jo', email: '', phone: '', location: '', links: [] },
    summary: 'PM', experience: [], education: [], skills: [], projects: [],
    sourceRoleCount: 0,
    ...fields,
  })
}

const META = { id: 'r1', label: 'Imported', createdAt: '2026-07-30T00:00:00Z' }

describe('importResume', () => {
  it('produces a validated base Resume with stamped meta', async () => {
    const client = new StructuredClient({ generate: async () => body({}) })
    const r = await importResume(client, 'raw', META)
    expect(r.id).toBe('r1')
    expect(r.isBase).toBe(true)
    expect(r.basics.name).toBe('Jo')
    expect(r.meta.createdAt).toBe('2026-07-30T00:00:00Z')
  })

  // Regression: the model intermittently transcribed only some roles, silently
  // losing work history — 1 of 4 real runs dropped a role even after the prompt
  // demanded completeness. Making it declare the source count lets the existing
  // repair retry catch the shortfall.
  it('repairs when fewer roles are transcribed than the model counted', async () => {
    const short = body({ sourceRoleCount: 2, experience: [role('Acme')] })
    const full = body({ sourceRoleCount: 2, experience: [role('Acme'), role('Globex')] })
    const generate = vi.fn()
      .mockResolvedValueOnce(short)
      .mockResolvedValueOnce(full)

    const r = await importResume(new StructuredClient({ generate }), 'raw', META)

    expect(r.experience.map(e => e.company)).toEqual(['Acme', 'Globex'])
    expect(generate).toHaveBeenCalledTimes(2)
    // The repair prompt must name the shortfall, not just say "invalid JSON".
    expect(String(generate.mock.calls[1][0])).toMatch(/1 role|2 role|every role/i)
  })

  it('does not leak the bookkeeping count into the stored resume', async () => {
    const client = new StructuredClient({
      generate: async () => body({ sourceRoleCount: 1, experience: [role('Acme')] }),
    })
    const r = await importResume(client, 'raw', META)
    expect('sourceRoleCount' in r).toBe(false)
  })
})
