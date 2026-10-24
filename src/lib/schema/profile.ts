import { z } from 'zod'
import { EducationSchema, ExperienceSchema, ProjectSchema, SkillSchema } from './resume'

export const ProvenanceSchema = z.object({
  sourceId: z.string().min(1),
  sourceType: z.enum(['resume', 'user']),
  originalText: z.string(),
})

export const EvidenceSchema = <T extends z.ZodType>(value: T) => z.object({
  id: z.string().min(1),
  value,
  provenance: z.array(ProvenanceSchema).min(1),
  conflict: z.boolean().optional(),
})

export const ProfileSchema = z.object({
  id: z.literal('profile'),
  basics: EvidenceSchema(z.object({
    name: z.string(), email: z.string(), phone: z.string(), location: z.string(), links: z.array(z.string()),
  })).optional(),
  summary: EvidenceSchema(z.string()).optional(),
  experience: z.array(EvidenceSchema(ExperienceSchema)),
  education: z.array(EvidenceSchema(EducationSchema)),
  skills: z.array(EvidenceSchema(SkillSchema)),
  projects: z.array(EvidenceSchema(ProjectSchema)),
  updatedAt: z.string(),
})

export type Profile = z.infer<typeof ProfileSchema>
export type ProfileEvidence<T> = { id: string; value: T; provenance: z.infer<typeof ProvenanceSchema>[]; conflict?: boolean }
