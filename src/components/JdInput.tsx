'use client'
import React, { useState } from 'react'

export function JdInput({ onSubmit, disabled }: { onSubmit: (jdText: string) => void; disabled?: boolean }) {
  const [jdText, setJdText] = useState('')
  return (
    <div>
      <textarea
        value={jdText}
        onChange={e => setJdText(e.target.value)}
        placeholder="Paste the job description here"
        rows={12}
        style={{ width: '100%' }}
      />
      <button disabled={disabled || !jdText.trim()} onClick={() => onSubmit(jdText)}>
        Tailor to this JD
      </button>
    </div>
  )
}
