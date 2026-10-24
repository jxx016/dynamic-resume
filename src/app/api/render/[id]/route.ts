import { getContext } from '@/lib/app-context'
import { renderResumePdf } from '@/lib/pdf/render-pdf'

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const resume = getContext().store.get(id)
  if (!resume) return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
  const pdf = await renderResumePdf(resume)
  const name = `${resume.basics.name.replace(/\s+/g, '_') || 'resume'}.pdf`
  return new Response(new Uint8Array(pdf), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${name}"` },
  })
}
