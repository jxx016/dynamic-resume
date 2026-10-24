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
    fireEvent.click(screen.getByRole('button', { name: /finalize resume/i }))
    expect(onConfirm).toHaveBeenCalledWith([{ index: 0, accept: true }])
  })

  it('collapses extra suggestions until expanded', () => {
    render(<SuggestionReview
      suggestions={[
        { text: 'One', rationale: 'r1', status: 'pending' },
        { text: 'Two', rationale: 'r2', status: 'pending' },
        { text: 'Three', rationale: 'r3', status: 'pending' },
      ]}
      onConfirm={vi.fn()} />)

    expect(screen.getByText('One')).toBeDefined()
    expect(screen.getByText('Two')).toBeDefined()
    expect(screen.queryByText('Three')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /show 1 more suggestion/i }))
    expect(screen.getByText('Three')).toBeDefined()
  })
})
