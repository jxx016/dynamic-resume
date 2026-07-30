import { ResumeSchema, type Resume } from '@/lib/schema/resume'
import type { TailoringResult } from '@/lib/schema/tailoring'

export function applyConfirmations(
  result: TailoringResult,
  decisions: { index: number; accept: boolean }[],
): Resume {
  const accepted = new Set(decisions.filter(d => d.accept).map(d => d.index))
  const extraSkills = result.suggestions
    .filter((_, i) => accepted.has(i))
    .map(s => ({ name: s.text, category: 'added' }))
  const merged: Resume = {
    ...result.tailoredResume,
    skills: [...result.tailoredResume.skills, ...extraSkills],
  }
  return ResumeSchema.parse(merged)
}
