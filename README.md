# Dynamic Resume

Tailor a resume to each job from a verified profile.

Hand-writing a new resume for every job description is slow, and a generic resume is a weak match for both applicant-tracking keyword screens and a human reader. Dynamic Resume keeps one verified profile of your real experience and generates a separate, honest resume for each application.

It is a local tool for someone applying to jobs. It is built so it can become a product later. There are no accounts, no cloud sync, and no hosted deployment in this repo.

## What it does

1. **Build a verified profile.** Import a PDF, DOCX, or pasted resume, or draft one in the AI builder. Each base resume is stored as canonical JSON and merged into a single editable profile (contact, summary, experience, education, skills, projects) with source provenance.
2. **Capture a job.** Paste the job description in the web app, or use the Chrome extension on a posting. The extension tries to expand relevant collapsed sections and capture the description. You can also highlight text and use that instead.
3. **Generate one resume per application.** From the extension, Generate snapshots the verified profile (it does not ask you to pick a source resume), asks Gemini or OpenAI for a structured rewrite, and opens a per-job application: captured description, provider, optional tailoring preference, and result. The library's Tailor link is a separate path: it pastes a job description against one saved base resume, not the merged profile.
4. **Stay truthful.** The model may reorder and rephrase. It does not get to drop a verified role, project, skill, education entry, or contact fact. Anything new is a pending suggestion (at most three). You accept or reject those before the resume is saved.
5. **Download a PDF.** The renderer is deterministic React-PDF: a single-column, text-based resume. The extension can fill name, email, phone, and location on an application form. It cannot attach the PDF. Browsers block scripts from setting a file input, so you download the file and attach it yourself.

The review screen includes a keyword-overlap report (matched and missing terms, plus a score). That score is not a real ATS result and does not mean you will get an interview.

## Who it's for

Job seekers who want a distinct resume for each application without inventing employers, dates, metrics, or skills. You run it on your own machine, with your own API key, against a SQLite file on disk.

## Stack

- **Web app:** Next.js 16 and TypeScript (App Router, route handlers), React 19, Zod.
- **Models:** Google Gemini (`@google/genai`) and OpenAI. Both are asked for JSON. Pick a provider in the builder and tailor flows; the extension uses whichever provider is the configured default.
- **Storage:** `better-sqlite3` at `data/resumes.db` (gitignored). Override with `DB_PATH`.
- **PDF:** `@react-pdf/renderer`.
- **Extension:** Chrome Manifest V3, plain HTML/JS in `extension/`, no build step. It only calls the local app. See `extension/README.md`.
- **Checks:** Vitest. `npm run eval:jobs` fetches live job URLs and asks a model to judge the result as a proxy ATS and recruiter. See `eval/README.md`. Results are written to `eval/results/` and are not committed.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local` and set at least one key. `.env.example` only has placeholders. Do not commit real keys. `.env*` is gitignored except `.env.example`.

```
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-2.5-flash
OPENAI_API_KEY=your-key-here
OPENAI_MODEL=gpt-4o-mini
```

`AI_PROVIDER` (`gemini` or `openai`) is optional. When both keys are set, it chooses the default. Otherwise the app uses the first configured provider.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- Import a resume, or open **Build** and draft one.
- Open **Your profile**, correct anything the import got wrong, and save. **Rebuild from uploads** reconstructs the profile from saved base resumes.
- On a base resume, open Tailor and paste a job description to rewrite that resume alone.
- On a job posting, use the extension's Generate button to start a profile-based application. It opens the review page in the app.

Load the extension (the dev server must stay on port 3000):

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. **Load unpacked** and select the `extension/` directory.

Other commands:

```bash
npm run test:run   # Vitest once
npm run lint
npm run build
npm run eval:jobs  # needs the dev server, a key, and a usable profile
```

## Limits that are already true

- LinkedIn and other login-gated or heavily dynamic sites often fail job capture and autofill. Use the manual text selection, or paste the description in the app.
- Known-site selectors (Greenhouse- and Lever-style patterns, plus Ashby handling in the eval path) are best-effort.
- Autofill only writes contact fields it is confident about, and only from your profile. It never invents values.
- The profile editor edits contact, summary, skills, and experience. Education, projects, and links are stored and used when generating, but this screen does not edit them.
- Deleting a resume from the library removes that resume row. It does not yet preview or strip profile facts that came only from that upload, even though `clearSource` exists in the profile service.
- Imports do not flag disagreements. Two uploads with different titles become two experience entries. The schema can mark an item `conflict`, and generation skips flagged items, but nothing in the import path sets that flag and the editor has no conflict view.
- There is one PDF layout. No DOCX export, no cover letter, no accounts, and no Chrome Web Store listing.

## What's next

The core loop works locally: import, profile, per-job generation, suggestion review, PDF, and a capture-only extension. The approved profile-first design in `docs/superpowers/specs/2026-09-01-profile-first-resume-generation-design.md` still has a concrete unfinished slice. That is the next body of work:

1. **Finish profile maintenance.** Add education, projects, and links to the profile editor. When two uploads disagree (title, dates, contact), show the conflict and keep both values out of generation until you pick or edit one. Add a source-delete preview: call the existing `clearSource` path from an API and a confirm step so unique evidence disappears and shared or user-edited facts stay. Today a library delete does not do this.
2. **Explain the evidence used.** Save which profile items went into an application and show that on the review screen. Generation currently snapshots the whole non-conflicting profile and does not record a selection.
3. **Ask before adding anything.** On review, ask one to three short questions about high-impact job requirements the profile does not support. A confirmed answer becomes editable, user-owned profile evidence and can be reused. A decline never enters the resume. Pending suggestions exist today; this interview does not.
4. **Edit a generated resume without a new invention path.** The extension can send a short tailoring preference before generation. There is no review-screen chat that rephrases or reorders only verified content and rejects instructions to fabricate. The builder chat is only for drafting a base resume from scratch.
5. **Widen capture and the eval set.** Cover more real application boards than the current selectors, and grow `eval/jobs.json`. Treat the judge as a proxy: it is not a vendor ATS.

Explicitly later, and not part of that slice: multi-user accounts, sync, moving SQLite to hosted Postgres, a Web Store package, extra visual templates, and DOCX or cover-letter output. Attaching the PDF into a third-party file input stays out of scope.

Design notes and plans live in `BRAINSTORM.md` and `docs/superpowers/`.

## License

MIT. See [LICENSE](LICENSE). Copyright (c) 2026 John Xiang Rhong Soh.
