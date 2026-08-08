'use client'
import React, { useEffect, useState } from 'react'

const LABELS: Record<string, string> = { gemini: 'Gemini', openai: 'OpenAI' }

export function ProviderPicker(
  { value, onChange, disabled }: {
    value: string | null
    onChange: (provider: string) => void
    disabled?: boolean
  },
) {
  const [configured, setConfigured] = useState<string[] | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/providers')
      .then(r => {
        if (!r.ok) throw new Error(`providers request failed: ${r.status}`)
        return r.json()
      })
      .then((data: { configured?: unknown; default?: string | null }) => {
        if (cancelled) return
        if (!Array.isArray(data.configured)) throw new Error('malformed providers response')
        setConfigured(data.configured as string[])
        if (data.default) onChange(data.default)
      })
      .catch(() => {
        if (!cancelled) { setLoadError(true); setConfigured([]) }
      })
    return () => { cancelled = true }
    // Runs once on mount; onChange is intentionally not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (configured === null) return <p className="muted">Loading providers…</p>
  if (loadError) return <p className="error">Couldn&apos;t load AI providers.</p>
  if (configured.length === 0) {
    return <p className="error">No AI provider configured — set GEMINI_API_KEY or OPENAI_API_KEY.</p>
  }

  return (
    <div className="field">
      <label htmlFor="provider-picker">AI provider</label>
      <select
        id="provider-picker"
        value={value ?? configured[0]}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
      >
        {configured.map(p => <option key={p} value={p}>{LABELS[p] ?? p}</option>)}
      </select>
    </div>
  )
}
