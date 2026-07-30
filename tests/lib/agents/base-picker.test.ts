import { describe, it, expect } from 'vitest'
import { GeminiClient } from '@/lib/ai/gemini'
import { pickBase } from '@/lib/agents/base-picker'
import type { Resume } from '@/lib/schema/resume'

const mk = (id: string): Resume => ({ id, label: id, isBase: true,
  basics: { name: '', email: '', phone: '', location: '', links: [] },
  summary: '', experience: [], education: [], skills: [], projects: [],
  meta: { createdAt: '', updatedAt: '' } })

describe('pickBase', () => {
  it('returns the model-chosen id when valid', async () => {
    const client = new GeminiClient({ generate: async () => '{"resumeId":"b","reason":"fit"}' })
    expect(await pickBase(client, 'jd', [mk('a'), mk('b')])).toBe('b')
  })
  it('falls back to the first resume on an unknown id', async () => {
    const client = new GeminiClient({ generate: async () => '{"resumeId":"z","reason":"x"}' })
    expect(await pickBase(client, 'jd', [mk('a'), mk('b')])).toBe('a')
  })
})
