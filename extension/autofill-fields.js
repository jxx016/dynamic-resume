// Self-contained on purpose, same reason as extractJd: chrome.scripting
// executeScript({ func: autofillFields, args: [basics] }) re-executes this
// exact function's source in the target page's isolated world, so it can't
// close over anything from popup.js — only its own parameters and the page's
// own globals. `doc` exists purely for unit testing; the extension always
// calls this with just `basics`.
//
// Field matching is best-effort, deterministic pattern matching (standard
// `autocomplete` tokens first, then common name/id/type conventions) — not
// verified against every real application form. Never fills a field it
// can't identify; only ever sets values sourced from the user's own resume,
// never invents data.
export function autofillFields(basics, doc) {
  const root = doc || (typeof document !== 'undefined' ? document : null)
  const empty = { name: false, email: false, phone: false, location: false }
  if (!root || !basics) return empty

  function setValue(el, value) {
    if (!el || !value) return false
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
    if (setter) setter.call(el, value)
    else el.value = value
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  }

  function findField(selectors) {
    for (const selector of selectors) {
      let el = null
      try { el = root.querySelector(selector) } catch { el = null }
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return el
    }
    return null
  }

  const FIELD_SELECTORS = {
    name: [
      'input[autocomplete="name"]',
      'input[name="name" i]',
      'input[id="name" i]',
      'input[name*="full" i][name*="name" i]',
      'input[placeholder*="full name" i]',
    ],
    email: [
      'input[autocomplete="email"]',
      'input[type="email"]',
      'input[name="email" i]',
      'input[id="email" i]',
    ],
    phone: [
      'input[autocomplete="tel"]',
      'input[type="tel"]',
      'input[name="phone" i]',
      'input[id="phone" i]',
      'input[name*="phone" i]',
    ],
    location: [
      'input[autocomplete="address-level2"]',
      'input[name="location" i]',
      'input[id="location" i]',
      'input[name*="city" i]',
      'input[placeholder*="location" i]',
    ],
  }

  return {
    name: setValue(findField(FIELD_SELECTORS.name), basics.name),
    email: setValue(findField(FIELD_SELECTORS.email), basics.email),
    phone: setValue(findField(FIELD_SELECTORS.phone), basics.phone),
    location: setValue(findField(FIELD_SELECTORS.location), basics.location),
  }
}
