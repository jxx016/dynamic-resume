import { describe, it, expect } from 'vitest'
import { GeminiClient } from '@/lib/ai/gemini'
import { builderTurn } from '@/lib/agents/builder'

const modelOut = JSON.stringify({
  message: 'What impact did you have?',
  draft: {
    basics: { name: 'Jo', email: '', phone: '', location: '', links: [] },
    summary: '', experience: [], education: [], skills: [], projects: [],
  },
})

describe('builderTurn', () => {
  it('returns a message and a validated draft', async () => {
    const client = new GeminiClient({ generate: async () => modelOut })
    const turn = await builderTurn(client, [{ role: 'user', text: 'I was a PM at Acme' }], null)
    expect(turn.message).toMatch(/impact/i)
    expect(turn.draft.basics.name).toBe('Jo')
    expect(turn.draft.isBase).toBe(true)
  })
})
