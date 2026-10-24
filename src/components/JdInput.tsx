'use client'
import React, { useState } from 'react'

export function JdInput({ onSubmit, disabled }: { onSubmit: (jdText: string) => void; disabled?: boolean }) {
  const [jdText, setJdText] = useState('')
  return (
    <div className="panel">
      <div className="field">
        <label htmlFor="jd-text">Job description</label>
        <textarea
          id="jd-text"
          value={jdText}
          onChange={e => setJdText(e.target.value)}
          placeholder="Paste the job description here"
          rows={12}
        />
      </div>
      <button disabled={disabled || !jdText.trim()} onClick={() => onSubmit(jdText)}>
        Tailor to this JD
      </button>
    </div>
  )
}
