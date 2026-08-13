import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getContext } from '@/lib/app-context'
import { DeleteResumeButton } from '@/components/DeleteResumeButton'

export const dynamic = 'force-dynamic'

export default async function ResumeViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const resume = getContext().store.get(id)
  if (!resume) notFound()

  const source = resume.sourceResumeId ? getContext().store.get(resume.sourceResumeId) : null

  return (
    <main className="page">
      <header className="masthead">
        <h1>{resume.label}</h1>
        <span className="tagline"><Link href="/">Back to library</Link></span>
      </header>

      <section className="section">
        <p className="section-hint">
          {resume.isBase
            ? 'Base resume — everything below is what the importer or builder captured.'
            : source
              ? <>Tailored from <Link href={`/resumes/${source.id}`}>{source.label}</Link>.</>
              : 'Tailored resume (its base has since been deleted).'}
          {' '}Last updated {new Date(resume.meta.updatedAt).toLocaleDateString()}.
        </p>

        <div className="panel">
          <h2>Contact</h2>
          <p>{resume.basics.name || <span className="muted">No name captured</span>}</p>
          <p className="card-meta">
            {[resume.basics.email, resume.basics.phone, resume.basics.location]
              .filter(Boolean).join(' · ') || <span className="muted">No contact details captured</span>}
          </p>
          {resume.basics.links.length > 0 && (
            <p className="card-meta">{resume.basics.links.join(' · ')}</p>
          )}
        </div>

        {resume.summary && (
          <div className="panel">
            <h2>Summary</h2>
            <p>{resume.summary}</p>
          </div>
        )}

        <div className="panel">
          <h2>Experience ({resume.experience.length})</h2>
          {resume.experience.length === 0 ? (
            <p className="empty">No roles captured — check the import if this looks wrong.</p>
          ) : (
            <div className="stack">
              {resume.experience.map((exp, i) => (
                <div key={i} className="sunken">
                  <div style={{ fontWeight: 500 }}>{exp.title} · {exp.company}</div>
                  <div className="card-meta">
                    {exp.start} – {exp.end || 'Present'}{exp.location ? ` · ${exp.location}` : ''}
                  </div>
                  <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
                    {exp.bullets.map(b => <li key={b.id}>{b.text}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {resume.education.length > 0 && (
          <div className="panel">
            <h2>Education</h2>
            <div className="stack">
              {resume.education.map((ed, i) => (
                <div key={i}>
                  <div style={{ fontWeight: 500 }}>{ed.degree} {ed.field}</div>
                  <div className="card-meta">{ed.school} · {ed.start} – {ed.end}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {resume.projects.length > 0 && (
          <div className="panel">
            <h2>Projects</h2>
            <div className="stack">
              {resume.projects.map((p, i) => (
                <div key={i} className="sunken">
                  <div style={{ fontWeight: 500 }}>{p.name}</div>
                  {p.description && <p className="card-meta">{p.description}</p>}
                  {p.bullets.length > 0 && (
                    <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
                      {p.bullets.map((b, j) => <li key={j}>{b}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {resume.skills.length > 0 && (
          <div className="panel">
            <h2>Skills ({resume.skills.length})</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {resume.skills.map((s, i) => <span key={i} className="pill">{s.name}</span>)}
            </div>
          </div>
        )}
      </section>

      <section className="section" style={{ display: 'flex', gap: '0.75rem' }}>
        {resume.isBase && <Link className="action" href={`/tailor/${resume.id}`}>Tailor this resume</Link>}
        <DeleteResumeButton resumeId={resume.id} />
      </section>
    </main>
  )
}
