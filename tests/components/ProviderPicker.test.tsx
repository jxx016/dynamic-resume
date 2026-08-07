// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react'
import { ProviderPicker } from '@/components/ProviderPicker'

function mockProviders(configured: string[], def: string | null) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ configured, default: def }),
  }) as unknown as typeof fetch
}

beforeEach(() => vi.restoreAllMocks())
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ProviderPicker', () => {
  it('lists the configured providers and selects the default', async () => {
    mockProviders(['gemini', 'openai'], 'openai')
    const onChange = vi.fn()
    render(<ProviderPicker value={null} onChange={onChange} />)
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('openai'))
    expect(screen.getByRole('option', { name: /gemini/i })).toBeDefined()
    expect(screen.getByRole('option', { name: /openai/i })).toBeDefined()
  })

  it('emits the provider the user picks', async () => {
    mockProviders(['gemini', 'openai'], 'gemini')
    const onChange = vi.fn()
    render(<ProviderPicker value="gemini" onChange={onChange} />)
    await waitFor(() => expect(screen.getByRole('combobox')).toBeDefined())
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'openai' } })
    expect(onChange).toHaveBeenCalledWith('openai')
  })

  it('shows a notice when no provider is configured', async () => {
    mockProviders([], null)
    render(<ProviderPicker value={null} onChange={() => {}} />)
    await waitFor(() => expect(screen.getByText(/no ai provider configured/i)).toBeDefined())
    expect(screen.queryByRole('combobox')).toBeNull()
  })
})
