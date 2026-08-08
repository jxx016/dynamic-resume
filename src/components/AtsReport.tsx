type AtsReportData = { jdKeywords: string[]; matched: string[]; missing: string[]; score: number }

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
  return (
    <section className="panel" style={{ marginBottom: '1.25rem' }}>
      <h3>ATS keyword coverage: {Math.round(report.score)}%</h3>
      <hr className="divider" />
      <div style={{ display: 'grid', gap: '1rem' }}>
        <KeywordList title="Matched" keywords={report.matched} />
        <KeywordList title="Missing" keywords={report.missing} />
      </div>
    </section>
  )
}
