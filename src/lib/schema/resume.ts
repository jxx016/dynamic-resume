import { z } from 'zod'

export const BulletSchema = z.object({ id: z.string().min(1), text: z.string(), tags: z.array(z.string()) })
export const ExperienceSchema = z.object({
  company: z.string(), title: z.string(), start: z.string(), end: z.string(),
  location: z.string(), bullets: z.array(BulletSchema),
})
export const EducationSchema = z.object({
  school: z.string(), degree: z.string(), field: z.string(), start: z.string(), end: z.string(),
})
export const SkillSchema = z.object({ name: z.string(), category: z.string() })
export const ProjectSchema = z.object({
  name: z.string(), description: z.string(), bullets: z.array(z.string()), links: z.array(z.string()),
})

export const ResumeSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  isBase: z.boolean(),
  sourceResumeId: z.string().optional(),
  basics: z.object({
    name: z.string(), email: z.string().email().or(z.literal('')),
    phone: z.string(), location: z.string(), links: z.array(z.string()),
  }),
  summary: z.string(),
  experience: z.array(ExperienceSchema),
  education: z.array(EducationSchema),
  skills: z.array(SkillSchema),
  projects: z.array(ProjectSchema),
  meta: z.object({ createdAt: z.string(), updatedAt: z.string() }),
})
export type Resume = z.infer<typeof ResumeSchema>
