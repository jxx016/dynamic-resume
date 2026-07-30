'use client'
import React, { useState } from 'react'

type S = { text: string; rationale: string; status: string }

export function SuggestionReview(
  { suggestions, onConfirm }: { suggestions: S[]; onConfirm: (d: { index: number; accept: boolean }[]) => void },
) {
  const [accepted, setAccepted] = useState<Record<number, boolean>>({})
  return (
    <div>
      {suggestions.map((s, i) => (
        <div key={i}>
          <strong>{s.text}</strong> — {s.rationale}
          <button onClick={() => setAccepted(a => ({ ...a, [i]: true }))}>Accept</button>
          <button onClick={() => setAccepted(a => ({ ...a, [i]: false }))}>Reject</button>
          <span>{accepted[i] === true ? ' ✓' : accepted[i] === false ? ' ✗' : ''}</span>
        </div>
      ))}
      <button onClick={() => onConfirm(
        suggestions.map((_, i) => ({ index: i, accept: accepted[i] === true })).filter(d => d.accept),
      )}>Finalize</button>
    </div>
  )
}
