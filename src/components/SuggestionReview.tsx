'use client'
import React, { useState } from 'react'

type S = { text: string; rationale: string; status: string }

export function SuggestionReview(
  { suggestions, onConfirm }: { suggestions: S[]; onConfirm: (d: { index: number; accept: boolean }[]) => void },
) {
  const [accepted, setAccepted] = useState<Record<number, boolean>>({})

  return (
    <section className="panel">
      <h3>Suggested additions</h3>
      <p className="section-hint">
        These aren&apos;t on your resume yet. Accept only what&apos;s true of you.
      </p>

      <div className="stack">
        {suggestions.map((s, i) => (
          <div key={i} className="sunken">
            <div style={{ fontWeight: 500 }}>{s.text}</div>
            <div className="card-meta" style={{ marginBottom: '0.6rem' }}>{s.rationale}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                className={accepted[i] === true ? undefined : 'secondary'}
                onClick={() => setAccepted(a => ({ ...a, [i]: true }))}
              >
                Accept
              </button>
              <button
                className={accepted[i] === false ? undefined : 'secondary'}
                onClick={() => setAccepted(a => ({ ...a, [i]: false }))}
              >
                Reject
              </button>
              <span className="muted">
                {accepted[i] === true ? 'will be added' : accepted[i] === false ? 'skipped' : ''}
              </span>
            </div>
          </div>
        ))}
      </div>

      <hr className="divider" />
      <button onClick={() => onConfirm(
        suggestions.map((_, i) => ({ index: i, accept: accepted[i] === true })).filter(d => d.accept),
      )}>Finalize</button>
    </section>
  )
}
