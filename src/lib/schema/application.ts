import { z } from 'zod'
import { ProviderSchema } from '@/lib/env'
import { TailoringResultSchema } from './tailoring'
import { ResumeSchema } from './resume'

export const ApplicationStatusSchema = z.enum(['draft', 'generating', 'ready', 'finalized', 'failed'])
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>

export const ApplicationSchema = z.object({
  id: z.string().min(1),
  baseResumeId: z.string().min(1).optional(),
  profileSnapshot: ResumeSchema.optional(),
  job: z.object({ url: z.string(), title: z.string(), company: z.string().trim().min(1).optional() }),
  jdText: z.string().min(1),
  tailoringInstructions: z.string().trim().min(1).max(1000).optional(),
  provider: ProviderSchema,
  status: ApplicationStatusSchema,
  tailoringResult: TailoringResultSchema.optional(),
  finalResumeId: z.string().optional(),
  error: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Application = z.infer<typeof ApplicationSchema>
