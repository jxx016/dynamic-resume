import { StructuredClient } from '@/lib/ai/structured-client'
import { tailorPrompt } from '@/lib/ai/prompts'
import { TailoringResultSchema, type TailoringResult } from '@/lib/schema/tailoring'
import type { Resume } from '@/lib/schema/resume'

function roleKey(role: Resume['experience'][number]) {
  return [role.company, role.title, role.start, role.end].join('\u0000').toLowerCase()
}

function preserveVerifiedContent(base: Resume, tailored: Resume): Resume {
  const includedRoles = new Set(tailored.experience.map(roleKey))
  const missingRoles = base.experience.filter(role => !includedRoles.has(roleKey(role)))
  const includedProjects = new Set(tailored.projects.map(project => project.name.toLowerCase()))
  const missingProjects = base.projects.filter(project => !includedProjects.has(project.name.toLowerCase()))

  // The model may reorder or rephrase facts, but it never gets to silently
  // discard a verified role, project, skill, education entry, or contact fact.
  // New evidence must go through the explicit confirmation flow instead.
  return {
    ...tailored,
    basics: base.basics,
    experience: [...tailored.experience, ...missingRoles],
    education: base.education,
    skills: base.skills,
    projects: [...tailored.projects, ...missingProjects],
  }
}

export async function tailorResume(
  client: StructuredClient, base: Resume, jdText: string, tailoringInstructions?: string,
): Promise<TailoringResult> {
  const result = await client.generateStructured(tailorPrompt(base, jdText, tailoringInstructions), TailoringResultSchema)
  return {
    ...result,
    tailoredResume: preserveVerifiedContent(base, result.tailoredResume),
    suggestions: result.suggestions.slice(0, 3).map(s => ({ ...s, status: 'pending' as const })),
  }
}
