'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import type { Resume } from '@/lib/schema/resume'

type Turn = { role: 'user' | 'assistant'; text: string }

export default function BuildPage() {
  const [history, setHistory] = useState<Turn[]>([])
  const [draft, setDraft] = useState<Resume | null>(null)
  const [input, setInput] = useState('')
  const [label, setLabel] = useState('My Resume')
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
        body: JSON.stringify({ history: nextHistory, draft }),
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
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem' }}>
      <h1>Build a resume</h1>
      <p><Link href="/">Back to library</Link></p>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        {history.map((turn, i) => (
          <div key={i}><strong>{turn.role}:</strong> {turn.text}</div>
        ))}
      </div>

      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Tell the assistant about your experience"
        rows={4}
        style={{ width: '100%' }}
      />
      <button disabled={loading || !input.trim()} onClick={sendMessage}>Send</button>

      {draft && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Current draft</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(draft, null, 2)}</pre>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label for this resume" />
          <button disabled={loading} onClick={saveAsBaseResume}>Save as base resume</button>
        </div>
      )}

      {savedId && (
        <p>
          Saved. <Link href={`/tailor/${savedId}`}>Tailor this resume</Link>
        </p>
      )}
    </main>
  )
}
