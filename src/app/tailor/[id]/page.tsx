'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { JdInput } from '@/components/JdInput'
import { AtsReport } from '@/components/AtsReport'
import { SuggestionReview } from '@/components/SuggestionReview'
import { ProviderPicker } from '@/components/ProviderPicker'
import type { TailoringResult } from '@/lib/schema/tailoring'
import type { Resume } from '@/lib/schema/resume'

export default function TailorPage() {
  const params = useParams<{ id: string }>()
  const baseResumeId = params.id
  const [result, setResult] = useState<TailoringResult | null>(null)
  const [finalResume, setFinalResume] = useState<Resume | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [provider, setProvider] = useState<string | null>(null)

  async function handleTailor(jdText: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseResumeId, jdText, provider }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to tailor resume')
      setResult(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm(decisions: { index: number; accept: boolean }[]) {
    if (!result) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tailor/${baseResumeId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result, decisions }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to finalize resume')
      setFinalResume(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload() {
    if (!finalResume) return
    const res = await fetch(`/api/render/${finalResume.id}`, { method: 'POST' })
    if (!res.ok) {
      setError('Failed to render PDF')
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${finalResume.basics.name.replace(/\s+/g, '_') || 'resume'}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="page">
      <header className="masthead">
        <h1>Tailor resume</h1>
        <span className="tagline"><Link href="/">Back to library</Link></span>
      </header>

      {error && <p className="error">{error}</p>}

      {!finalResume && (
        <>
          <section className="section">
            <ProviderPicker value={provider} onChange={setProvider} disabled={loading} />
            <JdInput onSubmit={handleTailor} disabled={loading} />
            {loading && <p className="muted" style={{ marginTop: '0.75rem' }}>Working…</p>}
          </section>

          {result && (
            <section className="section">
              <AtsReport report={result.atsReport} />
              <SuggestionReview suggestions={result.suggestions} onConfirm={handleConfirm} />
            </section>
          )}
        </>
      )}

      {finalResume && (
        <section className="section">
          <div className="panel">
            <h2>Your tailored resume is ready</h2>
            <p className="section-hint">Saved as {finalResume.id}.</p>
            <button onClick={handleDownload}>Download PDF</button>
          </div>
          <p className="muted" style={{ marginTop: '1rem' }}>
            <Link href="/">Back to library</Link>
          </p>
        </section>
      )}
    </main>
  )
}
