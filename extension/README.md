# Dynamic Resume — browser extension

Two things, both deterministic (no AI runs inside the extension itself —
it only talks to the Dynamic Resume web app's existing API):

1. **Per-job resume generation.** Detects whether the page you're on looks
   like a job posting, expands relevant closed sections such as
   Qualifications, and captures the job description. After your quick
   confirmation, it creates a new tailored-resume application in the web
   app — one distinct version for that job.
2. **Field autofill.** Fills in name/email/phone/location text fields on an
   application form from your selected resume. It does **not** attach the
   resume file itself — browsers block scripts from setting a file input's
   value, and always will (a security boundary, not a gap in this build).
   Download the finalized PDF and attach it yourself.

## Load it

1. Make sure the web app is running: `npm run dev` (must be on `localhost:3000`).
2. In Chrome, go to `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked**, and select this `extension/` folder.
5. Pin the extension (puzzle-piece icon in the toolbar → pin) so it's easy to click.

## Use it

1. Open a real job posting in a tab, then click the extension icon.
2. **The popup automatically checks whether this page looks like a job
   posting** and, if so, pre-fills the captured text for you.
   - If it doesn't look like one, or the capture looks wrong, highlight the
     job description on the page yourself and click **Use selected text
     instead** — or click **Grab job description** to retry (useful on
     pages that finish loading content after the popup first checked).
3. Pick which of your saved resumes to tailor, then **read the captured
   text before continuing** — detection is best-effort and can grab the
   wrong section, especially on sites it wasn't tested against.
4. Click **Generate tailored resume**. The app creates a saved application
   tied to this job URL and begins generating a new, truthful resume version.
   Review the ATS coverage and any proposed experience gaps, then accept or
   reject them before saving and downloading the final PDF.
5. Separately, whenever you're on the actual application form (often the
   same page, below the JD, on sites like Greenhouse), click **Autofill
   name/email/phone on this page**. It tells you which fields it found and
   which it didn't — check its work before submitting.

## Known limitations (by design, not bugs)

- **LinkedIn and similar dynamic/login-gated sites will likely fail to
  auto-capture, and their forms likely won't autofill either.** Use the
  manual-selection fallback for JD capture; fill the form yourself.
- The known-site selectors (Greenhouse-, Lever-style class patterns, and
  the autofill field-matching patterns) are best-effort guesses, not
  verified against every live page. Expect to need the manual fallbacks
  on sites they don't match yet.
- Autofill never invents data — it only fills a field with your resume's
  own contact info, and only when it's reasonably confident it found the
  right field. A field it can't confidently identify is left alone rather
  than guessed at.
- The resume file itself can never be auto-attached to a file upload
  field — this is a browser security restriction with no workaround.
- If `npm run dev` isn't running, the popup will tell you it can't reach
  the app — start the dev server and reopen the popup.
- If you have no resumes imported yet, import one in the web app first.
- The extension uses the app's configured default OpenAI or Gemini provider.
  Add at least one valid key before generating.

## Why no build step

Plain HTML/JS, no bundler. The popup is small enough that this stays
simple, and it avoids adding a second toolchain to the project.
