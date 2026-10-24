// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { extractJd } from '../../extension/extract-jd.js'

function docFrom(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html')
}

describe('extractJd', () => {
  it('finds Greenhouse-style job descriptions', () => {
    const doc = docFrom(`
      <html><body>
        <nav>Careers home</nav>
        <div id="header">Acme Careers</div>
        <div id="content">
          <div class="job__description body">
            <p>We are looking for a Senior Engineer to join our team.</p>
            <p>Requirements: 5+ years of experience with TypeScript.</p>
          </div>
        </div>
        <footer>© Acme</footer>
      </body></html>
    `)
    const jd = extractJd(doc)
    expect(jd).toContain('Senior Engineer')
    expect(jd).toContain('TypeScript')
    expect(jd).not.toContain('Careers home')
    expect(jd).not.toContain('© Acme')
  })

  it('finds Lever-style job descriptions', () => {
    const doc = docFrom(`
      <html><body>
        <div class="content">
          <div class="posting-headline"><h2>Staff Engineer</h2></div>
          <div class="section-wrapper">
            <div class="section page-centered">
              <p>Own the platform team's roadmap and mentor engineers.</p>
              <p>You have shipped production systems at scale.</p>
            </div>
          </div>
        </div>
      </body></html>
    `)
    const jd = extractJd(doc)
    expect(jd).toContain('platform team')
    expect(jd).toContain('production systems')
  })

  it('falls back to the largest text block on an unrecognized layout', () => {
    const doc = docFrom(`
      <html><body>
        <header>Site nav with a few words</header>
        <aside>Short sidebar text</aside>
        <main>
          <article>
            <h1>Backend Engineer</h1>
            <p>This role involves designing distributed systems, owning services end to end,
            collaborating with product, and mentoring junior engineers. We value clear writing
            and pragmatic decision making across a large, complex codebase.</p>
          </article>
        </main>
        <footer>Tiny footer</footer>
      </body></html>
    `)
    const jd = extractJd(doc)
    expect(jd).toContain('distributed systems')
    expect(jd.length).toBeGreaterThan(100)
  })

  it('returns an empty string when nothing substantial is found', () => {
    const doc = docFrom(`<html><body><nav>Home</nav><footer>© Co</footer></body></html>`)
    expect(extractJd(doc)).toBe('')
  })

  it('defaults to the global document when called with no argument', () => {
    document.body.innerHTML = `
      <div class="job__description body">
        <p>Global-document fallback works correctly whenever no explicit document is passed in.</p>
      </div>
    `
    expect(extractJd()).toContain('Global-document fallback')
  })
})
