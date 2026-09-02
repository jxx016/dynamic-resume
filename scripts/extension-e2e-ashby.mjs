#!/usr/bin/env node
/**
 * Simulates the browser extension popup flow against a saved Ashby HTML fixture,
 * then creates and generates an application through the local API.
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { prepareJobPage, extractJobMeta } from '../extension/prepare-job-page.js'

const BASE = process.env.APP_ORIGIN ?? 'http://localhost:3000'
const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), '../tests/fixtures/ashby-langchain-job.html')
const JOB_URL = 'https://jobs.ashbyhq.com/langchain/df7a4d66-2159-4dff-b5ff-92f6e835f242/application?utm_source=vxReVqRy6V'

const html = readFileSync(FIXTURE, 'utf8')
const doc = new JSDOM(html).window.document

const jdText = await prepareJobPage(doc)
const meta = extractJobMeta(doc)

console.log('=== Extension capture simulation ===')
console.log('Company:', meta.company)
console.log('Title:', meta.title)
console.log('JD captured:', jdText.length, 'chars')
console.log('Contains LangChain:', jdText.includes('LangChain'))
console.log('Contains WHAT YOU\'LL DO:', /WHAT YOU/i.test(jdText))

if (!jdText || jdText.length < 500) {
  console.error('FAIL: plugin would not capture enough JD text')
  process.exit(1)
}

const tailoringInstructions =
  'Curate this as a Solutions Engineer resume: emphasize customer-facing technical wins, POCs, demos, workshops, production agent deployments, and LangChain/LangGraph experience. Only truthful edits.'

await fetch(`${BASE}/api/profile/rebuild`, { method: 'POST' })
const providers = await fetch(`${BASE}/api/providers`).then(r => r.json())
const provider = providers.default ?? 'gemini'

const createRes = await fetch(`${BASE}/api/applications`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jdText,
    provider,
    job: { url: JOB_URL, title: meta.title, company: meta.company },
    tailoringInstructions,
  }),
})
const application = await createRes.json()
if (!createRes.ok) throw new Error(application.error ?? 'create failed')

console.log('\n=== Application created ===')
console.log('ID:', application.id)

console.log('Generating tailored Solutions Engineer resume...')
const genRes = await fetch(`${BASE}/api/applications/${application.id}/generate`, { method: 'POST' })
const result = await genRes.json()
if (!genRes.ok || result.status === 'failed') {
  console.error('Generation failed:', result.error ?? result)
  process.exit(1)
}

const ats = result.tailoringResult?.atsReport ?? {}
const score = Math.round(ats.score ?? 0)
const ready = score >= 70

console.log('\n=== Results ===')
console.log('Keyword coverage:', score + '%')
console.log('Ready to download:', ready ? 'YES' : 'NO')
console.log('Matched:', ats.matched?.length ?? 0)
console.log('Missing:', ats.missing?.length ?? 0)
console.log('Suggestions:', result.tailoringResult?.suggestions?.length ?? 0)
console.log('Review:', `${BASE}/applications/${application.id}`)
console.log('\nSummary preview:')
console.log(result.tailoringResult?.tailoredResume?.summary?.slice(0, 350) + '...')

process.exit(ready ? 0 : 2)
