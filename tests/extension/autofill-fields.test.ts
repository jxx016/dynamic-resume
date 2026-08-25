// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { autofillFields } from '../../extension/autofill-fields.js'

function docFrom(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html')
}

const basics = { name: 'Jo Candidate', email: 'jo@example.com', phone: '555-0100', location: 'Seattle, WA' }

describe('autofillFields', () => {
  it('fills fields matched by standard autocomplete tokens', () => {
    const doc = docFrom(`
      <form>
        <input autocomplete="name">
        <input autocomplete="email">
        <input autocomplete="tel">
        <input autocomplete="address-level2">
      </form>
    `)
    const result = autofillFields(basics, doc)
    expect(result).toEqual({ name: true, email: true, phone: true, location: true })
    expect((doc.querySelector('[autocomplete="name"]') as HTMLInputElement).value).toBe('Jo Candidate')
    expect((doc.querySelector('[autocomplete="email"]') as HTMLInputElement).value).toBe('jo@example.com')
    expect((doc.querySelector('[autocomplete="tel"]') as HTMLInputElement).value).toBe('555-0100')
    expect((doc.querySelector('[autocomplete="address-level2"]') as HTMLInputElement).value).toBe('Seattle, WA')
  })

  it('fills fields matched by common name/id/type patterns as a fallback', () => {
    const doc = docFrom(`
      <form>
        <input name="full_name">
        <input type="email">
        <input id="Phone">
      </form>
    `)
    const result = autofillFields(basics, doc)
    expect(result.name).toBe(true)
    expect(result.email).toBe(true)
    expect(result.phone).toBe(true)
    expect((doc.querySelector('[name="full_name"]') as HTMLInputElement).value).toBe('Jo Candidate')
  })

  it('reports false for fields it cannot find, without throwing', () => {
    const doc = docFrom('<form><input name="favorite-color"></form>')
    const result = autofillFields(basics, doc)
    expect(result).toEqual({ name: false, email: false, phone: false, location: false })
  })

  it('never fills a field with an empty basics value', () => {
    const doc = docFrom('<form><input autocomplete="tel"></form>')
    const result = autofillFields({ ...basics, phone: '' }, doc)
    expect(result.phone).toBe(false)
    expect((doc.querySelector('[autocomplete="tel"]') as HTMLInputElement).value).toBe('')
  })

  it('does not confuse a company-name field with the person-name field', () => {
    const doc = docFrom(`
      <form>
        <input name="company_name">
        <input autocomplete="name">
      </form>
    `)
    autofillFields(basics, doc)
    expect((doc.querySelector('[name="company_name"]') as HTMLInputElement).value).toBe('')
    expect((doc.querySelector('[autocomplete="name"]') as HTMLInputElement).value).toBe('Jo Candidate')
  })

  it('returns all-false when basics is missing, without throwing', () => {
    const doc = docFrom('<form><input autocomplete="email"></form>')
    expect(autofillFields(undefined, doc)).toEqual({ name: false, email: false, phone: false, location: false })
  })
})
