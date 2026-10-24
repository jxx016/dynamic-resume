# Quality eval harness

Live-link-first checklist for Dynamic Resume.

## What it does

1. Reads jobs from `eval/jobs.json`
2. Fetches each **live URL** and captures the JD (same logic as the extension, including Ashby meta tags)
3. Creates + generates a tailored resume via your local app APIs
4. Asks an LLM to judge as **ATS** + **recruiter** (proxy only — not a real ATS)

## Requirements

- `npm run dev` on `http://localhost:3000`
- At least one AI key configured
- A usable profile (import resumes, or open `/profile` → Rebuild)

## Run

```bash
npm run eval:jobs
```

Optional:

```bash
APP_ORIGIN=http://localhost:3000 EVAL_JOBS=./eval/jobs.json npm run eval:jobs
```

Results land in `eval/results/` (gitignored).

## Add jobs

Edit `eval/jobs.json`:

```json
{
  "id": "acme-se",
  "url": "https://...",
  "title": "Solutions Engineer",
  "company": "Acme",
  "tailoringInstructions": "Optional preference for generation"
}
```

Exit code is `0` only if every job gets `judge.overallPass === true`.
