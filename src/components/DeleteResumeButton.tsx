'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export function DeleteResumeButton({ resumeId }: { resumeId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!window.confirm('Delete this resume? This cannot be undone.')) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/resumes/${resumeId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete resume')
      router.push('/')
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <div>
      {error && <p className="error">{error}</p>}
      <button className="secondary" disabled={busy} onClick={handleDelete}>
        {busy ? 'Deleting…' : 'Delete resume'}
      </button>
    </div>
  )
}
