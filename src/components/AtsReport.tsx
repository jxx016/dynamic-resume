type AtsReportData = { jdKeywords: string[]; matched: string[]; missing: string[]; score: number }

export function AtsReport({ report }: { report: AtsReportData }) {
  return (
    <div>
      <h3>ATS keyword coverage: {Math.round(report.score)}%</h3>
      <div>
        <strong>Matched ({report.matched.length})</strong>
        <ul>
          {report.matched.map(k => <li key={k}>{k}</li>)}
        </ul>
      </div>
      <div>
        <strong>Missing ({report.missing.length})</strong>
        <ul>
          {report.missing.map(k => <li key={k}>{k}</li>)}
        </ul>
      </div>
    </div>
  )
}
