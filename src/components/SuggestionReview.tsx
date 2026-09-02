'use client'
import React, { useState } from 'react'

type S = { text: string; rationale: string; status: string }

const INITIAL_VISIBLE = 2

export function SuggestionReview(
  { suggestions, onConfirm }: { suggestions: S[]; onConfirm: (d: { index: number; accept: boolean }[]) => void },
) {
  const [accepted, setAccepted] = useState<Record<number, boolean>>({})
  const [expanded, setExpanded] = useState(false)

  if (suggestions.length === 0) {
    return (
      <section className="panel">
        <h3>Suggested additions</h3>
        <p className="section-hint">No gaps flagged — your verified experience already covers the main requirements.</p>
        <hr className="divider" />
        <button onClick={() => onConfirm([])}>Finalize resume</button>
      </section>
    )
  }

  const canCollapse = suggestions.length > INITIAL_VISIBLE
  const displayed = expanded || !canCollapse
    ? suggestions.map((suggestion, index) => ({ suggestion, index }))
    : suggestions.slice(0, INITIAL_VISIBLE).map((suggestion, index) => ({ suggestion, index }))
  const hiddenCount = suggestions.length - INITIAL_VISIBLE

  return (
    <section className="panel">
      <h3>Suggested additions ({suggestions.length})</h3>
      <p className="section-hint">
        Top gaps only — accept only what&apos;s true of you. Everything else stays off the resume.
      </p>

      <div className="stack">
        {displayed.map(({ suggestion, index }) => (
          <div key={index} className="sunken">
            <div style={{ fontWeight: 500 }}>{suggestion.text}</div>
            <div className="card-meta" style={{ marginBottom: '0.6rem' }}>{suggestion.rationale}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                className={accepted[index] === true ? undefined : 'secondary'}
                onClick={() => setAccepted(current => ({ ...current, [index]: true }))}
              >
                Accept
              </button>
              <button
                className={accepted[index] === false ? undefined : 'secondary'}
                onClick={() => setAccepted(current => ({ ...current, [index]: false }))}
              >
                Reject
              </button>
              <span className="muted">
                {accepted[index] === true ? 'will be added' : accepted[index] === false ? 'skipped' : ''}
              </span>
            </div>
          </div>
        ))}
      </div>

      {canCollapse && (
        <button
          type="button"
          className="secondary"
          style={{ marginTop: '0.75rem' }}
          onClick={() => setExpanded(open => !open)}
        >
          {expanded ? 'Show fewer suggestions' : `Show ${hiddenCount} more suggestion${hiddenCount === 1 ? '' : 's'}`}
        </button>
      )}

      <hr className="divider" />
      <button onClick={() => onConfirm(
        suggestions.map((_, i) => ({ index: i, accept: accepted[i] === true })).filter(d => d.accept),
      )}>Finalize resume</button>
    </section>
  )
}
