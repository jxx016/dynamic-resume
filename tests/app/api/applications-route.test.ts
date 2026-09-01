import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setContextForTest } from '@/lib/app-context'
import { SqliteResumeStore } from '@/lib/store/sqlite-store'
import { SqliteApplicationStore } from '@/lib/store/sqlite-application-store'
import { StructuredClient } from '@/lib/ai/structured-client'
import { POST as createApplication } from '@/app/api/applications/route'
import { GET as getApplication } from '@/app/api/applications/[id]/route'
import { POST as generateApplication } from '@/app/api/applications/[id]/generate/route'
import { POST as confirmApplication } from '@/app/api/applications/[id]/confirm/route'
import type { Resume } from '@/lib/schema/resume'

const base: Resume = {
  id: 'r_1', label: 'AI engineer', isBase: true,
  basics: { name: 'Jo', email: 'jo@example.com', phone: '', location: '', links: [] },
  summary: 'Engineer',
  experience: [{ company: 'Acme', title: 'Engineer', start: '2020', end: '2024', location: '', bullets: [{ id: 'b_1', text: 'Built systems', tags: [] }] }],
  education: [], skills: [{ name: 'TypeScript', category: 'language' }], projects: [],
  meta: { createdAt: '', updatedAt: '' },
}

const modelResult = JSON.stringify({
  tailoredResume: { ...base, id: 'ignored', label: 'ignored', isBase: false, sourceResumeId: 'r_1' },
  changeLog: [{ field: 'summary', before: 'Engineer', after: 'Solution Engineer', reason: 'Matches job title' }],
  suggestions: [{ text: 'Add AWS if true', rationale: 'JD requests cloud experience', status: 'accepted' }],
  atsReport: { jdKeywords: ['AWS'], matched: [], missing: ['AWS'], score: 50 },
})

let resumes: SqliteResumeStore
let applications: SqliteApplicationStore

function params(id: string) { return { params: Promise.resolve({ id }) } }
function request(body?: unknown) {
  return new Request('http://test/api/applications', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

beforeEach(() => {
  resumes = new SqliteResumeStore(':memory:')
  applications = new SqliteApplicationStore(':memory:')
  resumes.create(base)
  const client = new StructuredClient({ generate: async () => modelResult })
  setContextForTest({ store: resumes, applications, clientFor: () => client })
})
afterEach(() => setContextForTest(null))

describe('application generation routes', () => {
  it('creates, generates, persists, and finalizes a distinct resume for one job', async () => {
    const create = await createApplication(request({
      baseResumeId: 'r_1', provider: 'gemini', jdText: 'Need AWS and solution architecture.',
      job: { url: 'https://jobs.example.com/solution', title: 'Solution Architect' },
      tailoringInstructions: 'Emphasize customer-facing architecture work.',
    }))
    expect(create.status).toBe(200)
    const draft = await create.json()
    expect(draft.status).toBe('draft')
    expect(draft.tailoringInstructions).toBe('Emphasize customer-facing architecture work.')

    const generated = await generateApplication(request(), params(draft.id))
    expect(generated.status).toBe(200)
    const ready = await generated.json()
    expect(ready.status).toBe('ready')
    expect(ready.tailoringResult.suggestions[0].status).toBe('pending')

    const persisted = await getApplication(new Request('http://test'), params(draft.id))
    expect((await persisted.json()).status).toBe('ready')

    const confirmed = await confirmApplication(request({ decisions: [{ index: 0, accept: true }] }), params(draft.id))
    expect(confirmed.status).toBe(200)
    const finalResume = await confirmed.json()
    expect(finalResume.isBase).toBe(false)
    expect(finalResume.sourceResumeId).toBe('r_1')
    expect(finalResume.id).not.toBe('r_1')
  })

  it('rejects an application whose base resume does not exist', async () => {
    const response = await createApplication(request({
      baseResumeId: 'missing', provider: 'gemini', jdText: 'JD',
      job: { url: 'https://jobs.example.com/solution', title: 'Solution Architect' },
    }))
    expect(response.status).toBe(404)
  })
})
