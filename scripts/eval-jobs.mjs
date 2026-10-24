#!/usr/bin/env node
/**
 * Live-link-first quality eval:
 * 1) Fetch JD from each job URL (Ashby meta / HTML capture)
 * 2) Generate tailored resume via local app APIs
 * 3) LLM judges as ATS + recruiter
 *
 * Requires: npm run dev on APP_ORIGIN (default http://localhost:3000)
 * Usage: node scripts/eval-jobs.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { prepareJobPage, extractJobMeta } from '../extension/prepare-job-page.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.env.APP_ORIGIN ?? 'http://localhost:3000'
const JOBS_PATH = process.env.EVAL_JOBS ?? join(ROOT, 'eval/jobs.json')
const OUT_DIR = join(ROOT, 'eval/results')

function decodeHtml(value) {
  return value
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

async function fetchJobPage(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; DynamicResumeEval/0.1)',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  })
  if (!response.ok) throw new Error(`Fetch ${url} failed: ${response.status}`)
  return response.text()
}

async function captureJd(url, fallbackTitle, fallbackCompany) {
  const html = await fetchJobPage(url)
  const doc = new JSDOM(html).window.document
  let jdText = await prepareJobPage(doc)
  const meta = extractJobMeta(doc)

  if (!jdText || jdText.length < 80) {
    const description = doc.querySelector('meta[name="description"]')?.getAttribute('content')
    if (description) jdText = decodeHtml(description).trim()
  }

  if (!jdText || jdText.length < 80) {
    throw new Error(`Could not capture JD from live URL: ${url}`)
  }

  return {
    jdText,
    title: meta.title || fallbackTitle || 'Job',
    company: meta.company || fallbackCompany || undefined,
  }
}

async function runOne(job, provider) {
  console.log(`\n=== ${job.id} ===`)
  console.log('Fetching', job.url)
  const captured = await captureJd(job.url, job.title, job.company)
  console.log(`Captured JD: ${captured.jdText.length} chars | ${captured.company ?? '?'} — ${captured.title}`)

  const createRes = await fetch(`${BASE}/api/applications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jdText: captured.jdText,
      provider,
      job: {
        url: job.url,
        title: captured.title,
        company: captured.company,
      },
      tailoringInstructions: job.tailoringInstructions,
    }),
  })
  const application = await createRes.json()
  if (!createRes.ok) throw new Error(application.error ?? 'create application failed')

  console.log('Generating application', application.id)
  const genRes = await fetch(`${BASE}/api/applications/${application.id}/generate`, { method: 'POST' })
  const generated = await genRes.json()
  if (!genRes.ok || generated.status === 'failed') {
    throw new Error(generated.error ?? 'generation failed')
  }

  const tailored = generated.tailoringResult?.tailoredResume
  const productAts = generated.tailoringResult?.atsReport

  console.log('Judging with LLM (ATS + recruiter)...')
  const judgeRes = await fetch(`${BASE}/api/eval/judge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jdText: captured.jdText,
      resume: tailored,
      provider,
    }),
  })
  const judgment = await judgeRes.json()
  if (!judgeRes.ok) throw new Error(judgment.error ?? 'judge failed')

  const row = {
    id: job.id,
    url: job.url,
    company: captured.company,
    title: captured.title,
    applicationId: application.id,
    productKeywordCoverage: Math.round(productAts?.score ?? 0),
    judge: judgment,
    reviewUrl: `${BASE}/applications/${application.id}`,
  }

  console.log(`Product keyword coverage: ${row.productKeywordCoverage}%`)
  console.log(`Judge ATS: ${judgment.ats.score} (pass=${judgment.ats.pass})`)
  console.log(`Judge recruiter: ${judgment.recruiter.decision} (${judgment.recruiter.score})`)
  console.log(`Overall pass: ${judgment.overallPass}`)
  console.log(`Summary: ${judgment.summary}`)
  return row
}

const jobs = JSON.parse(readFileSync(JOBS_PATH, 'utf8'))
if (!Array.isArray(jobs) || jobs.length === 0) {
  console.error('No jobs in', JOBS_PATH)
  process.exit(1)
}

await fetch(`${BASE}/api/profile/rebuild`, { method: 'POST' }).catch(() => {})
const providers = await fetch(`${BASE}/api/providers`).then(r => r.json())
const provider = providers.default
if (!provider) {
  console.error('No AI provider configured')
  process.exit(1)
}

const results = []
for (const job of jobs) {
  try {
    results.push({ ok: true, ...(await runOne(job, provider)) })
  } catch (error) {
    console.error(`FAIL ${job.id}:`, error.message)
    results.push({ ok: false, id: job.id, url: job.url, error: error.message })
  }
}

mkdirSync(OUT_DIR, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const outPath = join(OUT_DIR, `eval-${stamp}.json`)
writeFileSync(outPath, JSON.stringify({ ranAt: new Date().toISOString(), provider, results }, null, 2))

const passed = results.filter(r => r.ok && r.judge?.overallPass).length
const failed = results.length - passed
console.log('\n=== EVAL SUMMARY ===')
console.log(`Jobs: ${results.length} | overall pass: ${passed} | fail: ${failed}`)
console.log('Wrote', outPath)

process.exit(failed === 0 ? 0 : 1)
