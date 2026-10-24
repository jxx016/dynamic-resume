# Job-Application Resume Generation Design

## Goal

Generate and retain one truthful, ATS-oriented resume for every job application. A user keeps structured base resumes as their common skill profile, chooses one as the source for an application, and receives a new derived resume for that specific job.

## Core model

- **Base resume:** persistent, user-imported structured profile. It is the source of real roles, bullets, skills, education, and projects.
- **Application:** persistent record for one job page. It holds source URL/title, captured JD, selected base resume, provider, tailoring state, AI result, and (after confirmation) final derived resume id.
- **Tailored resume:** a new `Resume` created only after the user reviews honest gap suggestions. It never overwrites a base resume.

## Extension flow

1. Popup opens on a job page and expands collapsed job-content sections whose labels match `qualification`, `qualifications`, `requirements`, `responsibilities`, `what we're looking for`, or `skills`.
2. The extension waits briefly for DOM updates, then extracts the JD. Accenture-style accordions therefore include Job Description and Qualification content but not Locations, Additional Information, or legal boilerplate.
3. The popup displays editable captured text for a quick user confirmation.
4. Clicking **Generate enhanced resume** creates an Application via the web app, then opens `/applications/[id]`.
5. The application page starts generation, shows progress, then renders ATS coverage and pending honest suggestions. The user confirms/rejects suggestions and downloads the resulting PDF.

## API and persistence

`Application` fields:

```ts
{
  id: string,
  baseResumeId: string,
  job: { url: string, title: string },
  jdText: string,
  provider: 'gemini' | 'openai',
  status: 'draft' | 'generating' | 'ready' | 'finalized' | 'failed',
  tailoringResult?: TailoringResult,
  finalResumeId?: string,
  error?: string,
  createdAt: string,
  updatedAt: string
}
```

- `POST /api/applications`: validates base resume and JD, creates a `draft` application, returns it quickly.
- `POST /api/applications/[id]/generate`: turns `draft` into `generating`, calls the existing tailoring agent, persists `ready` plus `TailoringResult`; persists `failed` plus a safe error on failure. It is idempotent for a `ready` record and rejects simultaneous generation.
- `POST /api/applications/[id]/confirm`: applies explicit user decisions, creates a non-base tailored Resume, marks the application `finalized`, and returns the Resume.
- `GET /api/applications/[id]`: returns the persistent application state.

## Honesty and ATS rules

- Reuse current structured output, Zod validation, one repair retry, and forced `pending` suggestion statuses.
- Highlight gaps; do not invent credentials, skills, employers, dates, or accomplishments.
- The tailored content is generated per application, and a final PDF is only saved after user review.

## Testing and error handling

- Unit-test section expansion and extraction with closed Accenture-like Qualification markup.
- Unit-test application store lifecycle and API state transitions.
- Missing base resume or JD: 400/404; bad provider: 400; malformed AI output: 502; a duplicate generation attempt: 409.
- The application page displays an actionable failed state and lets the user retry.

## Out of scope

- Silent file upload into an employer's application form (browser security prevents this).
- Full application-form autofill beyond current best-effort contact fields.
