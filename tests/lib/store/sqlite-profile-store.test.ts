import { describe, expect, it } from 'vitest'
import { mergeResumeIntoProfile } from '@/lib/profile/profile-service'
import { emptyProfile } from '@/lib/profile/profile-service'
import { SqliteProfileStore } from '@/lib/store/sqlite-profile-store'
import type { Resume } from '@/lib/schema/resume'

function sampleResume(id: string): Resume {
  return {
    id,
    label: id,
    isBase: true,
    basics: { name: 'Jo Candidate', email: 'jo@example.com', phone: '', location: '', links: [] },
    summary: 'Platform engineer',
    experience: [],
    education: [],
    skills: [{ name: 'TypeScript', category: 'technical' }],
    projects: [],
    meta: { createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' },
  }
}

describe('SqliteProfileStore', () => {
  it('returns an empty profile when none is stored', () => {
    const store = new SqliteProfileStore(':memory:')
    expect(store.get().skills).toEqual([])
  })

  it('persists merged profile evidence across get and replace', () => {
    const store = new SqliteProfileStore(':memory:')
    const merged = mergeResumeIntoProfile(emptyProfile(), sampleResume('r_1'))
    store.replace(merged)

    const loaded = store.get()
    expect(loaded.skills).toHaveLength(1)
    expect(loaded.skills[0].value.name).toBe('TypeScript')
    expect(loaded.summary?.value).toBe('Platform engineer')
  })
})
