import { ProfileEditor } from '@/components/ProfileEditor'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function ProfilePage() {
  return (
    <main className="page">
      <header className="masthead">
        <h1>Your profile</h1>
        <span className="tagline"><Link href="/">Library</Link></span>
      </header>
      <ProfileEditor />
    </main>
  )
}
