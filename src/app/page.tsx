import Link from 'next/link'
import { getContext } from '@/lib/app-context'
import { ResumeCard } from '@/components/ResumeCard'
import { ImportPanel } from '@/components/ImportPanel'

export const dynamic = 'force-dynamic'

export default function Home() {
  const resumes = getContext().store.list()
  const baseResumes = resumes.filter(resume => resume.isBase)
  const tailoredResumes = resumes.filter(resume => !resume.isBase)

  return (
    <main className="page">
      <header className="masthead">
        <h1>Dynamic resume</h1>
        <span className="tagline">Tailored to every job, without the rewrite</span>
      </header>

      {resumes.length === 0 ? (
        <section className="section">
          <h2>Your resumes</h2>
          <p className="empty">
            No resumes yet. Import one below, or{' '}
            <Link href="/build">build one from scratch</Link>.
          </p>
        </section>
      ) : (
        <>
          {baseResumes.length > 0 && (
            <section className="section">
              <h2>Base resumes</h2>
              <p className="section-hint">
                Your source resumes — e.g. solutions engineer, forward deployed engineer.
                Imports merge into one verified profile.
              </p>
              <div className="stack">
                {baseResumes.map(resume => <ResumeCard key={resume.id} resume={resume} />)}
              </div>
            </section>
          )}

          {tailoredResumes.length > 0 && (
            <section className="section">
              <hr className="divider" />
              <h2>Tailored applications</h2>
              <p className="section-hint">
                Job-specific versions named by company and role — one per application.
              </p>
              <div className="stack">
                {tailoredResumes.map(resume => <ResumeCard key={resume.id} resume={resume} />)}
              </div>
            </section>
          )}
        </>
      )}

      <section className="section">
        <hr className="divider" />
        <h2>Add a resume</h2>
        <p className="section-hint">
          Upload an existing resume, paste its text, or{' '}
          <Link href="/build">build a new one from scratch</Link>.
        </p>
        <ImportPanel />
      </section>
    </main>
  )
}
