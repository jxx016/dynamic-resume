import type { Resume } from '@/lib/schema/resume'
import type { Profile, ProfileEvidence } from '@/lib/schema/profile'

const PROFILE_ID = 'profile' as const

function normalized(value: string) { return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ') }
function evidenceId(kind: string, value: string) { return `${kind}_${normalized(value).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'item'}` }
function source(sourceId: string, originalText: string) { return { sourceId, sourceType: 'resume' as const, originalText } }

function addEvidence<T>(items: ProfileEvidence<T>[], id: string, value: T, sourceId: string, originalText: string, matches: (candidate: T) => boolean) {
  const existing = items.find(item => matches(item.value))
  if (existing) {
    if (!existing.provenance.some(record => record.sourceId === sourceId)) existing.provenance.push(source(sourceId, originalText))
    return items
  }
  return [...items, { id, value, provenance: [source(sourceId, originalText)] }]
}

export function emptyProfile(now = new Date().toISOString()): Profile {
  return { id: PROFILE_ID, experience: [], education: [], skills: [], projects: [], updatedAt: now }
}

export function mergeResumeIntoProfile(profile: Profile, resume: Resume): Profile {
  const result: Profile = structuredClone(profile)
  const original = JSON.stringify(resume)
  if (!result.basics && resume.basics.name) result.basics = { id: 'basics', value: resume.basics, provenance: [source(resume.id, original)] }
  if (!result.summary && resume.summary) result.summary = { id: 'summary', value: resume.summary, provenance: [source(resume.id, original)] }

  for (const item of resume.experience) {
    result.experience = addEvidence(result.experience, evidenceId('experience', `${item.company}-${item.title}-${item.start}`), item, resume.id, JSON.stringify(item), value =>
      normalized(value.company) === normalized(item.company) && normalized(value.title) === normalized(item.title) && normalized(value.start) === normalized(item.start) && normalized(value.end) === normalized(item.end))
  }
  for (const item of resume.education) {
    result.education = addEvidence(result.education, evidenceId('education', `${item.school}-${item.degree}-${item.start}`), item, resume.id, JSON.stringify(item), value =>
      normalized(value.school) === normalized(item.school) && normalized(value.degree) === normalized(item.degree) && normalized(value.start) === normalized(item.start) && normalized(value.end) === normalized(item.end))
  }
  for (const item of resume.skills) {
    result.skills = addEvidence(result.skills, evidenceId('skill', item.name), item, resume.id, item.name, value => normalized(value.name) === normalized(item.name))
  }
  for (const item of resume.projects) {
    result.projects = addEvidence(result.projects, evidenceId('project', item.name), item, resume.id, JSON.stringify(item), value => normalized(value.name) === normalized(item.name))
  }
  result.updatedAt = new Date().toISOString()
  return result
}

function retainSupported<T>(items: ProfileEvidence<T>[], sourceId: string) {
  return items.flatMap(item => {
    const provenance = item.provenance.filter(record => record.sourceId !== sourceId)
    return provenance.length ? [{ ...item, provenance }] : []
  })
}

export function clearSource(profile: Profile, sourceId: string): Profile {
  const result: Profile = structuredClone(profile)
  result.experience = retainSupported(result.experience, sourceId)
  result.education = retainSupported(result.education, sourceId)
  result.skills = retainSupported(result.skills, sourceId)
  result.projects = retainSupported(result.projects, sourceId)
  if (result.basics) {
    const provenance = result.basics.provenance.filter(record => record.sourceId !== sourceId)
    result.basics = provenance.length ? { ...result.basics, provenance } : undefined
  }
  if (result.summary) {
    const provenance = result.summary.provenance.filter(record => record.sourceId !== sourceId)
    result.summary = provenance.length ? { ...result.summary, provenance } : undefined
  }
  result.updatedAt = new Date().toISOString()
  return result
}

export function rebuildProfileFromResumes(resumes: Resume[]): Profile {
  return resumes
    .filter(resume => resume.isBase)
    .reduce((profile, resume) => mergeResumeIntoProfile(profile, resume), emptyProfile())
}

export function profileToResume(profile: Profile, id: string, now: string): Resume {
  return { id, label: 'Verified profile', isBase: true, basics: profile.basics?.value ?? { name: '', email: '', phone: '', location: '', links: [] }, summary: profile.summary?.value ?? '', experience: profile.experience.filter(item => !item.conflict).map(item => item.value), education: profile.education.filter(item => !item.conflict).map(item => item.value), skills: profile.skills.filter(item => !item.conflict).map(item => item.value), projects: profile.projects.filter(item => !item.conflict).map(item => item.value), meta: { createdAt: now, updatedAt: now } }
}
