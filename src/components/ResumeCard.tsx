import Link from 'next/link'
import type { Resume } from '@/lib/schema/resume'

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`
}

export function ResumeCard({ resume }: { resume: Resume }) {
  const bullets = resume.experience.reduce((n, e) => n + e.bullets.length, 0)
  // Surfaced so a lossy import is obvious at a glance rather than discovered
  // later in a tailored PDF.
  const captured = [
    plural(resume.experience.length, 'role'),
    plural(bullets, 'bullet'),
    plural(resume.skills.length, 'skill'),
    plural(resume.projects.length, 'project'),
  ].join(' · ')

  return (
    <div className="card">
      <div>
        <div className="card-title">
          <Link href={`/resumes/${resume.id}`}>{resume.label}</Link>
        </div>
        <div className="card-meta">
          {resume.basics.name || 'Untitled'}
          {' · '}
          {resume.isBase ? 'base resume' : `tailored from ${resume.sourceResumeId ?? 'unknown'}`}
        </div>
        <div className="card-meta">{captured}</div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
        <Link className="action secondary" href={`/resumes/${resume.id}`}>View</Link>
        <Link className="action" href={`/tailor/${resume.id}`}>Tailor</Link>
      </div>
    </div>
  )
}
