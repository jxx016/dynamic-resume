# Dynamic Resume — Agent Handoff

Last updated: 2026-09-02

## Product intent

Dynamic Resume helps candidates create an honest, job-specific resume for every application. A browser extension captures a job description; the web app generates and reviews a new ATS-readable resume using only verified candidate information.

The target experience is profile-first:

1. A new user uploads one or more resumes or builds one with AI.
2. Imports form one editable, verified candidate profile.
3. On a job page, the extension captures the JD and starts a fresh tailored-resume application from that complete profile.
4. The user can use the generated resume immediately, answer one to three high-impact permission questions to add honest evidence, or request résumé-only edits.

## Current stable functionality

- Next.js local-first web app with SQLite-backed resume storage.
- Resume import from PDF/DOCX/text and an AI-assisted resume builder.
- Gemini and OpenAI provider support.
- ATS-safe React-PDF renderer and resume download.
- Per-job `Application` records: captured JD, provider, preferences, generated result, review, and final resume.
- Chrome Manifest V3 extension that detects/captures job descriptions, expands generic relevant collapsed sections, opens the web app to generate a new tailored resume, and safely autofills contact fields.
- The extension cannot automatically attach a file to a third-party application; browser security prevents scripts from setting file inputs.
- Truthfulness safeguards: the tailoring step preserves verified base content, and unverified claims appear as suggestions rather than resume facts.

## Important product decisions

- Do not claim an ATS score guarantees an interview.
- Do not fabricate skills, metrics, employers, dates, qualifications, or experience.
- Use all uploaded evidence by default; a one-resume picker should become an advanced layout preference, not the normal flow.
- Confirmed enhancement answers become editable, reusable profile evidence.
- Imported resumes merge automatically. Users may edit the profile and remove a source resume.
- Removing a source must preserve profile facts that are also supported by another source or a user edit.
- Preserve the fuller layout/detail of the most appropriate source resume by default, while tailoring its content to the JD.

## Design and plan

- Approved design: `docs/superpowers/specs/2026-09-01-profile-first-resume-generation-design.md`
- Draft implementation plan: `docs/superpowers/plans/2026-09-01-profile-first-resume-generation.md`

## Active implementation state

Work is isolated in:

- Worktree: `.worktrees/profile-first-generation`
- Branch: `codex/profile-first-generation`

This branch is **not ready to merge or demo**. Its changes are currently uncommitted.

### Implemented but unverified on the active branch

- `Profile` schema with evidence provenance.
- Deduplication for profile skills and source-provenance retention.
- Source removal logic that removes only evidence uniquely supported by that source.
- SQLite profile store and `/api/profile` GET/PUT route.
- Resume import route attempts to merge newly imported resumes into the profile.
- Application route accepts a profile-based generation request without `baseResumeId`, creates a virtual profile snapshot, and passes it to the existing tailoring flow.
- Extension UI removes the source resume selector and attempts to use `/api/profile` for generation and contact autofill.

### Still required before this feature is usable

- Add a complete profile editor UI.
- Add source-removal preview and confirmation API/UI.
- Migrate existing saved resumes into a profile, or provide a one-time rebuild action; currently only future imports merge.
- Add sequential one-to-three-question enhancement interview and save confirmed answers as user-owned profile evidence.
- Add a guarded resume-edit chat that only accepts truthful, in-scope editing instructions.
- Add application evidence selection/ranking and a review view that explains profile evidence used.
- Add/update API, component, and extension tests.
- Manually test import of multiple resumes, profile merge, job-page capture, profile-based generation, PDF review, and extension reload.

## Test status and known blocker

- The stable main checkout previously passed `89` Vitest tests and `npx tsc --noEmit`.
- In `.worktrees/profile-first-generation`, targeted profile service tests pass and TypeScript currently passes.
- Vitest worker processes crash in the nested worktree whenever SQLite-oriented suites run (`ERR_IPC_CHANNEL_CLOSED` / exit 139), even with fresh dependencies. The equivalent existing suite passes from the main checkout.
- Do not treat this as a product test pass. Resolve it or move the branch to a testable isolated checkout before claiming completion.

## Helpful files

- `src/lib/schema/resume.ts` — canonical resume shape.
- `src/lib/schema/application.ts` — per-job application state.
- `src/lib/agents/tailor.ts` — tailoring and content-preservation guard.
- `src/lib/agents/confirm.ts` — suggestion confirmation safety checks.
- `src/lib/store/` — SQLite stores.
- `src/app/api/applications/` — application API lifecycle.
- `src/components/ApplicationReview.tsx` — generated resume review/download view.
- `extension/prepare-job-page.js` — generic collapsed-section expansion and JD extraction.
- `extension/popup.js` — browser extension flow.

## Suggested continuation order

1. Make the active branch testable and add failing tests for profile persistence, import merge, source deletion, and profile-based application creation.
2. Finish the profile API and existing-resume migration/rebuild path.
3. Build the profile editor and source deletion confirmation UI.
4. Complete profile-based extension generation and profile contact autofill.
5. Add enhancement interview and scoped resume-edit chat.
6. Run typecheck, full tests, production build, and an end-to-end local extension smoke test.
