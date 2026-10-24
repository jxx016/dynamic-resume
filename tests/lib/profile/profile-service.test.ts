import { describe, expect, it } from 'vitest'
import { clearSource, emptyProfile, mergeResumeIntoProfile, rebuildProfileFromResumes } from '@/lib/profile/profile-service'
import type { Resume } from '@/lib/schema/resume'

function resume(id: string, skills: string[]): Resume {
  return {
    id,
    label: id,
    isBase: true,
    basics: { name: 'Jo Candidate', email: 'jo@example.com', phone: '', location: '', links: [] },
    summary: '',
    experience: [],
    education: [],
    skills: skills.map(name => ({ name, category: 'technical' })),
    projects: [],
    meta: { createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' },
  }
}

describe('profile evidence merging', () => {
  it('deduplicates an equivalent skill while retaining both uploaded-resume sources', () => {
    const once = mergeResumeIntoProfile(emptyProfile(), resume('r_1', ['TypeScript']))
    const merged = mergeResumeIntoProfile(once, resume('r_2', ['typescript']))

    expect(merged.skills).toHaveLength(1)
    expect(merged.skills[0].value.name).toBe('TypeScript')
    expect(merged.skills[0].provenance.map(source => source.sourceId)).toEqual(['r_1', 'r_2'])
  })

  it('removes only evidence uniquely supported by a deleted resume source', () => {
    const withFirst = mergeResumeIntoProfile(emptyProfile(), resume('r_1', ['TypeScript', 'Python']))
    const profile = mergeResumeIntoProfile(withFirst, resume('r_2', ['typescript']))

    const afterDeletion = clearSource(profile, 'r_1')

    expect(afterDeletion.skills.map(skill => skill.value.name)).toEqual(['TypeScript'])
    expect(afterDeletion.skills[0].provenance.map(source => source.sourceId)).toEqual(['r_2'])
  })

  it('rebuilds a profile from all base resumes in library order', () => {
    const profile = rebuildProfileFromResumes([
      resume('r_1', ['TypeScript']),
      resume('r_2', ['Python']),
    ])

    expect(profile.skills.map(skill => skill.value.name).sort()).toEqual(['Python', 'TypeScript'])
  })
})
