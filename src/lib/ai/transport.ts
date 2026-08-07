import { GoogleGenAI } from '@google/genai'
import OpenAI from 'openai'
import { getProviderEnv, type Provider } from '@/lib/env'

export interface GenerateTransport { generate(prompt: string): Promise<string> }

export function createGeminiTransport(): GenerateTransport {
  const { apiKey, model } = getProviderEnv('gemini')
  const ai = new GoogleGenAI({ apiKey })
  return {
    async generate(prompt: string) {
      const res = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      })
      return res.text ?? ''
    },
  }
}

export function createOpenAiTransport(): GenerateTransport {
  const { apiKey, model } = getProviderEnv('openai')
  const openai = new OpenAI({ apiKey })
  return {
    async generate(prompt: string) {
      const res = await openai.responses.create({
        model,
        input: prompt,
        text: { format: { type: 'json_object' } },
      })
      return res.output_text ?? ''
    },
  }
}

export function createTransport(provider: Provider): GenerateTransport {
  return provider === 'openai' ? createOpenAiTransport() : createGeminiTransport()
}
