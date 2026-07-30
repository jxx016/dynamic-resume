import Link from 'next/link'
import { getContext } from '@/lib/app-context'
import { ResumeCard } from '@/components/ResumeCard'

export default function Home() {
  const resumes = getContext().store.list()
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem' }}>
      <h1>Dynamic Resume</h1>
      <p><Link href="/build">Build a new resume from scratch</Link></p>
      {resumes.length === 0 ? (
        <p>No resumes yet. Start by building one.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {resumes.map(r => <ResumeCard key={r.id} resume={r} />)}
        </div>
      )}
    </main>
  )
}
