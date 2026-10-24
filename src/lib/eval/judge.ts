import { z } from 'zod'

export const EvalJudgeSchema = z.object({
  ats: z.object({
    score: z.number().min(0).max(100),
    pass: z.boolean(),
    matched: z.array(z.string()),
    missing: z.array(z.string()),
    notes: z.string(),
  }),
  recruiter: z.object({
    decision: z.enum(['advance', 'maybe', 'reject']),
    score: z.number().min(0).max(100),
    strengths: z.array(z.string()),
    concerns: z.array(z.string()),
    notes: z.string(),
  }),
  overallPass: z.boolean(),
  summary: z.string(),
})

export type EvalJudgeResult = z.infer<typeof EvalJudgeSchema>

export function judgePrompt(jdText: string, resumeText: string): string {
  return `You are evaluating a tailored resume against a job description.
Score from two lenses. Be strict and honest. Do NOT reward fabricated experience.

ATS lens: Would a typical keyword/requirement screen pass this resume for this JD?
- Consider keyword overlap, explicit must-have requirements, and that the PDF is single-column/plain.
- pass=true only if score >= 70 AND no critical must-have is clearly missing.

Recruiter lens: Would a hiring manager advance this candidate to a first interview screen?
- decision: advance | maybe | reject
- Penalize vague claims, missing core SE/GTM skills if the role needs them, and unsupported cloud/stack claims.

overallPass should be true only if ats.pass is true AND recruiter.decision is not "reject".

Return ONLY JSON matching EvalJudgeSchema.

--- JOB DESCRIPTION ---
${jdText}

--- RESUME TEXT ---
${resumeText}`
}

export function resumeToEvalText(resume: {
  basics: { name: string; email: string; phone: string; location: string }
  summary: string
  experience: { title: string; company: string; start: string; end: string; location: string; bullets: { text: string }[] }[]
  skills: { name: string }[]
  projects: { name: string; description: string; bullets: string[] }[]
  education: { school: string; degree: string; field: string; start: string; end: string }[]
}): string {
  const lines: string[] = []
  lines.push(resume.basics.name)
  lines.push([resume.basics.email, resume.basics.phone, resume.basics.location].filter(Boolean).join(' | '))
  if (resume.summary) {
    lines.push('', 'PROFILE', resume.summary)
  }
  if (resume.experience.length) {
    lines.push('', 'WORK EXPERIENCE')
    for (const role of resume.experience) {
      lines.push(`${role.title} | ${role.start} - ${role.end}`)
      lines.push([role.company, role.location].filter(Boolean).join(' | '))
      for (const bullet of role.bullets) lines.push(`• ${bullet.text}`)
    }
  }
  if (resume.projects.length) {
    lines.push('', 'PROJECTS')
    for (const project of resume.projects) {
      lines.push(project.name)
      if (project.description) lines.push(project.description)
      for (const bullet of project.bullets) lines.push(`• ${bullet}`)
    }
  }
  if (resume.education.length) {
    lines.push('', 'EDUCATION')
    for (const item of resume.education) {
      lines.push(`${item.degree} ${item.field}, ${item.school} (${item.start}-${item.end})`)
    }
  }
  if (resume.skills.length) {
    lines.push('', 'SKILLS', resume.skills.map(skill => skill.name).join(', '))
  }
  return lines.join('\n')
}
