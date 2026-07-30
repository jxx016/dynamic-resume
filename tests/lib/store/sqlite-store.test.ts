import { describe, it, expect } from 'vitest'
import { SqliteResumeStore } from '@/lib/store/sqlite-store'
import type { Resume } from '@/lib/schema/resume'

function sample(id: string): Resume {
  return {
    id, label: 'base', isBase: true,
    basics: { name: 'Jo', email: '', phone: '', location: '', links: [] },
    summary: '', experience: [], education: [], skills: [], projects: [],
    meta: { createdAt: '2026-07-30T00:00:00Z', updatedAt: '2026-07-30T00:00:00Z' },
  }
}

describe('SqliteResumeStore', () => {
  it('creates, gets, lists, and updates', () => {
    const store = new SqliteResumeStore(':memory:')
    store.create(sample('a'))
    store.create(sample('b'))
    expect(store.list().map(r => r.id).sort()).toEqual(['a', 'b'])
    expect(store.get('a')?.id).toBe('a')
    const updated = { ...sample('a'), label: 'changed' }
    expect(store.update('a', updated).label).toBe('changed')
    expect(store.get('missing')).toBeNull()
  })
})
