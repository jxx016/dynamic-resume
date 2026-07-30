# Dynamic Resume — Phase 1 (Web App) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first Next.js web app that keeps a library of base resumes, tailors any of them to a pasted job description with a human-confirmed, honesty-preserving AI pass, and exports an ATS-friendly PDF.

**Architecture:** Next.js (App Router) + TypeScript monolith. A canonical **Resume JSON** (Zod-validated) is the single source of truth stored in SQLite behind a `ResumeStore` interface. Google **Gemini** does all AI work (import parsing, resume building, tailoring, base-picking) through one wrapper that forces structured JSON output and validates/repairs it. A deterministic React-PDF renderer turns Resume JSON into an ATS-safe PDF. Route handlers wire the modules; the React UI drives them.

**Tech Stack:** Next.js 15 (App Router) · TypeScript · Vitest · Zod · better-sqlite3 · `@google/genai` · `@react-pdf/renderer` · `pdf-parse` (PDF import) · `mammoth` (DOCX import).

## Global Constraints

- **Language/runtime:** TypeScript, Node 20+, Next.js App Router. Strict TS (`"strict": true`).
- **AI provider:** Google Gemini via `@google/genai` only. Default model `gemini-2.5-flash`, read from `env.GEMINI_MODEL` (fallback `gemini-2.5-flash`). API key from `env.GEMINI_API_KEY` — **server-side only**, never imported into client components.
- **AI I/O contract:** Gemini only ever reads and writes Resume JSON / TailoringResult. Every AI response is validated with Zod; on failure, exactly **one** repair retry, then throw a typed error. Malformed AI JSON must never reach the store or the renderer.
- **Honesty guardrail:** Tailoring additions are emitted as `suggestions[]` with `status: 'pending'`. They are only merged into a resume after explicit user acceptance.
- **Storage seam:** All persistence goes through the `ResumeStore` interface. No route/component touches SQLite directly. (Enables the future SQLite→Postgres swap.)
- **Testing:** Vitest. All AI calls in tests use an injected fake transport — no real network calls in the test suite.
- **Test commands:** `npm test` (watchless: `npm run test:run`).
- **Secrets:** `.env.local` is gitignored; `.env.example` documents required vars.

---

## File Structure

```
src/
  lib/
    env.ts                     # validated env access (GEMINI_API_KEY, GEMINI_MODEL)
    schema/
      resume.ts                # Resume Zod schema + TS types
      tailoring.ts             # TailoringResult Zod schema + TS types
    ai/
      gemini.ts                # GeminiClient: structured-output + validate + 1 repair retry
      transport.ts             # GenerateTransport interface + real @google/genai impl
      prompts.ts               # prompt builders (import, build, tailor, pick)
    store/
      resume-store.ts          # ResumeStore interface + types
      sqlite-store.ts          # SqliteResumeStore implementation
      db.ts                    # better-sqlite3 connection + migration
    import/
      extract-text.ts          # PDF/DOCX/plain → raw text
      resume-importer.ts       # raw text → Resume JSON (via GeminiClient)
    agents/
      builder.ts               # Builder agent turn → partial/complete Resume JSON
      tailor.ts                # Tailoring agent → TailoringResult
      base-picker.ts           # rank base resumes for a JD
    pdf/
      resume-document.tsx      # React-PDF component (ATS single-column)
      render-pdf.ts            # Resume JSON → PDF Buffer
  app/
    api/
      resumes/route.ts             # GET list, POST create/import
      resumes/[id]/route.ts        # PUT edit, GET one
      builder/message/route.ts     # POST builder turn
      tailor/route.ts              # POST tailor
      tailor/[id]/confirm/route.ts # POST accept/reject suggestions
      render/[id]/route.ts         # POST render PDF
    page.tsx                    # library view
    build/page.tsx              # builder chat
    tailor/[id]/page.tsx        # JD input + review/confirm
  components/
    ResumeCard.tsx
    JdInput.tsx
    SuggestionReview.tsx
    AtsReport.tsx
tests/
  ... mirrors src/ ...
.env.example
vitest.config.ts
```

Each `lib/*` module has one responsibility and is unit-tested in isolation with a fake Gemini transport. Route handlers are thin adapters over these modules.

---

### Task 1: Project scaffold + tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.env.example`, `src/lib/env.ts`
- Test: `tests/lib/env.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `getEnv(): { geminiApiKey: string; geminiModel: string }` from `src/lib/env.ts`. `npm run test:run` executes Vitest. Path alias `@/` → `src/`.

- [ ] **Step 1: Initialize the app and install deps**

```bash
npx create-next-app@latest . --ts --app --no-tailwind --no-src-dir --eslint --use-npm --yes
# create-next-app makes src-less; we use src/ — move app into src/ if needed, then:
npm install zod better-sqlite3 @google/genai @react-pdf/renderer pdf-parse mammoth
npm install -D vitest @vitejs/plugin-react @types/better-sqlite3 @types/pdf-parse
```

- [ ] **Step 2: Configure Vitest and the `@/` alias**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  test: { environment: 'node', include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'] },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
})
```

Add scripts to `package.json`:

```json
{ "scripts": { "dev": "next dev", "build": "next build", "test": "vitest", "test:run": "vitest run" } }
```

Ensure `tsconfig.json` has `"strict": true` and `"paths": { "@/*": ["./src/*"] }`.

- [ ] **Step 3: Write the failing test for env access**

Create `tests/lib/env.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest'
import { getEnv } from '@/lib/env'

const OLD = { ...process.env }
afterEach(() => { process.env = { ...OLD } })

describe('getEnv', () => {
  it('reads key and defaults the model', () => {
    process.env.GEMINI_API_KEY = 'k'
    delete process.env.GEMINI_MODEL
    expect(getEnv()).toEqual({ geminiApiKey: 'k', geminiModel: 'gemini-2.5-flash' })
  })
  it('throws when the key is missing', () => {
    delete process.env.GEMINI_API_KEY
    expect(() => getEnv()).toThrow(/GEMINI_API_KEY/)
  })
})
```

- [ ] **Step 4: Run it and confirm failure**

Run: `npm run test:run -- tests/lib/env.test.ts`
Expected: FAIL — `Cannot find module '@/lib/env'`.

- [ ] **Step 5: Implement `src/lib/env.ts`**

```ts
export function getEnv() {
  const geminiApiKey = process.env.GEMINI_API_KEY
  if (!geminiApiKey) throw new Error('GEMINI_API_KEY is not set')
  return { geminiApiKey, geminiModel: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash' }
}
```

- [ ] **Step 6: Write `.env.example`**

```
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-2.5-flash
```

- [ ] **Step 7: Run tests, confirm pass**

Run: `npm run test:run -- tests/lib/env.test.ts`
Expected: PASS (both tests).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app, Vitest, and env access"
```

---

### Task 2: Resume + TailoringResult schemas

**Files:**
- Create: `src/lib/schema/resume.ts`, `src/lib/schema/tailoring.ts`
- Test: `tests/lib/schema/resume.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `ResumeSchema` (Zod) and `type Resume` from `resume.ts`.
  - `TailoringResultSchema` (Zod) and `type TailoringResult` from `tailoring.ts`.
  - `Resume` fields: `id, label, isBase, sourceResumeId?, basics{name,email,phone,location,links[]}, summary, experience[{company,title,start,end,location,bullets[{id,text,tags[]}]}], education[{school,degree,field,start,end}], skills[{name,category}], projects[{name,description,bullets[],links[]}], meta{createdAt,updatedAt}`.
  - `TailoringResult` fields: `tailoredResume: Resume, changeLog[{field,before,after,reason}], suggestions[{text,rationale,status:'pending'|'accepted'|'rejected'}], atsReport{jdKeywords[],matched[],missing[],score}`.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/schema/resume.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { ResumeSchema } from '@/lib/schema/resume'

const valid = {
  id: 'r1', label: 'PM roles', isBase: true,
  basics: { name: 'Jo', email: 'jo@x.com', phone: '', location: 'NYC', links: [] },
  summary: 'PM.',
  experience: [{ company: 'Acme', title: 'PM', start: '2020', end: '2023', location: 'NYC',
                 bullets: [{ id: 'b1', text: 'Shipped X', tags: ['product'] }] }],
  education: [], skills: [{ name: 'SQL', category: 'tech' }], projects: [],
  meta: { createdAt: '2026-07-30T00:00:00Z', updatedAt: '2026-07-30T00:00:00Z' },
}

describe('ResumeSchema', () => {
  it('accepts a valid resume', () => {
    expect(ResumeSchema.parse(valid).basics.name).toBe('Jo')
  })
  it('rejects a bad email', () => {
    expect(() => ResumeSchema.parse({ ...valid, basics: { ...valid.basics, email: 'nope' } })).toThrow()
  })
  it('rejects a missing bullet id', () => {
    const bad = structuredClone(valid); delete (bad.experience[0].bullets[0] as any).id
    expect(() => ResumeSchema.parse(bad)).toThrow()
  })
})
```

- [ ] **Step 2: Run it, confirm failure**

Run: `npm run test:run -- tests/lib/schema/resume.test.ts`
Expected: FAIL — cannot find `@/lib/schema/resume`.

- [ ] **Step 3: Implement `src/lib/schema/resume.ts`**

```ts
import { z } from 'zod'

export const BulletSchema = z.object({ id: z.string().min(1), text: z.string(), tags: z.array(z.string()) })
export const ExperienceSchema = z.object({
  company: z.string(), title: z.string(), start: z.string(), end: z.string(),
  location: z.string(), bullets: z.array(BulletSchema),
})
export const EducationSchema = z.object({
  school: z.string(), degree: z.string(), field: z.string(), start: z.string(), end: z.string(),
})
export const SkillSchema = z.object({ name: z.string(), category: z.string() })
export const ProjectSchema = z.object({
  name: z.string(), description: z.string(), bullets: z.array(z.string()), links: z.array(z.string()),
})

export const ResumeSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  isBase: z.boolean(),
  sourceResumeId: z.string().optional(),
  basics: z.object({
    name: z.string(), email: z.string().email().or(z.literal('')),
    phone: z.string(), location: z.string(), links: z.array(z.string()),
  }),
  summary: z.string(),
  experience: z.array(ExperienceSchema),
  education: z.array(EducationSchema),
  skills: z.array(SkillSchema),
  projects: z.array(ProjectSchema),
  meta: z.object({ createdAt: z.string(), updatedAt: z.string() }),
})
export type Resume = z.infer<typeof ResumeSchema>
```

- [ ] **Step 4: Implement `src/lib/schema/tailoring.ts`**

```ts
import { z } from 'zod'
import { ResumeSchema } from './resume'

export const TailoringResultSchema = z.object({
  tailoredResume: ResumeSchema,
  changeLog: z.array(z.object({
    field: z.string(), before: z.string(), after: z.string(), reason: z.string(),
  })),
  suggestions: z.array(z.object({
    text: z.string(), rationale: z.string(),
    status: z.enum(['pending', 'accepted', 'rejected']),
  })),
  atsReport: z.object({
    jdKeywords: z.array(z.string()), matched: z.array(z.string()),
    missing: z.array(z.string()), score: z.number(),
  }),
})
export type TailoringResult = z.infer<typeof TailoringResultSchema>
```

- [ ] **Step 5: Run tests, confirm pass**

Run: `npm run test:run -- tests/lib/schema/resume.test.ts`
Expected: PASS (all three).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Resume and TailoringResult Zod schemas"
```

---

### Task 3: Gemini client (structured output + validate + repair retry)

**Files:**
- Create: `src/lib/ai/transport.ts`, `src/lib/ai/gemini.ts`
- Test: `tests/lib/ai/gemini.test.ts`

**Interfaces:**
- Consumes: Zod schemas from Task 2; `getEnv` from Task 1.
- Produces:
  - `interface GenerateTransport { generate(prompt: string): Promise<string> }` (returns raw model text).
  - `class GeminiClient { constructor(transport: GenerateTransport); generateStructured<T>(prompt: string, schema: ZodType<T>): Promise<T> }`.
  - `generateStructured` parses JSON, validates with the schema; on any failure it retries **once** with a repair prompt appended, then throws `AiValidationError` (exported).
  - `createRealTransport(): GenerateTransport` using `@google/genai` (not covered by unit tests).

- [ ] **Step 1: Write the failing test with a fake transport**

Create `tests/lib/ai/gemini.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { GeminiClient, AiValidationError } from '@/lib/ai/gemini'

const Schema = z.object({ n: z.number() })

describe('GeminiClient.generateStructured', () => {
  it('parses valid JSON on the first try', async () => {
    const generate = vi.fn().mockResolvedValue('{"n": 5}')
    const c = new GeminiClient({ generate })
    expect(await c.generateStructured('p', Schema)).toEqual({ n: 5 })
    expect(generate).toHaveBeenCalledTimes(1)
  })
  it('retries once with a repair prompt, then succeeds', async () => {
    const generate = vi.fn()
      .mockResolvedValueOnce('not json')
      .mockResolvedValueOnce('{"n": 7}')
    const c = new GeminiClient({ generate })
    expect(await c.generateStructured('p', Schema)).toEqual({ n: 7 })
    expect(generate).toHaveBeenCalledTimes(2)
    expect(generate.mock.calls[1][0]).toMatch(/valid JSON/i)
  })
  it('throws AiValidationError after the repair also fails', async () => {
    const generate = vi.fn().mockResolvedValue('still not json')
    const c = new GeminiClient({ generate })
    await expect(c.generateStructured('p', Schema)).rejects.toBeInstanceOf(AiValidationError)
    expect(generate).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: Run it, confirm failure**

Run: `npm run test:run -- tests/lib/ai/gemini.test.ts`
Expected: FAIL — cannot find `@/lib/ai/gemini`.

- [ ] **Step 3: Implement `src/lib/ai/transport.ts`**

```ts
import { GoogleGenAI } from '@google/genai'
import { getEnv } from '@/lib/env'

export interface GenerateTransport { generate(prompt: string): Promise<string> }

export function createRealTransport(): GenerateTransport {
  const { geminiApiKey, geminiModel } = getEnv()
  const ai = new GoogleGenAI({ apiKey: geminiApiKey })
  return {
    async generate(prompt: string) {
      const res = await ai.models.generateContent({
        model: geminiModel,
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      })
      return res.text ?? ''
    },
  }
}
```

- [ ] **Step 4: Implement `src/lib/ai/gemini.ts`**

```ts
import type { ZodType } from 'zod'
import type { GenerateTransport } from './transport'

export class AiValidationError extends Error {
  constructor(msg: string, readonly raw: string) { super(msg); this.name = 'AiValidationError' }
}

function tryParse<T>(raw: string, schema: ZodType<T>): T | null {
  try { return schema.parse(JSON.parse(stripFences(raw))) } catch { return null }
}
function stripFences(s: string): string {
  return s.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
}

export class GeminiClient {
  constructor(private transport: GenerateTransport) {}

  async generateStructured<T>(prompt: string, schema: ZodType<T>): Promise<T> {
    const first = await this.transport.generate(prompt)
    const ok = tryParse(first, schema)
    if (ok) return ok

    const repair = `${prompt}\n\nYour previous reply was not valid JSON matching the required schema. ` +
      `Reply with ONLY valid JSON, no prose, no code fences.`
    const second = await this.transport.generate(repair)
    const ok2 = tryParse(second, schema)
    if (ok2) return ok2

    throw new AiValidationError('Model did not return schema-valid JSON after repair', second)
  }
}
```

- [ ] **Step 5: Run tests, confirm pass**

Run: `npm run test:run -- tests/lib/ai/gemini.test.ts`
Expected: PASS (all three).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add GeminiClient with structured output and repair retry"
```

---

### Task 4: ResumeStore (SQLite behind an interface)

**Files:**
- Create: `src/lib/store/resume-store.ts`, `src/lib/store/db.ts`, `src/lib/store/sqlite-store.ts`
- Test: `tests/lib/store/sqlite-store.test.ts`

**Interfaces:**
- Consumes: `Resume` type/schema from Task 2.
- Produces:
  - `interface ResumeStore { list(): Resume[]; get(id): Resume | null; create(r: Resume): Resume; update(id, r: Resume): Resume; }`
  - `class SqliteResumeStore implements ResumeStore { constructor(dbPath: string) }` — stores each resume as a JSON blob keyed by id; validates with `ResumeSchema` on read and write.
  - `openDb(path: string)` in `db.ts` returns a migrated `better-sqlite3` Database.

- [ ] **Step 1: Write the failing test (in-memory DB)**

Create `tests/lib/store/sqlite-store.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it, confirm failure**

Run: `npm run test:run -- tests/lib/store/sqlite-store.test.ts`
Expected: FAIL — cannot find `@/lib/store/sqlite-store`.

- [ ] **Step 3: Implement `src/lib/store/db.ts`**

```ts
import Database from 'better-sqlite3'

export function openDb(path: string) {
  const db = new Database(path)
  db.exec(`CREATE TABLE IF NOT EXISTS resumes (id TEXT PRIMARY KEY, data TEXT NOT NULL)`)
  return db
}
```

- [ ] **Step 4: Implement `src/lib/store/resume-store.ts`**

```ts
import type { Resume } from '@/lib/schema/resume'

export interface ResumeStore {
  list(): Resume[]
  get(id: string): Resume | null
  create(r: Resume): Resume
  update(id: string, r: Resume): Resume
}
```

- [ ] **Step 5: Implement `src/lib/store/sqlite-store.ts`**

```ts
import type { Database } from 'better-sqlite3'
import { openDb } from './db'
import { ResumeSchema, type Resume } from '@/lib/schema/resume'
import type { ResumeStore } from './resume-store'

export class SqliteResumeStore implements ResumeStore {
  private db: Database
  constructor(dbPath: string) { this.db = openDb(dbPath) }

  list(): Resume[] {
    const rows = this.db.prepare('SELECT data FROM resumes').all() as { data: string }[]
    return rows.map(r => ResumeSchema.parse(JSON.parse(r.data)))
  }
  get(id: string): Resume | null {
    const row = this.db.prepare('SELECT data FROM resumes WHERE id = ?').get(id) as { data: string } | undefined
    return row ? ResumeSchema.parse(JSON.parse(row.data)) : null
  }
  create(r: Resume): Resume {
    const v = ResumeSchema.parse(r)
    this.db.prepare('INSERT INTO resumes (id, data) VALUES (?, ?)').run(v.id, JSON.stringify(v))
    return v
  }
  update(id: string, r: Resume): Resume {
    const v = ResumeSchema.parse({ ...r, id })
    this.db.prepare('UPDATE resumes SET data = ? WHERE id = ?').run(JSON.stringify(v), id)
    return v
  }
}
```

- [ ] **Step 6: Run tests, confirm pass**

Run: `npm run test:run -- tests/lib/store/sqlite-store.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add ResumeStore interface and SQLite implementation"
```

---

### Task 5: Prompt builders

**Files:**
- Create: `src/lib/ai/prompts.ts`
- Test: `tests/lib/ai/prompts.test.ts`

**Interfaces:**
- Consumes: `Resume` type.
- Produces:
  - `importPrompt(rawText: string): string`
  - `builderPrompt(history: {role:'user'|'assistant',text:string}[], draft: Partial<Resume> | null): string`
  - `tailorPrompt(base: Resume, jdText: string): string`
  - `pickPrompt(jdText: string, resumes: {id:string,label:string,summary:string}[]): string`
  - Each returns a string that (a) states the honesty rule for tailoring, (b) demands JSON-only output matching the target schema.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/ai/prompts.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { tailorPrompt, importPrompt, pickPrompt } from '@/lib/ai/prompts'
import type { Resume } from '@/lib/schema/resume'

const base = { id: 'a', label: 'x', isBase: true,
  basics: { name: 'Jo', email: '', phone: '', location: '', links: [] },
  summary: 'S', experience: [], education: [], skills: [], projects: [],
  meta: { createdAt: '', updatedAt: '' } } as Resume

describe('prompts', () => {
  it('tailorPrompt includes the JD, the honesty rule, and JSON-only instruction', () => {
    const p = tailorPrompt(base, 'Senior PM, needs SQL')
    expect(p).toContain('Senior PM, needs SQL')
    expect(p).toMatch(/do not (invent|fabricate)/i)
    expect(p).toMatch(/suggestions/i)
    expect(p).toMatch(/JSON/i)
  })
  it('importPrompt embeds the raw text', () => {
    expect(importPrompt('RAW RESUME TEXT')).toContain('RAW RESUME TEXT')
  })
  it('pickPrompt lists candidate labels', () => {
    expect(pickPrompt('jd', [{ id: 'a', label: 'PM', summary: 's' }])).toContain('PM')
  })
})
```

- [ ] **Step 2: Run it, confirm failure**

Run: `npm run test:run -- tests/lib/ai/prompts.test.ts`
Expected: FAIL — cannot find `@/lib/ai/prompts`.

- [ ] **Step 3: Implement `src/lib/ai/prompts.ts`**

```ts
import type { Resume } from '@/lib/schema/resume'

const HONESTY = `Rules:
- Only reframe, reorder, and rephrase the candidate's REAL experience to match the job.
- DO NOT invent or fabricate skills, employers, dates, or achievements.
- Any content the candidate does not already have goes into "suggestions" with status "pending" (never directly into the resume).`

export function importPrompt(rawText: string): string {
  return `Convert the following resume text into a Resume JSON object (fields: basics, summary, ` +
    `experience, education, skills, projects). Give every bullet a unique "id". ` +
    `Reply with ONLY the JSON.\n\n--- RESUME TEXT ---\n${rawText}`
}

export function builderPrompt(
  history: { role: 'user' | 'assistant'; text: string }[],
  draft: Partial<Resume> | null,
): string {
  const convo = history.map(h => `${h.role}: ${h.text}`).join('\n')
  return `You are helping a user build a resume from scratch. Ask one focused follow-up if needed, ` +
    `and always return the best current Resume JSON draft so far (unique bullet ids). Reply with ONLY JSON ` +
    `of shape { "message": string, "draft": Resume }.\n\nDraft so far: ${JSON.stringify(draft)}\n\n${convo}`
}

export function tailorPrompt(base: Resume, jdText: string): string {
  return `Tailor this resume to the job description. ${HONESTY}\n\n` +
    `Return a TailoringResult JSON: { tailoredResume, changeLog, suggestions, atsReport }. ` +
    `atsReport must list jdKeywords, matched, missing, and a 0-100 score. Reply with ONLY the JSON.\n\n` +
    `--- BASE RESUME ---\n${JSON.stringify(base)}\n\n--- JOB DESCRIPTION ---\n${jdText}`
}

export function pickPrompt(
  jdText: string,
  resumes: { id: string; label: string; summary: string }[],
): string {
  return `Given the job description, choose the best-matching base resume. Candidates:\n` +
    resumes.map(r => `- id=${r.id} label="${r.label}" summary="${r.summary}"`).join('\n') +
    `\n\nReply with ONLY JSON { "resumeId": string, "reason": string }.\n\n--- JOB DESCRIPTION ---\n${jdText}`
}
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `npm run test:run -- tests/lib/ai/prompts.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add AI prompt builders with honesty rules"
```

---

### Task 6: Text extraction for import

**Files:**
- Create: `src/lib/import/extract-text.ts`
- Test: `tests/lib/import/extract-text.test.ts`

**Interfaces:**
- Consumes: nothing (wraps `pdf-parse` / `mammoth`).
- Produces: `extractText(file: { buffer: Buffer; kind: 'pdf' | 'docx' | 'text' }): Promise<string>`. `text` returns the buffer as UTF-8; `pdf`/`docx` delegate to the libraries. Throws `Error('empty extraction')` if the result is only whitespace.

- [ ] **Step 1: Write the failing test (text + empty cases; libs mocked)**

Create `tests/lib/import/extract-text.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it, confirm failure**

Run: `npm run test:run -- tests/lib/import/extract-text.test.ts`
Expected: FAIL — cannot find `@/lib/import/extract-text`.

- [ ] **Step 3: Implement `src/lib/import/extract-text.ts`**

```ts
import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'

export async function extractText(
  file: { buffer: Buffer; kind: 'pdf' | 'docx' | 'text' },
): Promise<string> {
  let text: string
  if (file.kind === 'text') text = file.buffer.toString('utf-8')
  else if (file.kind === 'pdf') text = (await pdfParse(file.buffer)).text
  else text = (await mammoth.extractRawText({ buffer: file.buffer })).value
  if (!text.trim()) throw new Error('empty extraction')
  return text.trim()
}
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `npm run test:run -- tests/lib/import/extract-text.test.ts`
Expected: PASS (all four).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add PDF/DOCX/text extraction for resume import"
```

---

### Task 7: Resume Importer + ID/date helpers

**Files:**
- Create: `src/lib/import/resume-importer.ts`, `src/lib/ids.ts`
- Test: `tests/lib/import/resume-importer.test.ts`

**Interfaces:**
- Consumes: `GeminiClient` (Task 3), `importPrompt` (Task 5), `ResumeSchema` (Task 2).
- Produces:
  - `newId(prefix: string, seq: number): string` and `nowIso(clock: () => Date): string` in `ids.ts` (injectable, keeps tests deterministic — no `Date.now()` in module code paths under test).
  - `importResume(client: GeminiClient, rawText: string, meta: { id: string; label: string; createdAt: string }): Promise<Resume>` — asks Gemini for a resume body, then stamps `id/label/isBase:true/meta` deterministically and validates.

- [ ] **Step 1: Write the failing test with a fake client**

Create `tests/lib/import/resume-importer.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { GeminiClient } from '@/lib/ai/gemini'
import { importResume } from '@/lib/import/resume-importer'

const modelBody = JSON.stringify({
  basics: { name: 'Jo', email: '', phone: '', location: '', links: [] },
  summary: 'PM', experience: [], education: [], skills: [], projects: [],
})

describe('importResume', () => {
  it('produces a validated base Resume with stamped meta', async () => {
    const client = new GeminiClient({ generate: async () => modelBody })
    const r = await importResume(client, 'raw', { id: 'r1', label: 'Imported', createdAt: '2026-07-30T00:00:00Z' })
    expect(r.id).toBe('r1')
    expect(r.isBase).toBe(true)
    expect(r.basics.name).toBe('Jo')
    expect(r.meta.createdAt).toBe('2026-07-30T00:00:00Z')
  })
})
```

- [ ] **Step 2: Run it, confirm failure**

Run: `npm run test:run -- tests/lib/import/resume-importer.test.ts`
Expected: FAIL — cannot find `@/lib/import/resume-importer`.

- [ ] **Step 3: Implement `src/lib/ids.ts`**

```ts
export function newId(prefix: string, seq: number): string { return `${prefix}_${seq}` }
export function nowIso(clock: () => Date): string { return clock().toISOString() }
```

- [ ] **Step 4: Implement `src/lib/import/resume-importer.ts`**

```ts
import { z } from 'zod'
import { GeminiClient } from '@/lib/ai/gemini'
import { importPrompt } from '@/lib/ai/prompts'
import { ResumeSchema, type Resume } from '@/lib/schema/resume'

const BodySchema = ResumeSchema.omit({ id: true, label: true, isBase: true, sourceResumeId: true, meta: true })

export async function importResume(
  client: GeminiClient,
  rawText: string,
  meta: { id: string; label: string; createdAt: string },
): Promise<Resume> {
  const body = await client.generateStructured(importPrompt(rawText), BodySchema)
  return ResumeSchema.parse({
    ...body, id: meta.id, label: meta.label, isBase: true,
    meta: { createdAt: meta.createdAt, updatedAt: meta.createdAt },
  })
}
```

- [ ] **Step 5: Run tests, confirm pass**

Run: `npm run test:run -- tests/lib/import/resume-importer.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add resume importer and id/date helpers"
```

---

### Task 8: Tailoring agent + Base-Picker

**Files:**
- Create: `src/lib/agents/tailor.ts`, `src/lib/agents/base-picker.ts`
- Test: `tests/lib/agents/tailor.test.ts`, `tests/lib/agents/base-picker.test.ts`

**Interfaces:**
- Consumes: `GeminiClient`, `tailorPrompt`, `pickPrompt`, `TailoringResultSchema`, `ResumeSchema`.
- Produces:
  - `tailorResume(client: GeminiClient, base: Resume, jdText: string): Promise<TailoringResult>` — validates against `TailoringResultSchema` and **forces every suggestion's status to `'pending'`** regardless of what the model returned (honesty guardrail).
  - `pickBase(client: GeminiClient, jdText: string, resumes: Resume[]): Promise<string>` — returns the chosen resume id; if the model returns an id not in the list, falls back to `resumes[0].id`.

- [ ] **Step 1: Write the failing tailor test (guardrail included)**

Create `tests/lib/agents/tailor.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { GeminiClient } from '@/lib/ai/gemini'
import { tailorResume } from '@/lib/agents/tailor'
import type { Resume } from '@/lib/schema/resume'

const base = { id: 'a', label: 'x', isBase: true,
  basics: { name: 'Jo', email: '', phone: '', location: '', links: [] },
  summary: 'S', experience: [], education: [], skills: [], projects: [],
  meta: { createdAt: '', updatedAt: '' } } as Resume

const modelOut = JSON.stringify({
  tailoredResume: base,
  changeLog: [{ field: 'summary', before: 'S', after: 'S2', reason: 'match JD' }],
  suggestions: [{ text: 'Add Kubernetes', rationale: 'JD wants it', status: 'accepted' }],
  atsReport: { jdKeywords: ['sql'], matched: [], missing: ['sql'], score: 40 },
})

describe('tailorResume', () => {
  it('validates and forces suggestions to pending', async () => {
    const client = new GeminiClient({ generate: async () => modelOut })
    const r = await tailorResume(client, base, 'JD needs SQL')
    expect(r.suggestions[0].status).toBe('pending')
    expect(r.atsReport.score).toBe(40)
  })
})
```

- [ ] **Step 2: Run it, confirm failure**

Run: `npm run test:run -- tests/lib/agents/tailor.test.ts`
Expected: FAIL — cannot find `@/lib/agents/tailor`.

- [ ] **Step 3: Implement `src/lib/agents/tailor.ts`**

```ts
import { GeminiClient } from '@/lib/ai/gemini'
import { tailorPrompt } from '@/lib/ai/prompts'
import { TailoringResultSchema, type TailoringResult } from '@/lib/schema/tailoring'
import type { Resume } from '@/lib/schema/resume'

export async function tailorResume(
  client: GeminiClient, base: Resume, jdText: string,
): Promise<TailoringResult> {
  const result = await client.generateStructured(tailorPrompt(base, jdText), TailoringResultSchema)
  return { ...result, suggestions: result.suggestions.map(s => ({ ...s, status: 'pending' as const })) }
}
```

- [ ] **Step 4: Write the failing base-picker test**

Create `tests/lib/agents/base-picker.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { GeminiClient } from '@/lib/ai/gemini'
import { pickBase } from '@/lib/agents/base-picker'
import type { Resume } from '@/lib/schema/resume'

const mk = (id: string): Resume => ({ id, label: id, isBase: true,
  basics: { name: '', email: '', phone: '', location: '', links: [] },
  summary: '', experience: [], education: [], skills: [], projects: [],
  meta: { createdAt: '', updatedAt: '' } })

describe('pickBase', () => {
  it('returns the model-chosen id when valid', async () => {
    const client = new GeminiClient({ generate: async () => '{"resumeId":"b","reason":"fit"}' })
    expect(await pickBase(client, 'jd', [mk('a'), mk('b')])).toBe('b')
  })
  it('falls back to the first resume on an unknown id', async () => {
    const client = new GeminiClient({ generate: async () => '{"resumeId":"z","reason":"x"}' })
    expect(await pickBase(client, 'jd', [mk('a'), mk('b')])).toBe('a')
  })
})
```

- [ ] **Step 5: Run it, confirm failure**

Run: `npm run test:run -- tests/lib/agents/base-picker.test.ts`
Expected: FAIL — cannot find `@/lib/agents/base-picker`.

- [ ] **Step 6: Implement `src/lib/agents/base-picker.ts`**

```ts
import { z } from 'zod'
import { GeminiClient } from '@/lib/ai/gemini'
import { pickPrompt } from '@/lib/ai/prompts'
import type { Resume } from '@/lib/schema/resume'

const PickSchema = z.object({ resumeId: z.string(), reason: z.string() })

export async function pickBase(
  client: GeminiClient, jdText: string, resumes: Resume[],
): Promise<string> {
  const candidates = resumes.map(r => ({ id: r.id, label: r.label, summary: r.summary }))
  const { resumeId } = await client.generateStructured(pickPrompt(jdText, candidates), PickSchema)
  return resumes.some(r => r.id === resumeId) ? resumeId : resumes[0].id
}
```

- [ ] **Step 7: Run both agent tests, confirm pass**

Run: `npm run test:run -- tests/lib/agents/`
Expected: PASS (tailor + base-picker).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add tailoring agent (pending-suggestion guardrail) and base-picker"
```

---

### Task 9: Builder agent + suggestion confirmation

**Files:**
- Create: `src/lib/agents/builder.ts`, `src/lib/agents/confirm.ts`
- Test: `tests/lib/agents/builder.test.ts`, `tests/lib/agents/confirm.test.ts`

**Interfaces:**
- Consumes: `GeminiClient`, `builderPrompt`, `ResumeSchema`, `TailoringResult`.
- Produces:
  - `builderTurn(client, history, draft): Promise<{ message: string; draft: Resume }>` — one conversational turn returning a message and the running Resume draft (id/meta stamped by the caller/route; here the model body is validated against a draft schema that fills defaults).
  - `applyConfirmations(result: TailoringResult, decisions: { index: number; accept: boolean }[]): Resume` — sets each suggestion's status and, for accepted ones, appends its `text` as a new bullet under a "Additional" experience/skills area; returns the finalized `Resume`.

- [ ] **Step 1: Write the failing confirm test**

Create `tests/lib/agents/confirm.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { applyConfirmations } from '@/lib/agents/confirm'
import type { TailoringResult } from '@/lib/schema/tailoring'
import type { Resume } from '@/lib/schema/resume'

const base = { id: 'a', label: 'x', isBase: false, sourceResumeId: 'src',
  basics: { name: 'Jo', email: '', phone: '', location: '', links: [] },
  summary: 'S', experience: [], education: [], skills: [{ name: 'SQL', category: 'tech' }], projects: [],
  meta: { createdAt: '', updatedAt: '' } } as Resume

const result: TailoringResult = {
  tailoredResume: base,
  changeLog: [],
  suggestions: [
    { text: 'Kubernetes', rationale: 'JD', status: 'pending' },
    { text: 'Terraform', rationale: 'JD', status: 'pending' },
  ],
  atsReport: { jdKeywords: [], matched: [], missing: [], score: 0 },
}

describe('applyConfirmations', () => {
  it('adds accepted suggestions as skills and drops rejected', () => {
    const final = applyConfirmations(result, [{ index: 0, accept: true }, { index: 1, accept: false }])
    expect(final.skills.some(s => s.name === 'Kubernetes')).toBe(true)
    expect(final.skills.some(s => s.name === 'Terraform')).toBe(false)
  })
})
```

- [ ] **Step 2: Run it, confirm failure**

Run: `npm run test:run -- tests/lib/agents/confirm.test.ts`
Expected: FAIL — cannot find `@/lib/agents/confirm`.

- [ ] **Step 3: Implement `src/lib/agents/confirm.ts`**

```ts
import { ResumeSchema, type Resume } from '@/lib/schema/resume'
import type { TailoringResult } from '@/lib/schema/tailoring'

export function applyConfirmations(
  result: TailoringResult,
  decisions: { index: number; accept: boolean }[],
): Resume {
  const accepted = new Set(decisions.filter(d => d.accept).map(d => d.index))
  const extraSkills = result.suggestions
    .filter((_, i) => accepted.has(i))
    .map(s => ({ name: s.text, category: 'added' }))
  const merged: Resume = {
    ...result.tailoredResume,
    skills: [...result.tailoredResume.skills, ...extraSkills],
  }
  return ResumeSchema.parse(merged)
}
```

- [ ] **Step 4: Write the failing builder test**

Create `tests/lib/agents/builder.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { GeminiClient } from '@/lib/ai/gemini'
import { builderTurn } from '@/lib/agents/builder'

const modelOut = JSON.stringify({
  message: 'What impact did you have?',
  draft: {
    basics: { name: 'Jo', email: '', phone: '', location: '', links: [] },
    summary: '', experience: [], education: [], skills: [], projects: [],
  },
})

describe('builderTurn', () => {
  it('returns a message and a validated draft', async () => {
    const client = new GeminiClient({ generate: async () => modelOut })
    const turn = await builderTurn(client, [{ role: 'user', text: 'I was a PM at Acme' }], null)
    expect(turn.message).toMatch(/impact/i)
    expect(turn.draft.basics.name).toBe('Jo')
    expect(turn.draft.isBase).toBe(true)
  })
})
```

- [ ] **Step 5: Run it, confirm failure**

Run: `npm run test:run -- tests/lib/agents/builder.test.ts`
Expected: FAIL — cannot find `@/lib/agents/builder`.

- [ ] **Step 6: Implement `src/lib/agents/builder.ts`**

```ts
import { z } from 'zod'
import { GeminiClient } from '@/lib/ai/gemini'
import { builderPrompt } from '@/lib/ai/prompts'
import { ResumeSchema, type Resume } from '@/lib/schema/resume'

const DraftBody = ResumeSchema.omit({ id: true, label: true, isBase: true, sourceResumeId: true, meta: true })
const TurnSchema = z.object({ message: z.string(), draft: DraftBody })

export async function builderTurn(
  client: GeminiClient,
  history: { role: 'user' | 'assistant'; text: string }[],
  draft: Partial<Resume> | null,
): Promise<{ message: string; draft: Resume }> {
  const out = await client.generateStructured(builderPrompt(history, draft), TurnSchema)
  const stamped = ResumeSchema.parse({
    ...out.draft, id: 'draft', label: 'Draft', isBase: true,
    meta: { createdAt: '', updatedAt: '' },
  })
  return { message: out.message, draft: stamped }
}
```

- [ ] **Step 7: Run all agent tests, confirm pass**

Run: `npm run test:run -- tests/lib/agents/`
Expected: PASS (builder + confirm + earlier ones).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add builder agent and suggestion-confirmation merge"
```

---

### Task 10: PDF renderer (ATS-safe, deterministic)

**Files:**
- Create: `src/lib/pdf/resume-document.tsx`, `src/lib/pdf/render-pdf.ts`
- Test: `tests/lib/pdf/render-pdf.test.ts`

**Interfaces:**
- Consumes: `Resume` type.
- Produces:
  - `ResumeDocument({ resume }: { resume: Resume }): JSX.Element` — a `@react-pdf/renderer` `Document` using a single column, one standard font (Helvetica), no tables/graphics/multi-column layout (ATS-safe).
  - `renderResumePdf(resume: Resume): Promise<Buffer>` — returns a real PDF buffer. Deterministic for a given resume (no timestamps embedded in content).

- [ ] **Step 1: Write the failing test**

Create `tests/lib/pdf/render-pdf.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { renderResumePdf } from '@/lib/pdf/render-pdf'
import type { Resume } from '@/lib/schema/resume'

const resume = { id: 'a', label: 'x', isBase: true,
  basics: { name: 'Jo Candidate', email: 'jo@x.com', phone: '', location: 'NYC', links: [] },
  summary: 'Product manager.', 
  experience: [{ company: 'Acme', title: 'PM', start: '2020', end: '2023', location: 'NYC',
                 bullets: [{ id: 'b1', text: 'Shipped X', tags: [] }] }],
  education: [], skills: [{ name: 'SQL', category: 'tech' }], projects: [],
  meta: { createdAt: '', updatedAt: '' } } as Resume

describe('renderResumePdf', () => {
  it('produces a non-trivial PDF buffer', async () => {
    const buf = await renderResumePdf(resume)
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-')
    expect(buf.length).toBeGreaterThan(1000)
  })
})
```

- [ ] **Step 2: Run it, confirm failure**

Run: `npm run test:run -- tests/lib/pdf/render-pdf.test.ts`
Expected: FAIL — cannot find `@/lib/pdf/render-pdf`.

- [ ] **Step 3: Implement `src/lib/pdf/resume-document.tsx`**

```tsx
import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { Resume } from '@/lib/schema/resume'

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, lineHeight: 1.4 },
  name: { fontSize: 18, marginBottom: 2 },
  contact: { fontSize: 9, marginBottom: 10 },
  section: { fontSize: 12, marginTop: 12, marginBottom: 4, fontFamily: 'Helvetica-Bold' },
  role: { fontFamily: 'Helvetica-Bold' },
  bullet: { marginLeft: 10 },
})

export function ResumeDocument({ resume }: { resume: Resume }) {
  const b = resume.basics
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.name}>{b.name}</Text>
        <Text style={s.contact}>{[b.email, b.phone, b.location, ...b.links].filter(Boolean).join('  •  ')}</Text>
        {resume.summary ? <Text>{resume.summary}</Text> : null}

        {resume.experience.length > 0 && <Text style={s.section}>Experience</Text>}
        {resume.experience.map((e, i) => (
          <View key={i}>
            <Text style={s.role}>{e.title} — {e.company} ({e.start}–{e.end})</Text>
            {e.bullets.map(bl => <Text key={bl.id} style={s.bullet}>• {bl.text}</Text>)}
          </View>
        ))}

        {resume.education.length > 0 && <Text style={s.section}>Education</Text>}
        {resume.education.map((ed, i) => (
          <Text key={i}>{ed.degree} {ed.field}, {ed.school} ({ed.start}–{ed.end})</Text>
        ))}

        {resume.skills.length > 0 && <Text style={s.section}>Skills</Text>}
        {resume.skills.length > 0 && <Text>{resume.skills.map(sk => sk.name).join(', ')}</Text>}
      </Page>
    </Document>
  )
}
```

- [ ] **Step 4: Implement `src/lib/pdf/render-pdf.ts`**

```ts
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { ResumeDocument } from './resume-document'
import type { Resume } from '@/lib/schema/resume'

export async function renderResumePdf(resume: Resume): Promise<Buffer> {
  return renderToBuffer(React.createElement(ResumeDocument, { resume }))
}
```

- [ ] **Step 5: Run tests, confirm pass**

Run: `npm run test:run -- tests/lib/pdf/render-pdf.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add ATS-safe React-PDF resume renderer"
```

---

### Task 11: API route handlers

**Files:**
- Create: `src/lib/app-context.ts`, `src/app/api/resumes/route.ts`, `src/app/api/resumes/[id]/route.ts`, `src/app/api/tailor/route.ts`, `src/app/api/tailor/[id]/confirm/route.ts`, `src/app/api/builder/message/route.ts`, `src/app/api/render/[id]/route.ts`
- Test: `tests/app/api/tailor-route.test.ts`

**Interfaces:**
- Consumes: every `lib` module above.
- Produces:
  - `getContext(): { store: ResumeStore; client: GeminiClient }` in `app-context.ts` — lazily builds the SQLite store (path from `env.DB_PATH ?? 'data/resumes.db'`) and a `GeminiClient(createRealTransport())`. Exposes `setContextForTest(ctx)` to inject fakes.
  - Route handlers per the API surface. Each catches `AiValidationError` → HTTP 502 with `{ error }`; validation errors → 400; not-found → 404.

- [ ] **Step 1: Implement `src/lib/app-context.ts`**

```ts
import { SqliteResumeStore } from '@/lib/store/sqlite-store'
import { GeminiClient } from '@/lib/ai/gemini'
import { createRealTransport } from '@/lib/ai/transport'
import type { ResumeStore } from '@/lib/store/resume-store'

export interface AppContext { store: ResumeStore; client: GeminiClient }
let override: AppContext | null = null
let real: AppContext | null = null

export function setContextForTest(ctx: AppContext | null) { override = ctx }
export function getContext(): AppContext {
  if (override) return override
  if (!real) {
    real = {
      store: new SqliteResumeStore(process.env.DB_PATH ?? 'data/resumes.db'),
      client: new GeminiClient(createRealTransport()),
    }
  }
  return real
}
```

- [ ] **Step 2: Write the failing route test (fake context)**

Create `tests/app/api/tailor-route.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setContextForTest } from '@/lib/app-context'
import { SqliteResumeStore } from '@/lib/store/sqlite-store'
import { GeminiClient } from '@/lib/ai/gemini'
import { POST } from '@/app/api/tailor/route'
import type { Resume } from '@/lib/schema/resume'

const base = { id: 'a', label: 'x', isBase: true,
  basics: { name: 'Jo', email: '', phone: '', location: '', links: [] },
  summary: 'S', experience: [], education: [], skills: [], projects: [],
  meta: { createdAt: '', updatedAt: '' } } as Resume

const modelOut = JSON.stringify({
  tailoredResume: base, changeLog: [],
  suggestions: [{ text: 'X', rationale: 'y', status: 'accepted' }],
  atsReport: { jdKeywords: [], matched: [], missing: [], score: 10 },
})

beforeEach(() => {
  const store = new SqliteResumeStore(':memory:'); store.create(base)
  setContextForTest({ store, client: new GeminiClient({ generate: async () => modelOut }) })
})

describe('POST /api/tailor', () => {
  it('returns a TailoringResult with pending suggestions', async () => {
    const req = new Request('http://t/api/tailor', {
      method: 'POST', body: JSON.stringify({ baseResumeId: 'a', jdText: 'JD' }),
    })
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.suggestions[0].status).toBe('pending')
  })
})
```

- [ ] **Step 3: Run it, confirm failure**

Run: `npm run test:run -- tests/app/api/tailor-route.test.ts`
Expected: FAIL — cannot find `@/app/api/tailor/route`.

- [ ] **Step 4: Implement `src/app/api/tailor/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { getContext } from '@/lib/app-context'
import { tailorResume } from '@/lib/agents/tailor'
import { pickBase } from '@/lib/agents/base-picker'
import { AiValidationError } from '@/lib/ai/gemini'

export async function POST(req: Request) {
  const { baseResumeId, jdText } = await req.json()
  if (!jdText?.trim()) return NextResponse.json({ error: 'jdText is required' }, { status: 400 })
  const { store, client } = getContext()
  try {
    const id = baseResumeId === 'auto' ? await pickBase(client, jdText, store.list()) : baseResumeId
    const base = store.get(id)
    if (!base) return NextResponse.json({ error: 'resume not found' }, { status: 404 })
    return NextResponse.json(await tailorResume(client, base, jdText))
  } catch (e) {
    if (e instanceof AiValidationError) return NextResponse.json({ error: e.message }, { status: 502 })
    throw e
  }
}
```

- [ ] **Step 5: Run the tailor-route test, confirm pass**

Run: `npm run test:run -- tests/app/api/tailor-route.test.ts`
Expected: PASS.

- [ ] **Step 6: Implement the remaining route handlers**

`src/app/api/resumes/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getContext } from '@/lib/app-context'
import { importResume } from '@/lib/import/resume-importer'
import { extractText } from '@/lib/import/extract-text'
import { newId, nowIso } from '@/lib/ids'
import { AiValidationError } from '@/lib/ai/gemini'

export async function GET() {
  return NextResponse.json(getContext().store.list())
}

export async function POST(req: Request) {
  const body = await req.json() // { label, kind, contentBase64 | text }
  const { store, client } = getContext()
  try {
    const buffer = body.kind === 'text'
      ? Buffer.from(body.text ?? '', 'utf-8')
      : Buffer.from(body.contentBase64 ?? '', 'base64')
    const raw = await extractText({ buffer, kind: body.kind })
    const id = newId('r', store.list().length + 1)
    const resume = await importResume(client, raw, { id, label: body.label ?? 'Imported', createdAt: nowIso(() => new Date()) })
    return NextResponse.json(store.create(resume))
  } catch (e) {
    if (e instanceof AiValidationError) return NextResponse.json({ error: e.message }, { status: 502 })
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
```

`src/app/api/resumes/[id]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getContext } from '@/lib/app-context'
import { ResumeSchema } from '@/lib/schema/resume'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = getContext().store.get(id)
  return r ? NextResponse.json(r) : NextResponse.json({ error: 'not found' }, { status: 404 })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const parsed = ResumeSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'invalid resume' }, { status: 400 })
  return NextResponse.json(getContext().store.update(id, parsed.data))
}
```

`src/app/api/tailor/[id]/confirm/route.ts` (note: `[id]` is the base resume id the tailoring came from; the client re-posts the `TailoringResult` plus decisions):

```ts
import { NextResponse } from 'next/server'
import { getContext } from '@/lib/app-context'
import { applyConfirmations } from '@/lib/agents/confirm'
import { TailoringResultSchema } from '@/lib/schema/tailoring'
import { newId, nowIso } from '@/lib/ids'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json() // { result, decisions }
  const parsed = TailoringResultSchema.safeParse(body.result)
  if (!parsed.success) return NextResponse.json({ error: 'invalid result' }, { status: 400 })
  const { store } = getContext()
  const finalBody = applyConfirmations(parsed.data, body.decisions ?? [])
  const saved = store.create({
    ...finalBody,
    id: newId('t', store.list().length + 1),
    isBase: false,
    sourceResumeId: id,
    label: `Tailored from ${id}`,
    meta: { createdAt: nowIso(() => new Date()), updatedAt: nowIso(() => new Date()) },
  })
  return NextResponse.json(saved)
}
```

`src/app/api/builder/message/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getContext } from '@/lib/app-context'
import { builderTurn } from '@/lib/agents/builder'
import { AiValidationError } from '@/lib/ai/gemini'

export async function POST(req: Request) {
  const { history, draft } = await req.json()
  try {
    return NextResponse.json(await builderTurn(getContext().client, history ?? [], draft ?? null))
  } catch (e) {
    if (e instanceof AiValidationError) return NextResponse.json({ error: e.message }, { status: 502 })
    throw e
  }
}
```

`src/app/api/render/[id]/route.ts`:

```ts
import { getContext } from '@/lib/app-context'
import { renderResumePdf } from '@/lib/pdf/render-pdf'

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const resume = getContext().store.get(id)
  if (!resume) return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
  const pdf = await renderResumePdf(resume)
  const name = `${resume.basics.name.replace(/\s+/g, '_') || 'resume'}.pdf`
  return new Response(pdf, {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${name}"` },
  })
}
```

- [ ] **Step 7: Run the full suite, confirm pass**

Run: `npm run test:run`
Expected: PASS (all tests to date).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add API route handlers for resumes, tailor, builder, confirm, render"
```

---

### Task 12: Web UI (library, JD input + review, builder)

**Files:**
- Create: `src/app/page.tsx`, `src/app/tailor/[id]/page.tsx`, `src/app/build/page.tsx`, `src/components/ResumeCard.tsx`, `src/components/JdInput.tsx`, `src/components/SuggestionReview.tsx`, `src/components/AtsReport.tsx`
- Test: `tests/components/SuggestionReview.test.tsx`

**Interfaces:**
- Consumes: the API routes (via `fetch`) and the shared types.
- Produces: user-facing pages. Only `SuggestionReview` has isolated logic worth a unit test (accept/reject toggles produce the correct `decisions[]`).

- [ ] **Step 1: Write the failing component test**

Create `tests/components/SuggestionReview.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SuggestionReview } from '@/components/SuggestionReview'

describe('SuggestionReview', () => {
  it('emits decisions when the user accepts a suggestion', () => {
    const onConfirm = vi.fn()
    render(<SuggestionReview
      suggestions={[{ text: 'Kubernetes', rationale: 'JD wants it', status: 'pending' }]}
      onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole('button', { name: /accept/i }))
    fireEvent.click(screen.getByRole('button', { name: /finalize/i }))
    expect(onConfirm).toHaveBeenCalledWith([{ index: 0, accept: true }])
  })
})
```

Install test deps first:

```bash
npm install -D @testing-library/react @testing-library/dom jsdom
```

Set `test.environment` to `'jsdom'` for component tests by adding at the top of the test file: `// @vitest-environment jsdom`.

- [ ] **Step 2: Run it, confirm failure**

Run: `npm run test:run -- tests/components/SuggestionReview.test.tsx`
Expected: FAIL — cannot find `@/components/SuggestionReview`.

- [ ] **Step 3: Implement `src/components/SuggestionReview.tsx`**

```tsx
'use client'
import React, { useState } from 'react'

type S = { text: string; rationale: string; status: string }

export function SuggestionReview(
  { suggestions, onConfirm }: { suggestions: S[]; onConfirm: (d: { index: number; accept: boolean }[]) => void },
) {
  const [accepted, setAccepted] = useState<Record<number, boolean>>({})
  return (
    <div>
      {suggestions.map((s, i) => (
        <div key={i}>
          <strong>{s.text}</strong> — {s.rationale}
          <button onClick={() => setAccepted(a => ({ ...a, [i]: true }))}>Accept</button>
          <button onClick={() => setAccepted(a => ({ ...a, [i]: false }))}>Reject</button>
          <span>{accepted[i] === true ? ' ✓' : accepted[i] === false ? ' ✗' : ''}</span>
        </div>
      ))}
      <button onClick={() => onConfirm(
        suggestions.map((_, i) => ({ index: i, accept: accepted[i] === true }))
          .filter(d => d.accept || accepted[d.index] === false ? d.accept : d.accept),
      )}>Finalize</button>
    </div>
  )
}
```

Note: the test only accepts index 0, so `onConfirm` receives `[{ index: 0, accept: true }]`. Ensure the map emits exactly the accepted decisions expected — simplify the finalize handler to `onConfirm(suggestions.map((_, i) => ({ index: i, accept: accepted[i] === true })).filter(d => d.accept))` so only accepted decisions are sent.

- [ ] **Step 4: Run the component test, confirm pass**

Run: `npm run test:run -- tests/components/SuggestionReview.test.tsx`
Expected: PASS.

- [ ] **Step 5: Implement the pages and remaining components**

`src/app/page.tsx` (library): server component that `fetch`es `/api/resumes` (or reads the store directly) and renders `ResumeCard` per resume, plus links to `/build` and, per card, `/tailor/[id]`.

`src/app/tailor/[id]/page.tsx`: client page with `JdInput` → on submit `POST /api/tailor` → shows `AtsReport` + `SuggestionReview` → on finalize `POST /api/tailor/[id]/confirm` → shows a "Download PDF" link hitting `POST /api/render/[newId]`.

`src/app/build/page.tsx`: client chat page posting to `/api/builder/message`, showing the running draft; a "Save as base resume" button `POST /api/resumes` with `kind: 'text'` of the serialized draft (or a dedicated save path).

`src/components/ResumeCard.tsx`, `JdInput.tsx`, `AtsReport.tsx`: presentational — a card with label + tailor link; a textarea + submit; a keyword coverage list with the score.

Keep these presentational and thin; all logic already lives in tested `lib` modules and the one tested component.

- [ ] **Step 6: Manual smoke test**

```bash
echo "GEMINI_API_KEY=..." > .env.local
npm run dev
```

Verify in the browser: create/import a base resume → open Tailor → paste a JD → tailor → accept a suggestion → finalize → download PDF opens a valid ATS PDF.

- [ ] **Step 7: Run the full suite, confirm pass**

Run: `npm run test:run`
Expected: PASS (all tests).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add web UI (library, tailor review, builder) and finalize Phase 1"
```

---

## Self-Review

**Spec coverage:**
- Multiple base resumes → Task 4 (store lists many) + Task 12 library. ✓
- AI builds resume from scratch → Task 9 builder. ✓
- Import existing resume (PDF/DOCX/text) → Tasks 6–7. ✓
- Tailor to JD, truthful + suggestions → Task 8 (pending guardrail) + Task 9 confirm. ✓
- Base auto-pick → Task 8 base-picker. ✓
- ATS PDF output → Task 10. ✓
- changeLog + atsReport → Task 8 (schema) + Task 12 `AtsReport`. ✓
- Gemini structured output + validate + 1 repair retry → Task 3. ✓
- SQLite behind interface (Postgres-swappable) → Task 4. ✓
- API surface (all 7 endpoints) → Task 11. ✓
- Error handling (AiValidationError→502, invalid→400, missing→404, empty JD/extraction) → Tasks 3, 6, 11. ✓
- Local-first run → `.env.example`, `npm run dev` (Tasks 1, 12). ✓
- Honesty guardrail (suggestions pending) → Task 8, enforced server-side. ✓

**Deferred to Phase 2 (out of this plan, per spec):** browser extension, JD scraping from page, text-field autofill, "resume ready" nudge. Cover-letter, DOCX, multi-template: future/out of scope.

**Placeholder scan:** No TBD/TODO; every code step has real code. The one narrative step (Task 12 Step 5 pages) is presentational glue over already-tested modules and names each file's responsibility explicitly.

**Type consistency:** `Resume`/`TailoringResult` used identically across tasks; `ResumeStore` methods (`list/get/create/update`) consistent Tasks 4→11; `GeminiClient.generateStructured` signature consistent Tasks 3→9; `tailorResume`/`pickBase`/`builderTurn`/`applyConfirmations`/`importResume`/`renderResumePdf`/`extractText` signatures match between definition and call sites. Suggestion-status forced to `'pending'` in Task 8 and consumed by `applyConfirmations` in Task 9. ✓
