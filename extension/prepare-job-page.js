// Self-contained for chrome.scripting.executeScript: nested helpers are
// intentional because Chrome serializes only this exported function.
export async function prepareJobPage(doc) {
  const root = doc || (typeof document !== 'undefined' ? document : null)
  if (!root) return ''

  const textOf = (element) => (element?.innerText || element?.textContent || '').replace(/\s+/g, ' ').trim()
  const disclosurePattern = /qualification|requirements?|responsibilit(?:y|ies)|what (?:you(?:'ll| will) do|you(?:'ll| will) need|we(?:'re| are) looking for)|skills?|experience/i
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
    if (/job description|about the role|role overview|the opportunity|qualification|requirements?|responsibilit(?:y|ies)|what (?:you(?:'ll| will) do|you(?:'ll| will) need|we(?:'re| are) looking for)/i.test(text)) started = true
    if (started && !parts.includes(text)) parts.push(text)
  }

  const captured = parts.join('\n')
  if (captured.length >= 60) return captured

  // Ashby, Greenhouse SPAs, and similar boards often ship an empty shell with
  // the full posting in meta tags until JavaScript renders the page.
  const meta = root.querySelector('meta[name="description"]')?.getAttribute('content')
  if (meta) {
    const decoded = meta
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim()
    if (decoded.length >= 60) return decoded
  }

  // Conservative fallback for job boards without semantic headings.
  let best = ''
  for (const element of contentRoot.querySelectorAll('section, div, article')) {
    if (element.closest('script, style, noscript')) continue
    const text = textOf(element)
    if (/@keyframes|overflow:\s*hidden|enable JavaScript/i.test(text)) continue
    if (text.length > best.length) best = text
  }
  if (best.length >= 60) return best

  return ''
}

export function extractJobMeta(doc) {
  const root = doc || (typeof document !== 'undefined' ? document : null)
  if (!root) return { title: '', company: '' }

  const textOf = (element) => (element?.innerText || element?.textContent || '').replace(/\s+/g, ' ').trim()
  const main = root.querySelector('main, article, [role="main"]') || root.body || root
  let title = textOf(main.querySelector('h1'))
  let company = ''

  for (const candidate of main.querySelectorAll('header p, p, [class*="company" i], [data-company]')) {
    const text = textOf(candidate)
    const match = text.match(/^(.+?)\s*[·|]\s/)
    if (match && match[1].length <= 80) {
      company = match[1].trim()
      break
    }
  }

  const pageTitle = root.title || (typeof document !== 'undefined' ? document.title : '')
  if (pageTitle.includes(' @ ')) {
    const [titlePart, companyPart] = pageTitle.split(' @ ')
    if (!title) title = titlePart.trim()
    if (!company) company = companyPart.trim()
  } else if ((!title || !company) && pageTitle) {
    const parts = pageTitle.split(/\s*[|–—-]\s*/)
    if (!title && parts[0]) title = parts[0].trim()
    if (!company && parts[1]) company = parts[1].trim()
  }

  const ogSite = root.querySelector('meta[property="og:site_name"]')?.getAttribute('content')
  if (!company && ogSite) company = ogSite.trim()

  return { title, company }
}
