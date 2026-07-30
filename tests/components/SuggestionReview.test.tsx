// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SuggestionReview } from '@/components/SuggestionReview'

describe('SuggestionReview', () => {
  it('emits decisions when the user accepts a suggestion', () => {
    const onConfirm = vi.fn()
    render(<SuggestionReview
      suggestions={[{ text: 'Kubernetes', rationale: 'JD wants it', status: 'pending' }]}
      onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole('button', { name: /accept/i }))
    fireEvent.click(screen.getByRole('button', { name: /finalize/i }))
    expect(onConfirm).toHaveBeenCalledWith([{ index: 0, accept: true }])
  })
})
