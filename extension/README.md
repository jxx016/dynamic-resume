# Dynamic Resume — JD capture extension

Grabs the job description off the page you're viewing and opens it in the
Dynamic Resume web app, pre-filled, so you skip copy-paste. This is the
capture-and-handoff piece only — no autofill of application forms yet
(that's a separate, later piece).

## Load it

1. Make sure the web app is running: `npm run dev` (must be on `localhost:3000`).
2. In Chrome, go to `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked**, and select this `extension/` folder.
5. Pin the extension (puzzle-piece icon in the toolbar → pin) so it's easy to click.

## Use it

1. Open a real job posting in a tab.
2. Click the extension icon.
3. Pick which of your saved resumes to tailor.
4. Click **Grab job description**.
5. **Read what it captured before continuing** — this step matters. The
   detection is best-effort and can grab the wrong section, especially on
   sites it wasn't tested against.
   - If it looks wrong or empty: highlight the job description on the page
     yourself, then click **Use selected text instead**.
6. Click **Open in Dynamic Resume** — a new tab opens with the job description
   already filled in. From there it's the same flow as always: Tailor →
   review the ATS report and suggestions → download.

## Known limitations (by design, not bugs)

- **LinkedIn and similar dynamic/login-gated sites will likely fail to
  auto-capture.** Use the manual-selection fallback there.
- The known-site selectors (Greenhouse-, Lever-style class patterns) are
  best-effort guesses, not verified against live pages. Expect to need
  the manual-selection fallback on postings they don't match yet.
- If `npm run dev` isn't running, the popup will tell you it can't reach
  the app — start the dev server and reopen the popup.
- If you have no resumes imported yet, import one in the web app first.

## Why no build step

Plain HTML/JS, no bundler. The popup is small enough that this stays
simple, and it avoids adding a second toolchain to the project.
