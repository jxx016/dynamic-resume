// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { prepareJobPage } from '../../extension/prepare-job-page.js'

function docFrom(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html')
}

describe('prepareJobPage', () => {
  it('opens Qualifications and captures it without unrelated collapsed sections', async () => {
    const doc = docFrom(`
      <main>
        <h1>Solution Architect</h1>
        <h2>Job Description</h2>
        <p>Design end-to-end technology solutions for clients and lead architecture workshops.</p>
        <button id="qualifications" aria-expanded="false">Qualification</button>
        <section id="qualification-content" hidden>
          <p>Three years of solution architecture experience with AWS, Azure, or GCP.</p>
        </section>
        <button id="locations" aria-expanded="false">Locations</button>
        <section id="location-content" hidden><p>Singapore</p></section>
        <h2>Additional Information</h2>
        <p>Equal employment opportunity statement.</p>
      </main>
    `)
    doc.getElementById('qualifications')?.addEventListener('click', () => {
      doc.getElementById('qualifications')?.setAttribute('aria-expanded', 'true')
      doc.getElementById('qualification-content')?.removeAttribute('hidden')
    })

    const text = await prepareJobPage(doc)

    expect(text).toContain('Design end-to-end technology solutions')
    expect(text).toContain('AWS, Azure, or GCP')
    expect(text).not.toContain('Singapore')
    expect(text).not.toContain('Equal employment opportunity')
  })

  it('recognizes generic role and requirement disclosures, not one company layout', async () => {
    const doc = docFrom(`
      <main>
        <h1>Platform Engineer</h1>
        <h2>About the role</h2>
        <p>Own reliable services and collaborate with product teams on infrastructure decisions.</p>
        <div role="button" id="requirements" aria-expanded="false">What you&apos;ll need</div>
        <section id="requirements-content" hidden><p>Experience with Kubernetes, observability, and distributed systems.</p></section>
        <h2>Benefits</h2><p>Medical coverage and paid time off.</p>
      </main>
    `)
    doc.getElementById('requirements')?.addEventListener('click', () => {
      doc.getElementById('requirements')?.setAttribute('aria-expanded', 'true')
      doc.getElementById('requirements-content')?.removeAttribute('hidden')
    })

    const text = await prepareJobPage(doc)

    expect(text).toContain('Own reliable services')
    expect(text).toContain('Kubernetes, observability, and distributed systems')
    expect(text).not.toContain('Medical coverage')
  })
})

describe('extractJobMeta', () => {
  it('reads the role title and company from a generic job page', async () => {
    const { extractJobMeta } = await import('../../extension/prepare-job-page.js')
    const doc = docFrom(`
      <main>
        <header><p>Demo Corp · Careers</p><h1>Forward Deployed Engineer</h1></header>
      </main>
    `)

    expect(extractJobMeta(doc)).toEqual({
      title: 'Forward Deployed Engineer',
      company: 'Demo Corp',
    })
  })
})
