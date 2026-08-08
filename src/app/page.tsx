import Link from 'next/link'
import { getContext } from '@/lib/app-context'
import { ResumeCard } from '@/components/ResumeCard'
import { ImportPanel } from '@/components/ImportPanel'

export const dynamic = 'force-dynamic'

export default function Home() {
  const resumes = getContext().store.list()
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem' }}>
      <h1>Dynamic Resume</h1>
      <p style={{ marginBottom: '2rem' }}>
        Tailor your resume to any job description, without rewriting it each time.
      </p>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Your resumes</h2>
        {resumes.length === 0 ? (
          <p>No resumes yet — import one below, or{' '}
            <Link href="/build">build one from scratch</Link>.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {resumes.map(r => <ResumeCard key={r.id} resume={r} />)}
          </div>
        )}
      </section>

      <section>
        <h2>Add a resume</h2>
        <p style={{ marginBottom: '1rem' }}>
          Upload an existing resume, paste its text, or{' '}
          <Link href="/build">build a new one from scratch</Link>.
        </p>
        <ImportPanel />
      </section>
    </main>
  )
}
