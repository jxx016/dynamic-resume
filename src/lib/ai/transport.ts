import { GoogleGenAI } from '@google/genai'
import { getEnv } from '@/lib/env'

export interface GenerateTransport { generate(prompt: string): Promise<string> }

export function createRealTransport(): GenerateTransport {
  const { geminiApiKey, geminiModel } = getEnv()
  const ai = new GoogleGenAI({ apiKey: geminiApiKey })
  return {
    async generate(prompt: string) {
      const res = await ai.models.generateContent({
        model: geminiModel,
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      })
      return res.text ?? ''
    },
  }
}
