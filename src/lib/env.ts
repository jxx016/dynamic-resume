export function getEnv() {
  const geminiApiKey = process.env.GEMINI_API_KEY
  if (!geminiApiKey) throw new Error('GEMINI_API_KEY is not set')
  return { geminiApiKey, geminiModel: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash' }
}
