import Link from 'next/link'
import type { Resume } from '@/lib/schema/resume'

export function ResumeCard({ resume }: { resume: Resume }) {
  return (
    <div style={{ border: '1px solid #ccc', borderRadius: 8, padding: '1rem' }}>
      <strong>{resume.label}</strong>
      <div>{resume.basics.name || 'Untitled'}</div>
      <div>{resume.isBase ? 'Base resume' : `Tailored from ${resume.sourceResumeId ?? 'unknown'}`}</div>
      <Link href={`/tailor/${resume.id}`}>Tailor this resume</Link>
    </div>
  )
}
