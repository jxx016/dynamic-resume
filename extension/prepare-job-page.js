// Self-contained for chrome.scripting.executeScript: nested helpers are
// intentional because Chrome serializes only this exported function.
export async function prepareJobPage(doc) {
  const root = doc || (typeof document !== 'undefined' ? document : null)
  if (!root) return ''

  const textOf = (element) => (element?.innerText || element?.textContent || '').replace(/\s+/g, ' ').trim()
  const disclosurePattern = /qualification|requirements?|responsibilit(?:y|ies)|what (?:you(?:'ll| will) do|we(?:'re| are) looking for)|skills?/i
  const stopPattern = /^(?:locations?|additional information|equal (?:opportunity|employment)|about accenture|legal|privacy|benefits?)$/i

  // Expand only job-content disclosures. Never open location, legal, or benefit
  // accordions, because those add noise to ATS keyword matching.
  for (const control of root.querySelectorAll('button, [role="button"], summary')) {
    const label = textOf(control)
    const expanded = control.getAttribute('aria-expanded')
    if (disclosurePattern.test(label) && expanded !== 'true') control.click()
  }

  // A live job page needs a render turn after a click; tests with an explicit
  // document skip the delay but still exercise the exact expansion behavior.
  if (doc === undefined && typeof document !== 'undefined') {
    await new Promise((resolve) => setTimeout(resolve, 350))
  } else {
    await Promise.resolve()
  }

  const contentRoot = root.querySelector('main, article, [role="main"]') || root.body || root
  const parts = []
  let started = false
  for (const element of contentRoot.querySelectorAll('h1, h2, h3, h4, button, [role="button"], p, li')) {
    const text = textOf(element)
    if (!text) continue
    if (stopPattern.test(text)) break
    if (/job description|qualification|requirements?|responsibilit(?:y|ies)|what (?:you(?:'ll| will) do|we(?:'re| are) looking for)/i.test(text)) started = true
    if (started && !parts.includes(text)) parts.push(text)
  }

  const captured = parts.join('\n')
  if (captured.length >= 60) return captured

  // Conservative fallback for job boards without semantic headings.
  let best = ''
  for (const element of contentRoot.querySelectorAll('section, div, article')) {
    const text = textOf(element)
    if (text.length > best.length) best = text
  }
  return best.length >= 60 ? best : ''
}
