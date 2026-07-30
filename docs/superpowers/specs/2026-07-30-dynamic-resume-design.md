# Dynamic Resume — Design Spec

**Date:** 2026-07-30
**Status:** Approved (design) → moving to implementation plan
**Owner:** John

---

## 1. Problem

To beat ATS (Applicant Tracking Systems) and stand out to human reviewers, a resume should be tailored to each job's description (JD). Hand-crafting a fresh resume per application is time-consuming and stressful. Dynamic Resume removes that friction with an AI layer that tailors a base resume to any JD while staying honest to the user's real experience.

## 2. Goals & Non-Goals

**Goals**
- Keep a **library of base resumes**; tailor any of them to a JD in one pass.
- Produce an **ATS-friendly PDF** that is safe by construction.
- Tailor **truthfully**: reframe/reorder real experience; propose additions the user explicitly confirms.
- Let the AI **build a resume from scratch** for users who don't have one.
- Grow from a personal local tool into a product without re-architecture.

**Non-Goals (now)**
- Silent auto-attach of the generated PDF into an application's file-upload field — **browsers block programmatic file-input setting; out of scope.**
- Multi-user accounts, billing, teams (architected for, not built now).
- Multiple visual templates / DOCX output (later enhancement).

## 3. Key Decisions

| Area | Decision |
|---|---|
| Form factor | Web app + browser extension, built in **phases** (P1 web app, P2 extension) |
| Audience | Personal now, architected to become a product later |
| JD input | Extension grabs JD from the page (hero path); **paste JD text** universal fallback |
| Tech stack | **Next.js + TypeScript** monolith (route handlers for AI + PDF); TS shared with extension later |
| AI provider | **Google Gemini API** (`@google/genai`), structured-output (JSON) mode |
| Tailoring style | Truthful reframing + suggested additions the user confirms (human-in-the-loop) |
| Output | ATS-friendly single-column PDF |
| Data model | Canonical **Resume JSON** is the single source of truth; tailoring = transform on JSON |
| Resume library | Multiple base resumes; AI can auto-pick the best-matching base for a JD |
| Hosting | Local-first (`npm run dev` + SQLite); deploy to Vercel + Postgres later |
| Extension | Manifest V3, loaded unpacked for personal use; Chrome Web Store only if productized |

## 4. Architecture Overview

Everything revolves around a canonical **Resume JSON**. Base resumes, AI-built resumes, and tailored outputs are all the same shape. Tailoring produces a new instance of that shape plus metadata.

```
Base Resume (import PDF/DOCX / paste / AI-drafted)
        │  parse → canonical Resume JSON  (source of truth)
        ▼
   [Resume Store]  ── multiple base resumes ──┐
        │                                      │
JD text ─┼─► Base-Picker (rank best base) ─────┘
        │
        ├─► Tailoring Agent (Gemini) ──► TailoringResult
        │        (changeLog, suggestions[pending], atsReport)
        │                 │
        │        user accepts/rejects suggestions
        ▼                 ▼
              PDF Renderer (no AI) ──► ATS-friendly PDF
```

**Phasing**
- **Phase 1 — Web app (core).** Import/create base resume → provide JD (paste) → tailor → review/confirm → download ATS PDF. Fully usable standalone.
- **Phase 2 — Browser extension.** Manifest V3 client that (a) scrapes the JD off the current job page and calls the tailor API, (b) autofills application **text** fields and surfaces a "resume ready" nudge. Reuses Phase 1 API + TS logic. No AI/PDF logic in the extension.

## 5. Data Model

```ts
Resume {
  id: string
  label: string            // "PM roles"
  isBase: boolean
  sourceResumeId?: string  // links tailored → its base
  basics:     { name, email, phone, location, links: string[] }
  summary:    string
  experience: Array<{ company, title, start, end, location,
                      bullets: Array<{ id, text, tags: string[] }> }>
  education:  Array<{ school, degree, field, start, end }>
  skills:     Array<{ name, category }>
  projects:   Array<{ name, description, bullets, links }>
  // extensible: certifications, publications, languages (add as needed)
  meta:       { createdAt, updatedAt }
}

TailoringResult {
  tailoredResume: Resume
  changeLog:   Array<{ field, before, after, reason }>          // what changed & why
  suggestions: Array<{ text, rationale, status: 'pending'|'accepted'|'rejected' }>
  atsReport:   { jdKeywords: string[], matched: string[], missing: string[], score: number }
}
```

Design consequences:
- The PDF Renderer only ever reads Resume JSON → output is **always ATS-safe by construction**.
- `changeLog` + `atsReport` give an explainable "what I changed and your keyword coverage" view instead of a black box.
- Additions arrive only as `pending` suggestions → the resume cannot silently gain unconfirmed claims.

## 6. Components (Phase 1)

| Module | Job | Depends on |
|---|---|---|
| **Resume Store** | CRUD for the resume library; interface-backed so SQLite→Postgres is a swap | SQLite |
| **Resume Importer** | Parse uploaded PDF/DOCX or pasted text → Resume JSON | Gemini |
| **Builder Agent** | Conversational Q&A that drafts a Resume JSON from scratch/rough notes | Gemini |
| **Tailoring Agent** | Transform base Resume JSON against a JD → TailoringResult | Gemini |
| **Base-Picker** | Given a JD + library, rank which base fits best | Gemini |
| **PDF Renderer** | Resume JSON → ATS-safe single-column PDF, deterministic | — |
| **Web UI** | Library view, JD input, review/confirm suggestions, download | above via API |

**Two agents, deliberately separate:**
- **Builder Agent** — *creates.* Interviews the user or ingests a rough draft, asks targeted follow-ups, emits clean Resume JSON. Used once per base resume.
- **Tailoring Agent** — *transforms.* Never invents; reorders/rephrases real bullets to match JD priorities; emits `suggestions[]` as pending. Used every application.

**Rule:** Gemini only ever reads and writes Resume JSON (structured in, structured out). It never touches PDF layout.

## 7. API Surface

Next.js route handlers. The extension (Phase 2) reuses these exact endpoints.

```
POST /api/resumes            create/import a base resume  → Resume JSON
GET  /api/resumes            list the library
PUT  /api/resumes/:id        edit
POST /api/builder/message    Builder Agent turn (chat) → partial/complete Resume JSON
POST /api/tailor             { baseResumeId | 'auto', jdText } → TailoringResult
POST /api/tailor/:id/confirm accept/reject suggestions → finalized Resume JSON
POST /api/render/:id         Resume JSON → ATS PDF (download)
```

**Extension boundary (Phase 2):** two responsibilities only — (1) scrape visible JD text off the current job page and `POST /api/tailor`; (2) locate application form fields and offer to autofill text values + surface the "resume ready" nudge (sensible filename `First_Last_Company.pdf`). Everything heavy stays server-side.

## 8. Error Handling

- **AI output validation:** every Gemini response validated against the Resume/TailoringResult schema (Zod). Invalid → one repair retry, then a clear error. Malformed AI JSON never reaches the store or renderer.
- **JD/parse failures:** empty/junk JD → prompt user to paste/confirm. Poorly parsed PDF/DOCX import → show extracted JSON for user correction before saving.
- **Honesty guardrail:** additions land as `pending`, require explicit accept; tailored resume can't silently gain unconfirmed claims.
- **Gemini/API errors:** rate limit/timeout → retry with backoff, then readable message; never a half-written resume persisted.

## 9. Testing

- Unit tests for **PDF Renderer** (JSON→ATS-safe PDF, deterministic) and **schema validation**.
- **Agent tests** run against recorded/mocked Gemini responses → fast, deterministic.
- **Golden-file test**: a known resume + JD produces the expected `changeLog`/`atsReport` shape.

## 10. Deployment

- **Local dev:** `npm run dev` → `localhost:3000`, SQLite file on disk. `GEMINI_API_KEY` as server-side env var.
- **Later:** deploy to **Vercel**, swap Resume Store to **Vercel Postgres / Supabase** (config change, not rewrite).
- **Extension:** build Manifest V3, load unpacked via `chrome://extensions` for personal use; publish to Chrome Web Store ($5 one-time) only if productized.

## 11. Future / Out of Scope (tracked, not built now)

- File auto-attach (blocked by browsers) — smart nudge only.
- Multi-user accounts, billing.
- DOCX output, multiple visual templates.
- Cover-letter generation from the same Resume JSON + JD.
