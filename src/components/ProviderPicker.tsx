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

  useEffect(() => {
    let cancelled = false
    fetch('/api/providers')
      .then(r => r.json())
      .then((data: { configured: string[]; default: string | null }) => {
        if (cancelled) return
        setConfigured(data.configured)
        if (data.default) onChange(data.default)
      })
      .catch(() => { if (!cancelled) setConfigured([]) })
    return () => { cancelled = true }
    // Runs once on mount; onChange is intentionally not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (configured === null) return <p>Loading providers…</p>
  if (configured.length === 0) {
    return <p style={{ color: 'red' }}>No AI provider configured — set GEMINI_API_KEY or OPENAI_API_KEY.</p>
  }

  return (
    <label style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
      AI provider:
      <select
        value={value ?? configured[0]}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
      >
        {configured.map(p => <option key={p} value={p}>{LABELS[p] ?? p}</option>)}
      </select>
    </label>
  )
}
