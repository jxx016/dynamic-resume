# Profile-First Resume Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate every job-specific resume from one editable, provenance-backed candidate profile assembled from all uploaded resumes.

**Architecture:** Add a `ProfileStore` beside the existing resume and application stores. Importing a base resume merges its structured facts into the profile; applications snapshot an eligible, deduplicated profile as a virtual base resume before using the existing tailor/confirm pipeline. The extension starts a profile-based application and uses profile basics for contact autofill.

**Tech Stack:** Next.js 16 route handlers and client components, TypeScript, Zod, better-sqlite3, Vitest, Chrome Manifest V3.

**Spec:** `docs/superpowers/specs/2026-09-01-profile-first-resume-generation-design.md`

## Global Constraints

- Remain local-first; do not add cloud sync.
- Never generate or persist unsupported claims as verified evidence.
- Keep existing tailored resume outputs readable after a source is deleted.
- A base-resume import automatically merges; users can edit the resulting profile.
- Keep the extension's manual file-attachment boundary unchanged.

---

### Task 1: Add provenance-backed profile schema and storage

**Files:**
- Create: `src/lib/schema/profile.ts`
- Create: `src/lib/profile/profile-service.ts`
- Create: `src/lib/store/profile-store.ts`
- Create: `src/lib/store/sqlite-profile-store.ts`
- Modify: `src/lib/store/db.ts`
- Modify: `src/lib/app-context.ts`
- Test: `tests/lib/profile/profile-service.test.ts`
- Test: `tests/lib/store/sqlite-profile-store.test.ts`

**Interfaces:**
- Produces `ProfileSchema`, `Profile`, `ProfileEvidence`, `mergeResumeIntoProfile(profile, resume)`, and `profileToResume(profile, id, label, now)`.
- Produces `ProfileStore.get()`, `replace(profile)`, and `clearSource(sourceResumeId)`.

- [ ] **Step 1: Write failing merge and source-removal tests**

```ts
it('deduplicates equivalent skills and retains both source ids', () => {
  const merged = mergeResumeIntoProfile(emptyProfile(), resume('r_1', ['TypeScript']))
  const result = mergeResumeIntoProfile(merged, resume('r_2', ['typescript']))
  expect(result.skills).toHaveLength(1)
  expect(result.skills[0].provenance.map(p => p.sourceId)).toEqual(['r_1', 'r_2'])
})

it('removes only facts uniquely supported by a deleted source', () => {
  const profile = profileWithSharedAndUniqueEvidence()
  expect(clearSource(profile, 'r_1').skills.map(skill => skill.value.name)).toEqual(['TypeScript'])
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx vitest run tests/lib/profile/profile-service.test.ts tests/lib/store/sqlite-profile-store.test.ts`

- [ ] **Step 3: Implement the schemas, merge logic, and SQLite profile row**

```ts
export type Provenance = { sourceId: string; sourceType: 'resume' | 'user'; originalText: string }
export type Evidence<T> = { id: string; value: T; provenance: Provenance[]; conflict?: boolean }

export function mergeResumeIntoProfile(profile: Profile, resume: Resume): Profile {
  // normalize comparable fields, add provenance to equivalents, create new evidence otherwise
}
```

- [ ] **Step 4: Run profile tests and typecheck**

Run: `npx vitest run tests/lib/profile/profile-service.test.ts tests/lib/store/sqlite-profile-store.test.ts && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/lib/schema/profile.ts src/lib/profile src/lib/store src/lib/app-context.ts tests/lib/profile tests/lib/store/sqlite-profile-store.test.ts
git commit -m "feat: add provenance-backed candidate profile"
```

### Task 2: Merge imports, expose profile APIs, and safely delete sources

**Files:**
- Create: `src/app/api/profile/route.ts`
- Create: `src/app/api/profile/source/[id]/route.ts`
- Modify: `src/app/api/resumes/route.ts`
- Modify: `src/app/api/resumes/[id]/route.ts`
- Test: `tests/app/api/profile-route.test.ts`
- Test: `tests/app/api/resumes-create-route.test.ts`
- Test: `tests/app/api/resumes-id-route.test.ts`

**Interfaces:**
- Consumes Task 1 `ProfileStore` and profile service.
- Produces `GET/PUT /api/profile` and `DELETE /api/profile/source/:id?preview=true` / confirmed delete behavior.

- [ ] **Step 1: Write failing API tests**

```ts
it('automatically merges an imported resume into the profile', async () => {
  await importResumeRoute(uploadRequest())
  expect((await profileRoute(new Request('http://test'))).status).toBe(200)
})

it('previews unique profile facts before deleting a source', async () => {
  const response = await deleteSource(new Request('http://test?preview=true'), params('r_1'))
  expect((await response.json()).willRemove).toContainEqual(expect.objectContaining({ id: expect.any(String) }))
})
```

- [ ] **Step 2: Run route tests and confirm they fail**

Run: `npx vitest run tests/app/api/profile-route.test.ts tests/app/api/resumes-create-route.test.ts tests/app/api/resumes-id-route.test.ts`

- [ ] **Step 3: Add import merge and deletion preview/confirmation routes**

```ts
const created = store.create(resume)
profiles.replace(mergeResumeIntoProfile(profiles.get(), created))
return NextResponse.json(created)
```

- [ ] **Step 4: Run route tests and typecheck**

Run: `npx vitest run tests/app/api/profile-route.test.ts tests/app/api/resumes-create-route.test.ts tests/app/api/resumes-id-route.test.ts && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/app/api/profile src/app/api/resumes src/lib tests/app/api
git commit -m "feat: merge resume uploads into candidate profile"
```

### Task 3: Generate applications from a profile snapshot

**Files:**
- Modify: `src/lib/schema/application.ts`
- Modify: `src/lib/agents/tailor.ts`
- Modify: `src/app/api/applications/route.ts`
- Modify: `src/app/api/applications/[id]/generate/route.ts`
- Modify: `src/app/api/applications/[id]/confirm/route.ts`
- Test: `tests/app/api/applications-route.test.ts`
- Test: `tests/lib/agents/tailor.test.ts`

**Interfaces:**
- Consumes `profileToResume` from Task 1.
- Replaces required `baseResumeId` with optional `layoutResumeId`; saves `profileSnapshot` and `selectedEvidenceIds` on each application.

- [ ] **Step 1: Write failing application tests**

```ts
it('creates a profile-based application without a baseResumeId', async () => {
  const response = await createApplication(request({ provider: 'gemini', jdText: 'Need AWS', job }))
  expect(response.status).toBe(200)
  expect((await response.json()).profileSnapshot.skills).toContainEqual(expect.objectContaining({ name: 'AWS' }))
})

it('does not include unsupported profile conflicts in generation input', async () => {
  await generateApplication(new Request('http://test'), params('a_1'))
  expect(modelPrompt()).not.toContain('Conflicting title')
})
```

- [ ] **Step 2: Run tests and confirm they fail**

Run: `npx vitest run tests/app/api/applications-route.test.ts tests/lib/agents/tailor.test.ts`

- [ ] **Step 3: Build a virtual verified resume from the profile snapshot and pass it to the existing tailor guard**

```ts
const virtualBase = profileToResume(application.profileSnapshot, `profile_${application.id}`, 'Profile snapshot', now)
const tailoringResult = await tailorResume(clientFor(application.provider), virtualBase, application.jdText, application.tailoringInstructions)
```

- [ ] **Step 4: Run application and tailoring tests**

Run: `npx vitest run tests/app/api/applications-route.test.ts tests/lib/agents/tailor.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/schema/application.ts src/lib/agents/tailor.ts src/app/api/applications tests/app/api/applications-route.test.ts tests/lib/agents/tailor.test.ts
git commit -m "feat: generate job resumes from profile evidence"
```

### Task 4: Add profile management and resume-only editing UI

**Files:**
- Create: `src/components/ProfileEditor.tsx`
- Create: `src/components/ResumeEditChat.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/components/ApplicationReview.tsx`
- Modify: `src/app/api/applications/[id]/generate/route.ts`
- Test: `tests/components/ProfileEditor.test.tsx`
- Test: `tests/components/ApplicationReview.test.tsx`

**Interfaces:**
- Consumes `GET/PUT /api/profile`.
- Resume chat sends a 1,000-character `tailoringInstructions` update scoped to the current application.

- [ ] **Step 1: Write failing UI tests**

```tsx
it('saves profile changes', async () => {
  render(<ProfileEditor />)
  await userEvent.type(await screen.findByLabelText(/summary/i), 'Platform engineer')
  await userEvent.click(screen.getByRole('button', { name: /save profile/i }))
  expect(fetch).toHaveBeenCalledWith('/api/profile', expect.objectContaining({ method: 'PUT' }))
})

it('shows that an application was generated from the profile', async () => {
  render(<ApplicationReview applicationId="a_1" />)
  expect(await screen.findByText(/verified profile/i)).toBeDefined()
})
```

- [ ] **Step 2: Run component tests and confirm they fail**

Run: `npx vitest run tests/components/ProfileEditor.test.tsx tests/components/ApplicationReview.test.tsx`

- [ ] **Step 3: Implement profile editing and a guarded instruction control**

```tsx
<textarea aria-label="Resume editing instruction" maxLength={1000} placeholder="Emphasize customer-facing solution design." />
<p className="section-hint">Only truthful changes to this resume are allowed.</p>
```

- [ ] **Step 4: Run component tests**

Run: `npx vitest run tests/components/ProfileEditor.test.tsx tests/components/ApplicationReview.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add src/components/ProfileEditor.tsx src/components/ResumeEditChat.tsx src/components/ApplicationReview.tsx src/app/page.tsx tests/components
git commit -m "feat: add editable candidate profile and resume edit chat"
```

### Task 5: Make the extension profile-first and verify end-to-end behavior

**Files:**
- Modify: `extension/popup.html`
- Modify: `extension/popup.js`
- Modify: `extension/README.md`
- Test: `tests/extension/popup-profile-flow.test.ts`
- Test: `tests/app/api/applications-route.test.ts`

**Interfaces:**
- Extension creates `POST /api/applications` without `baseResumeId`.
- Autofill fetches `GET /api/profile` basics.

- [ ] **Step 1: Write the failing extension flow test**

```ts
it('creates an application from the profile without rendering a source selector', async () => {
  await initPopup()
  expect(document.querySelector('#resume-select')).toBeNull()
  await generate()
  expect(postedApplication()).not.toHaveProperty('baseResumeId')
})
```

- [ ] **Step 2: Run extension test and confirm it fails**

Run: `npx vitest run tests/extension/popup-profile-flow.test.ts`

- [ ] **Step 3: Replace the source picker with profile readiness and profile-based contact autofill**

```js
const profile = await fetch(`${APP_ORIGIN}/api/profile`).then(response => response.json())
generateBtn.disabled = !profile || jdText.value.trim().length === 0 || !defaultProvider
```

- [ ] **Step 4: Run the full verification set**

Run: `npm test -- --run && npx tsc --noEmit && GEMINI_API_KEY= OPENAI_API_KEY= npm run build`

- [ ] **Step 5: Perform a local browser smoke test**

Run: start the existing local server, import two resumes, verify the profile merges shared skills, generate an application from a captured JD, and confirm the review page says it used verified profile evidence.

- [ ] **Step 6: Commit**

```bash
git add extension tests/extension tests/app/api/applications-route.test.ts
git commit -m "feat: make browser extension generate from profile"
```
