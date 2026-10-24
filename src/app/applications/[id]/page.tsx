import { ApplicationReview } from '@/components/ApplicationReview'

export const dynamic = 'force-dynamic'

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <main className="page"><ApplicationReview applicationId={id} /></main>
}
