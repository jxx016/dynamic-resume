import { isReadyToDownload } from '@/lib/ats-readiness'

type AtsReportData = { jdKeywords: string[]; matched: string[]; missing: string[]; score: number }

function readiness(score: number) {
  if (score >= 80) {
    return {
      label: 'Strong keyword match',
      summary: 'Most important job-description keywords appear in your resume.',
      ready: true,
    }
  }
  if (score >= 60) {
    return {
      label: 'Good match — review gaps',
      summary: 'Solid overlap, but a few JD keywords are still missing.',
      ready: true,
    }
  }
  return {
    label: 'Notable gaps',
    summary: 'Several JD keywords are missing. Review before applying.',
    ready: false,
  }
}

function KeywordList({ title, keywords }: { title: string; keywords: string[] }) {
  return (
    <div>
      <div className="muted" style={{ marginBottom: '0.4rem' }}>
        {title} ({keywords.length})
      </div>
      {keywords.length === 0 ? (
        <span className="muted">—</span>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {keywords.map(k => <span key={k} className="pill">{k}</span>)}
        </div>
      )}
    </div>
  )
}

export function AtsReport({ report }: { report: AtsReportData }) {
  const status = readiness(report.score)
  const readyToDownload = isReadyToDownload(report.score)

  return (
    <section className="panel" style={{ marginBottom: '1.25rem' }}>
      {readyToDownload ? (
        <div className="ready-banner" role="status">
          <span className="ready-banner-icon" aria-hidden="true">✓</span>
          <div>
            <strong>Ready to download</strong>
            <p className="section-hint" style={{ marginBottom: 0 }}>
              Keyword coverage looks solid. Review optional suggestions below, then finalize.
            </p>
          </div>
        </div>
      ) : null}

      <h3>Keyword coverage: {Math.round(report.score)}%</h3>
      <div className={`ats-status ${status.ready ? 'ats-status-ready' : 'ats-status-review'}`}>
        <strong>{status.label}</strong>
        <p className="section-hint" style={{ marginBottom: 0 }}>{status.summary}</p>
      </div>

      <hr className="divider" />
      <div style={{ display: 'grid', gap: '1rem' }}>
        <KeywordList title="Matched" keywords={report.matched} />
        <KeywordList title="Missing" keywords={report.missing} />
      </div>

      <hr className="divider" />
      <div className="sunken">
        <strong>What &quot;ATS-ready&quot; means here</strong>
        <ul className="ats-checklist">
          <li>PDF uses a single-column layout with standard section headings parsers expect.</li>
          <li>Keyword coverage shows overlap between this job description and your resume text.</li>
          <li>This score does <strong>not</strong> guarantee ATS passage or an interview — it&apos;s a checklist aid.</li>
        </ul>
      </div>
    </section>
  )
}
