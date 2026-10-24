# Job-Application Resume Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a saved, truthful tailored resume for every confirmed job page through the browser extension.

**Architecture:** Base resumes remain the common structured profile. A new JSON-backed Application record persists job metadata, the complete captured JD, generation state, AI result, and final derived Resume id. The extension creates the Application after user confirmation; the web app owns long-running generation and review.

**Tech Stack:** Next.js 16 route handlers/App Router, TypeScript, Zod, better-sqlite3, React, Manifest V3 JavaScript, Vitest/jsdom.

**Spec:** `docs/superpowers/specs/2026-09-01-job-application-generation-design.md`

## Global Constraints

- Base resumes are the common truthful skill profile; no duplicate profile model is introduced.
- Every job application creates a fresh Application and never overwrites its base Resume.
- Suggested additions remain `pending` until explicitly accepted.
- Extract and review Job Description plus Qualification/Requirements, excluding locations and legal boilerplate.
- The extension never attempts silent file-input upload.
- Dynamic Next.js route params use `Promise<{ id: string }>`.
- All new behavior uses TDD and the full suite, `tsc --noEmit`, and a keyless build must pass.

---

### Task 1: Application schema and SQLite store

**Files:**
- Create: `src/lib/schema/application.ts`
- Create: `src/lib/store/application-store.ts`
- Create: `src/lib/store/sqlite-application-store.ts`
- Modify: `src/lib/store/db.ts`
- Test: `tests/lib/store/sqlite-application-store.test.ts`

**Interfaces:**
- Produces `ApplicationSchema`, `Application`, `ApplicationStatus`, `ApplicationStore`, and `SqliteApplicationStore`.
- `ApplicationStore` exposes `list()`, `get(id)`, `create(application)`, and `update(id, application)`.

- [ ] **Step 1: Write failing lifecycle tests**

```ts
const created = store.create(draft('a'))
expect(store.get('a')).toEqual(created)
expect(store.update('a', { ...created, status: 'ready' }).status).toBe('ready')
expect(store.get('missing')).toBeNull()
```

- [ ] **Step 2: Run the focused test**

Run: `npm run test:run -- tests/lib/store/sqlite-application-store.test.ts`

Expected: FAIL because the application store module does not exist.

- [ ] **Step 3: Implement schema and store**

```ts
export const ApplicationSchema = z.object({
  id: z.string().min(1),
  baseResumeId: z.string().min(1),
  job: z.object({ url: z.string(), title: z.string() }),
  jdText: z.string().min(1),
  provider: ProviderSchema,
  status: z.enum(['draft', 'generating', 'ready', 'finalized', 'failed']),
  tailoringResult: TailoringResultSchema.optional(),
  finalResumeId: z.string().optional(),
  error: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
```

Create `applications (id TEXT PRIMARY KEY, data TEXT NOT NULL)` alongside the existing resume migration. Validate on all read/write boundaries.

- [ ] **Step 4: Re-run the focused test**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/schema/application.ts src/lib/store tests/lib/store/sqlite-application-store.test.ts
git commit -m "feat: add persistent application records"
```

### Task 2: Application API and generation lifecycle

**Files:**
- Modify: `src/lib/app-context.ts`
- Create: `src/app/api/applications/route.ts`
- Create: `src/app/api/applications/[id]/route.ts`
- Create: `src/app/api/applications/[id]/generate/route.ts`
- Create: `src/app/api/applications/[id]/confirm/route.ts`
- Test: `tests/app/api/applications-route.test.ts`

**Interfaces:**
- Consumes `ApplicationStore`, `ResumeStore`, `StructuredClient`, `tailorResume`, `applyConfirmations`.
- `POST /api/applications` takes `{ baseResumeId, jdText, job:{url,title}, provider }`.
- `POST /api/applications/[id]/generate` returns a `ready` Application.

- [ ] **Step 1: Write failing route tests**

```ts
expect((await POST(createRequest({ baseResumeId: 'base', jdText: 'JD', job, provider: 'gemini' }))).status).toBe(200)
expect((await POST(createRequest({ baseResumeId: 'missing', jdText: 'JD', job, provider: 'gemini' }))).status).toBe(404)
expect((await generate(request, params('a'))).status).toBe(200)
expect((await generate(request, params('a'))).status).toBe(200) // ready response, no second model call
```

- [ ] **Step 2: Run focused tests**

Run: `npm run test:run -- tests/app/api/applications-route.test.ts`

Expected: FAIL because application routes do not exist.

- [ ] **Step 3: Implement application route behavior**

`POST /api/applications` stamps `a_${applicationStore.list().length + 1}` only after verifying its base Resume exists. Generate transitions `draft → generating → ready`; catch `AiValidationError` into `failed` and return 502. Confirm creates `t_` Resume through existing `applyConfirmations`, sets `sourceResumeId` to `baseResumeId`, and updates Application to `finalized`.

- [ ] **Step 4: Re-run focused tests**

Expected: PASS; test missing base, invalid provider, idempotent ready generation, and pending suggestion preservation.

- [ ] **Step 5: Commit**

```bash
git add src/lib/app-context.ts src/app/api/applications tests/app/api/applications-route.test.ts
git commit -m "feat: add application generation API"
```

### Task 3: Application review page

**Files:**
- Create: `src/app/applications/[id]/page.tsx`
- Create: `src/components/ApplicationReview.tsx`
- Test: `tests/components/ApplicationReview.test.tsx`

**Interfaces:**
- `ApplicationReview` fetches application state, invokes `/generate` exactly once for a draft, renders loading/failed/ready states, and posts accepted decisions to `/confirm`.
- Consumes persisted `Application` rather than extension state.

- [ ] **Step 1: Write failing component tests**

```tsx
render(<ApplicationReview applicationId="a" />)
await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/applications/a/generate', expect.any(Object)))
expect(screen.getByText(/generating enhanced resume/i)).toBeDefined()
```

- [ ] **Step 2: Run focused test**

Run: `npm run test:run -- tests/components/ApplicationReview.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement user-facing states**

Render job title, source resume label, a progress message during generation, `AtsReport` + `SuggestionReview` when ready, retry after failure, and download once confirmation returns a final Resume.

- [ ] **Step 4: Re-run focused test**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/applications src/components/ApplicationReview.tsx tests/components/ApplicationReview.test.tsx
git commit -m "feat: add per-application resume review"
```

### Task 4: Expand collapsed JD sections and create Application from extension

**Files:**
- Create: `extension/prepare-job-page.js`
- Modify: `extension/popup.html`
- Modify: `extension/popup.js`
- Modify: `extension/README.md`
- Test: `tests/extension/prepare-job-page.test.ts`

**Interfaces:**
- `prepareJobPage(doc = document): Promise<string>` clicks collapsed elements matching `qualification`, `requirements`, `responsibilities`, `what we're looking for`, or `skills`, waits 300ms, then returns filtered JD text.
- Popup `Generate enhanced resume` posts to `POST /api/applications` and opens `/applications/[id]`.

- [ ] **Step 1: Write failing extractor tests**

```ts
const doc = docFrom(`<button aria-expanded="false">Qualification</button><section hidden>Cloud architecture: AWS, Azure, GCP</section>`)
const text = await prepareJobPage(doc)
expect(text).toContain('Cloud architecture: AWS, Azure, GCP')
expect(text).not.toContain('Additional Information')
```

- [ ] **Step 2: Run focused test**

Run: `npm run test:run -- tests/extension/prepare-job-page.test.ts`

Expected: FAIL because `prepare-job-page.js` does not exist.

- [ ] **Step 3: Implement deterministic expansion and handoff**

Click matching controls and remove `hidden` only through the control's native click behavior. Collect content from Job Description through Qualification/Requirements; stop at Locations, Additional Information, Equal Opportunity, or About. In popup, replace `Open in Dynamic Resume` with `Generate enhanced resume`, create the Application with active tab URL/title, and open its review page.

- [ ] **Step 4: Re-run focused tests**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add extension tests/extension/prepare-job-page.test.ts
git commit -m "feat: generate per-job resumes from extension"
```

### Task 5: End-to-end verification

**Files:**
- Modify: `extension/README.md`

- [ ] **Step 1: Run all automated checks**

```bash
npm run test:run
npx tsc --noEmit
GEMINI_API_KEY= OPENAI_API_KEY= npm run build
npx eslint extension/
```

- [ ] **Step 2: Manually verify Accenture**

Load the unpacked extension, open the Accenture Solution Architect listing, use the quick confirmation, confirm captured text includes `Cloud architecture (AWS, Azure, or GCP)` and excludes `Additional Information`, generate one new application, review its ATS gaps, and save/download its final Resume.

- [ ] **Step 3: Commit README verification result**

```bash
git add extension/README.md
git commit -m "docs: record application-generation extension flow"
```
