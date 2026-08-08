'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { ProviderPicker } from '@/components/ProviderPicker'
import type { Resume } from '@/lib/schema/resume'

type Turn = { role: 'user' | 'assistant'; text: string }

export default function BuildPage() {
  const [history, setHistory] = useState<Turn[]>([])
  const [draft, setDraft] = useState<Resume | null>(null)
  const [input, setInput] = useState('')
  const [label, setLabel] = useState('My Resume')
  const [provider, setProvider] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)

  async function sendMessage() {
    if (!input.trim()) return
    const nextHistory = [...history, { role: 'user' as const, text: input }]
    setHistory(nextHistory)
    setInput('')
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/builder/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: nextHistory, draft, provider }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Builder request failed')
      setHistory(h => [...h, { role: 'assistant', text: data.message }])
      setDraft(data.draft)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function saveAsBaseResume() {
    if (!draft) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'resume', label, resume: draft }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save resume')
      setSavedId(data.id)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page">
      <header className="masthead">
        <h1>Build a resume</h1>
        <span className="tagline"><Link href="/">Back to library</Link></span>
      </header>

      {error && <p className="error">{error}</p>}

      <section className="section">
        <ProviderPicker value={provider} onChange={setProvider} disabled={loading} />

        {history.length > 0 && (
          <div className="stack" style={{ marginBottom: '1rem' }}>
            {history.map((turn, i) => (
              <div key={i} className={turn.role === 'user' ? 'sunken' : 'panel'}>
                <div className="muted" style={{ marginBottom: '0.25rem' }}>
                  {turn.role === 'user' ? 'You' : 'Assistant'}
                </div>
                <div>{turn.text}</div>
              </div>
            ))}
          </div>
        )}

        <div className="panel">
          <div className="field">
            <label htmlFor="builder-input">Tell the assistant about your experience</label>
            <textarea
              id="builder-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="I was a product manager at Acme for three years…"
              rows={4}
            />
          </div>
          <button disabled={loading || !input.trim()} onClick={sendMessage}>
            {loading ? 'Thinking…' : 'Send'}
          </button>
        </div>
      </section>

      {draft && (
        <section className="section">
          <h2>Current draft</h2>
          <p className="section-hint">Saved as a base resume you can tailor to any job.</p>
          <div className="panel">
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem', maxHeight: 320, overflow: 'auto' }}>
              {JSON.stringify(draft, null, 2)}
            </pre>
            <hr className="divider" />
            <div className="field">
              <label htmlFor="builder-label">Label</label>
              <input
                id="builder-label"
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="PM roles"
              />
            </div>
            <button disabled={loading} onClick={saveAsBaseResume}>Save as base resume</button>
          </div>
        </section>
      )}

      {savedId && (
        <p className="muted">
          Saved. <Link href={`/tailor/${savedId}`}>Tailor this resume</Link>
        </p>
      )}
    </main>
  )
}
