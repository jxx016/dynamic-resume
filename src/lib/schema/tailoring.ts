import { z } from 'zod'
import { ResumeSchema } from './resume'

export const TailoringResultSchema = z.object({
  tailoredResume: ResumeSchema,
  changeLog: z.array(z.object({
    field: z.string(), before: z.string(), after: z.string(), reason: z.string(),
  })),
  suggestions: z.array(z.object({
    text: z.string(), rationale: z.string(),
    status: z.enum(['pending', 'accepted', 'rejected']),
  })),
  atsReport: z.object({
    jdKeywords: z.array(z.string()), matched: z.array(z.string()),
    missing: z.array(z.string()), score: z.number(),
  }),
})
export type TailoringResult = z.infer<typeof TailoringResultSchema>
