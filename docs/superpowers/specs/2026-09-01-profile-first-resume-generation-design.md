# Profile-First Resume Generation Design

## Purpose

Dynamic Resume helps a candidate create an honest, job-specific resume for each application. Uploaded resumes are evidence sources, not a required per-job choice. The product builds and maintains one editable profile from all verified source material, then uses the relevant parts of that profile to generate a new resume for each job description.

## User flow

### Onboarding

1. A new user uploads one or more resumes, or completes the existing AI-assisted resume builder.
2. Each imported resume is parsed and automatically merged into the user's profile.
3. The user can immediately edit the resulting profile, including contact information, roles, bullets, projects, education, and skills.

### Generate for a job

1. On a job posting, the browser extension captures the job description, including relevant expanded sections when available.
2. The user selects **Generate tailored resume**. The normal flow has no source-resume picker.
3. The application ranks verified profile evidence against the job description and generates a new resume for that job.
4. The output uses the candidate's richer source-resume layout by default, but reorganizes and rewrites only verified content for fit, clarity, and keyword coverage.
5. The candidate views the generated resume, its fit rationale, and any missing high-value requirements before downloading it.

### Enhance with permission

1. The candidate can choose an enhancement mode before generation or from the review screen.
2. The application identifies the one to three highest-impact requirements not supported by the profile.
3. It asks one short question at a time.
4. A confirmed answer becomes editable profile evidence and can be used in this and future applications. Declined or unanswered suggestions are never added.

### Editing and source management

- A resume-only chat box accepts targeted instructions such as "emphasize customer-facing solution design" or "make the summary more concise."
- It may reorder, summarize, or rephrase verified content, but may not invent experience, skills, credentials, metrics, employers, or dates.
- Users can upload additional resumes at any time; they merge automatically into the profile.
- Users can edit any profile item.
- Users can delete an uploaded resume. Profile evidence that is supported by another source or a user edit remains. Evidence that is unique to the deleted upload is removed after a confirmation that states what will disappear.

## Data model

### ResumeSource

An existing base resume becomes a `ResumeSource`: a parsed uploaded or AI-built document with immutable source content and metadata. Tailored resumes are outputs, not profile sources.

### Profile

One local profile holds canonical, editable candidate data:

- basics and links
- summary preferences
- experiences and bullets
- projects and bullets
- education
- skills

Each profile item has a stable id, a set of provenance records, an editable value, and a verification state.

### Provenance

A provenance record identifies the supporting `ResumeSource` or a user-confirmed answer. It stores the original extracted text and a source type. An item may have multiple records when equivalent evidence appears across resumes.

Manual edits are represented as a user-owned provenance record, rather than overwriting source provenance. This means source deletion never erases a fact the user has explicitly retained or revised.

### Application and output

Each application saves the captured job data, optional resume-editing instruction, selected profile evidence ids, enhancement answers, generated tailoring result, and finalized output id. This gives every generated resume an auditable link to the evidence used.

## Merge and deletion rules

### Automatic merge

Import creates or updates profile items immediately.

- Experience candidates match on normalized employer, role title, and overlapping dates.
- Projects match on normalized name and materially equivalent description.
- Skills match on normalized canonical name.
- Contact, education, and links use normalized values.

Equivalent facts add provenance to the existing item. Non-equivalent facts create new items. Conflicting dates, titles, or basic contact values remain visible as profile conflicts; generation uses neither conflicting value until the user selects or edits a value.

### Source deletion

Before a source is deleted, the app previews the profile items that would lose their final provenance. On confirmation, it removes the source provenance and deletes only items with no remaining provenance. User-owned edits count as provenance and therefore survive.

Existing generated resumes remain downloadable and retain a snapshot of their generated content even if a source is deleted later.

## Generation rules

1. Only verified, non-conflicting profile evidence is eligible.
2. Evidence is ranked against the job description for relevance, impact, recency, and keyword coverage.
3. The model may change wording and order, but it cannot add unsupported facts.
4. The generated resume should preserve a fuller, professional source style by default. It may use two pages when that best demonstrates fit; it must not remove meaningful experience merely to meet a page count.
5. A deterministic post-generation validation compares every claim and skill with the eligible evidence. Unsupported additions become questions, not resume content.
6. A candidate can request job-scoped editing instructions in the chat box. Instructions that attempt non-resume actions or fabrication are rejected with a clear explanation.

## Components and boundaries

- **Profile service:** merges source resumes, records provenance, resolves conflicts, supports edits and source deletion.
- **Profile API and UI:** shows profile evidence and source attribution, edits values, displays deletion impact, and manages imports.
- **Application generator:** selects profile evidence, produces a job-specific resume, and saves an evidence snapshot with the application.
- **Enhancement interview:** derives prioritized gaps, asks sequential questions, validates answers, and adds confirmed evidence to the profile.
- **Resume editing chat:** validates scoped instructions and applies only truth-preserving revisions to a generated application draft.
- **Extension:** captures job information and starts a profile-based application; it no longer requires a base-resume selection.

## Error handling

- Imports that cannot be parsed remain available for retry and do not change the profile.
- Merge conflicts are surfaced to the user and excluded from generation until resolved.
- If no eligible profile evidence exists, generation directs the user to complete their profile instead of producing a thin or invented resume.
- A failed generation leaves the application and captured JD intact for retry.
- Failed enhancement answers never modify the profile.
- Deleting a source is cancellable until final confirmation.

## Testing

- Unit tests for normalization, merge, provenance retention, conflict detection, and deletion impact.
- API tests for profile creation, editing, importing, source deletion, and profile-based application creation.
- Generation tests that prove relevant evidence is selected from multiple source resumes and unsupported content is excluded.
- Enhancement tests for sequential one-to-three-question behavior and persistence of confirmed answers.
- Extension tests that verify it starts an application without a source-resume selection.
- End-to-end local test: import multiple resumes, generate for a captured JD, answer a permitted enhancement question, regenerate, edit through the chat box, and verify source removal preserves shared and user-confirmed evidence.

## Out of scope

- Automatic file upload to third-party job sites; browsers prohibit scripts from setting file-input values. The extension may guide the candidate to manually attach the downloaded file.
- Fabrication or inference of unverified qualifications.
- Cloud accounts, cross-device sync, and shared/team profiles. This phase remains local-first.
