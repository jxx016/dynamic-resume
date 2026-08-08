import Link from 'next/link'
import { getContext } from '@/lib/app-context'
import { ResumeCard } from '@/components/ResumeCard'
import { ImportPanel } from '@/components/ImportPanel'

export const dynamic = 'force-dynamic'

export default function Home() {
  const resumes = getContext().store.list()
  return (
    <main className="page">
      <header className="masthead">
        <h1>Dynamic resume</h1>
        <span className="tagline">Tailored to every job, without the rewrite</span>
      </header>

      <section className="section">
        <h2>Your resumes</h2>
        {resumes.length === 0 ? (
          <p className="empty">
            No resumes yet. Import one below, or{' '}
            <Link href="/build">build one from scratch</Link>.
          </p>
        ) : (
          <>
            <p className="section-hint">
              Check the counts below match your real resume — if a role is missing, re-import.
              Then hit <strong>Tailor</strong>, paste a job description, and you&apos;ll get a
              keyword report, suggested additions to approve, and a downloadable PDF.
              Tailoring takes around 30 seconds.
            </p>
            <div className="stack">
              {resumes.map(r => <ResumeCard key={r.id} resume={r} />)}
            </div>
          </>
        )}
      </section>

      <section className="section">
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
