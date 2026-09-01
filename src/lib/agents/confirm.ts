import { ResumeSchema, type Resume } from '@/lib/schema/resume'
import type { TailoringResult } from '@/lib/schema/tailoring'

function isPlainSkillName(text: string): boolean {
  const value = text.trim()
  return value.length > 0 && value.length <= 60 && value.split(/\s+/).length <= 5 &&
    !/[.!?]/.test(value) && !/^(?:add|include|explicitly|mention|provide|quantify|describe|ensure|show|highlight)\b/i.test(value)
}

export function applyConfirmations(
  result: TailoringResult,
  decisions: { index: number; accept: boolean }[],
): Resume {
  const accepted = new Set(decisions.filter(d => d.accept).map(d => d.index))
  const extraSkills = result.suggestions
    .filter((suggestion, i) => accepted.has(i) && isPlainSkillName(suggestion.text))
    .map(s => ({ name: s.text, category: 'added' }))
  const merged: Resume = {
    ...result.tailoredResume,
    skills: [...result.tailoredResume.skills, ...extraSkills],
  }
  return ResumeSchema.parse(merged)
}
