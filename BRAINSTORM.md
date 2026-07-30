# Dynamic Resume — Brainstorm

_Working notes. This is a living scratchpad while we shape the idea. The formal design spec will live under `docs/superpowers/specs/` once we lock things down._

## Problem Statement

To beat ATS (Applicant Tracking Systems) and stand out to human reviewers, a resume should be tailored to each job's description (JD). But hand-crafting a fresh resume per application is time-consuming and stressful — that friction is the problem we want to kill.

## Proposed Solution (initial)

An AI agent that:
1. Takes a **base resume** as input — either the user's existing one, or one the agent helps write from scratch.
2. Takes a **link (or text) of the target JD**.
3. **Rewrites/tailors** the resume to that JD (ATS-optimized, keyword-aware, honest to the user's real experience).
4. **(Stretch) Autofills the job application** for the user where possible.

## Decisions (locked-in so far)

- **Form factor:** Web app + browser extension, built in **phases** (Phase 1 = web app, Phase 2 = extension).
- **Audience:** Personal now, architected to become a product later.
- **JD input:** Extension grabs JD from the page (hero path); **paste JD text** as universal fallback (so Phase 1 works standalone).
- **Tech stack:** Next.js + TypeScript monolith (API routes for AI + PDF gen). TS shared with extension later.
- **AI provider:** **Google Gemini API** (`@google/genai`) — main LLM.
- **Tailoring style:** Truthful reframing + suggested additions the user confirms (human-in-the-loop; never fabricates).
- **Output:** ATS-friendly single-column PDF to start.
- **Data model:** Canonical **Resume JSON** is the single source of truth. Tailoring = transform on JSON → deterministic PDF.
- **Resume library:** User can hold **multiple base resumes**; AI can auto-pick the best-matching base for a given JD.
- **AI resume builder:** A conversational **Builder agent** creates a Resume JSON from scratch/rough draft. Separate from the **Tailoring agent**.
- **Auto-attach file:** OUT of scope — browsers block programmatic file-input setting. Instead: smart "resume ready" nudge + sensible filename. Text-field autofill stays in Phase 2.
- **Hosting:** Local-first (Next.js `npm run dev` + SQLite), deploy to Vercel + Postgres later. Extension loaded unpacked (Manifest V3) for personal use; Chrome Web Store only if productized.

## Open Questions

_(to be filled in as we brainstorm)_
