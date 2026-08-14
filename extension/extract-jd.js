// Self-contained on purpose: chrome.scripting.executeScript({ func: extractJd })
// injects this exact function into the job page's isolated world and re-runs
// its source there, so it cannot close over anything from popup.js — only its
// own parameter and the target page's globals (like `document`) are available.
// The `doc` parameter exists purely so this stays unit-testable outside a
// browser; the extension itself always calls extractJd() with no argument.
//
// The selector list below is a best-effort set of patterns for common ATS
// platforms (Greenhouse, Lever, and generic "job-description"-ish attributes),
// not verified against live job pages. Expect to refine it after trying real
// postings — that's exactly why the popup shows the captured text for you to
// confirm or fix before handing it to the tailoring flow, rather than
// submitting it blind.
export function extractJd(doc) {
  const root = doc || (typeof document !== 'undefined' ? document : null)
  if (!root) return ''

  const MIN_LENGTH = 60
  const KNOWN_SELECTORS = [
    '.job__description', // Greenhouse
    '.section-wrapper', // Lever
    '[class*="job-description" i]',
    '[class*="jobdescription" i]',
    '[id*="job-description" i]',
    '[id*="jobdescription" i]',
    '[data-qa*="job-description" i]',
    '[data-testid*="job-description" i]',
    '[class*="posting-description" i]',
  ]

  function cleanText(raw) {
    return raw.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  }

  for (const selector of KNOWN_SELECTORS) {
    let el = null
    try { el = root.querySelector(selector) } catch { el = null }
    if (el) {
      const text = cleanText(el.textContent || '')
      if (text.length >= MIN_LENGTH) return text
    }
  }

  // Fallback: the largest text block outside obvious chrome (nav/header/footer/aside).
  const EXCLUDE_TAGS = new Set(['NAV', 'HEADER', 'FOOTER', 'ASIDE', 'SCRIPT', 'STYLE', 'NOSCRIPT'])
  function hasExcludedAncestor(el) {
    let node = el.parentElement
    while (node) {
      if (EXCLUDE_TAGS.has(node.tagName)) return true
      node = node.parentElement
    }
    return false
  }

  let best = ''
  for (const el of root.querySelectorAll('main, article, section, div')) {
    if (EXCLUDE_TAGS.has(el.tagName) || hasExcludedAncestor(el)) continue
    const text = cleanText(el.textContent || '')
    if (text.length > best.length) best = text
  }

  return best.length >= MIN_LENGTH ? best : ''
}
