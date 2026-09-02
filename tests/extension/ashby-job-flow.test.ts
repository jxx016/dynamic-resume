// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { prepareJobPage, extractJobMeta } from '../../extension/prepare-job-page.js'

describe('Ashby job board capture', () => {
  it('captures the LangChain posting from meta tags when the SPA shell is empty', async () => {
    const html = readFileSync(join(process.cwd(), 'tests/fixtures/ashby-langchain-job.html'), 'utf8')
    const doc = new DOMParser().parseFromString(html, 'text/html')

    const jd = await prepareJobPage(doc)
    const meta = extractJobMeta(doc)

    expect(meta.title).toBe('Solutions Engineer (Texas)')
    expect(meta.company).toBe('LangChain')
    expect(jd).toContain('WHAT YOU')
    expect(jd).toContain('LangChain')
    expect(jd.length).toBeGreaterThan(1000)
  })
})
