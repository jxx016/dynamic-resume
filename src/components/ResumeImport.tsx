'use client'
import React, { useState } from 'react'
import { ProviderPicker } from './ProviderPicker'

// FileReader rather than file.arrayBuffer(): universally supported, and it
// keeps this path exercisable under jsdom, which does not implement arrayBuffer.
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read that file'))
    reader.onload = () => {
      // readAsDataURL yields "data:<mime>;base64,<payload>"
      const result = String(reader.result)
      const comma = result.indexOf(',')
      if (comma < 0) reject(new Error('Could not read that file'))
      else resolve(result.slice(comma + 1))
    }
    reader.readAsDataURL(file)
  })
}

export function ResumeImport({ onImported }: { onImported: (id: string) => void }) {
  const [label, setLabel] = useState('')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [provider, setProvider] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canImport = file !== null || text.trim().length > 0

  async function handleImport() {
    setBusy(true)
    setError(null)
    try {
      const payload = file
        ? {
            kind: file.name.toLowerCase().endsWith('.docx') ? 'docx' : 'pdf',
            label: label || file.name.replace(/\.[^.]+$/, ''),
            contentBase64: await fileToBase64(file),
            provider,
          }
        : { kind: 'text', label: label || 'Imported', text, provider }

      const res = await fetch('/api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Import failed')
      onImported(data.id)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel">
      <ProviderPicker value={provider} onChange={setProvider} disabled={busy} />

      <div className="field">
        <label htmlFor="import-label">Label</label>
        <input
          id="import-label"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="PM roles"
        />
      </div>

      <div className="field">
        <label htmlFor="import-file">Upload a PDF or DOCX</label>
        <input
          id="import-file"
          type="file"
          accept=".pdf,.docx"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="field">
        <label htmlFor="import-text">Or paste your resume text</label>
        <textarea
          id="import-text"
          value={text}
          onChange={e => setText(e.target.value)}
          rows={7}
          placeholder="Jo Candidate&#10;jo@example.com"
        />
      </div>

      {error && <p className="error">{error}</p>}

      <button disabled={busy || !canImport} onClick={handleImport}>
        {busy ? 'Importing…' : 'Import resume'}
      </button>
    </section>
  )
}
