'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AtsReport } from '@/components/AtsReport'
import { SuggestionReview } from '@/components/SuggestionReview'
import type { Application } from '@/lib/schema/application'
import type { Resume } from '@/lib/schema/resume'

export function ApplicationReview({ applicationId }: { applicationId: string }) {
  const [application, setApplication] = useState<Application | null>(null)
  const [finalResume, setFinalResume] = useState<Resume | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(true)

  const fetchApplication = useCallback(async () => {
    const response = await fetch(`/api/applications/${applicationId}`)
    const data = await response.json()
    if (!response.ok) throw new Error(data.error ?? 'Could not load application')
    return data as Application
  }, [applicationId])

  const generate = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/applications/${applicationId}/generate`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Could not generate resume')
      setApplication(data)
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setBusy(false)
    }
  }, [applicationId])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const loaded = await fetchApplication()
        if (cancelled) return
        setApplication(loaded)
        if (loaded.status === 'draft') await generate()
        else {
          if (loaded.status === 'failed') setError(loaded.error ?? 'Generation failed')
          setBusy(false)
        }
      } catch (reason) {
        if (!cancelled) {
          setError((reason as Error).message)
          setBusy(false)
        }
      }
    }
    void load()
    return () => { cancelled = true }
  }, [applicationId, fetchApplication, generate])

  async function confirm(decisions: { index: number; accept: boolean }[]) {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/applications/${applicationId}/confirm`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisions }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Could not finalize resume')
      setFinalResume(data)
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function download() {
    if (!finalResume) return
    const response = await fetch(`/api/render/${finalResume.id}`, { method: 'POST' })
    if (!response.ok) { setError('Could not render PDF'); return }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${finalResume.basics.name.replace(/\s+/g, '_') || 'resume'}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (finalResume) {
    return <section className="section"><div className="panel"><h2>Enhanced resume ready</h2><p className="section-hint">Saved for this application.</p><button onClick={download}>Download PDF</button></div></section>
  }

  return (
    <>
      {application && <section className="section"><h2>{application.job.title}</h2><p className="section-hint">Generated from your saved base resume for this specific job application.</p>{application.tailoringInstructions && <div className="sunken"><strong>Tailoring preference</strong><p className="section-hint">{application.tailoringInstructions}</p></div>}</section>}
      {error && <section className="section"><p className="error">{error}</p><button onClick={generate}>Try generation again</button></section>}
      {busy && <section className="section"><div className="panel"><h2>Generating enhanced resume…</h2><p className="section-hint">Matching your verified experience to this job description. This usually takes around 30 seconds.</p></div></section>}
      {!busy && application?.status === 'ready' && application.tailoringResult && (
        <section className="section"><AtsReport report={application.tailoringResult.atsReport} /><SuggestionReview suggestions={application.tailoringResult.suggestions} onConfirm={confirm} /></section>
      )}
      <p className="muted"><Link href="/">Back to library</Link></p>
    </>
  )
}
