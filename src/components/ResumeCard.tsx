import Link from 'next/link'
import type { Resume } from '@/lib/schema/resume'

export function ResumeCard({ resume }: { resume: Resume }) {
  return (
    <div className="card">
      <div>
        <div className="card-title">{resume.label}</div>
        <div className="card-meta">
          {resume.basics.name || 'Untitled'}
          {' · '}
          {resume.isBase ? 'base resume' : `tailored from ${resume.sourceResumeId ?? 'unknown'}`}
        </div>
      </div>
      <Link className="action" href={`/tailor/${resume.id}`}>Tailor</Link>
    </div>
  )
}
