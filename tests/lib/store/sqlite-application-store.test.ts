import { describe, expect, it } from 'vitest'
import { SqliteApplicationStore } from '@/lib/store/sqlite-application-store'
import type { Application } from '@/lib/schema/application'

function draft(id: string): Application {
  return {
    id,
    baseResumeId: 'r_1',
    job: { url: 'https://jobs.example.com/123', title: 'Solution Architect' },
    jdText: 'Design cloud solutions for enterprise clients.',
    provider: 'gemini',
    status: 'draft',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  }
}

describe('SqliteApplicationStore', () => {
  it('creates, lists, reads, and updates application state', () => {
    const store = new SqliteApplicationStore(':memory:')
    store.create(draft('a_1'))

    expect(store.list().map(a => a.id)).toEqual(['a_1'])
    expect(store.get('a_1')?.status).toBe('draft')
    expect(store.get('missing')).toBeNull()

    const ready = store.update('a_1', { ...draft('a_1'), status: 'ready', tailoringResult: undefined })
    expect(ready.status).toBe('ready')
    expect(store.get('a_1')?.status).toBe('ready')
  })
})
