function normalizedTokens(value: string): string {
  return value.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function formatTailoredResumeLabel(company: string | undefined, title: string): string {
  const cleanTitle = title.trim()
  const cleanCompany = company?.trim()
  if (cleanCompany && cleanTitle) {
    const companyNorm = normalizedTokens(cleanCompany)
    const titleNorm = normalizedTokens(cleanTitle)
    if (titleNorm.includes(companyNorm) || companyNorm.includes(titleNorm)) return cleanTitle
    const companyWords = companyNorm.split(' ').filter(word => word.length > 3)
    if (companyWords.length > 0 && companyWords.every(word => titleNorm.includes(word))) return cleanTitle
    return `${cleanCompany} — ${cleanTitle}`
  }
  return cleanTitle || cleanCompany || 'Tailored resume'
}

export function uniqueTailoredResumeLabel(existingLabels: string[], company: string | undefined, title: string): string {
  const base = formatTailoredResumeLabel(company, title)
  const matches = existingLabels.filter(label => label === base || label.startsWith(`${base} (`))
  if (matches.length === 0) return base
  return `${base} (${matches.length + 1})`
}

function sanitizeFilenamePart(value: string): string {
  return value.trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}

export function formatResumePdfFilename(name: string, company: string | undefined, title: string, label?: string): string {
  const roleSlug = sanitizeFilenamePart(
    (label ?? formatTailoredResumeLabel(company, title)).replace(/\s*—\s*/g, '_').replace(/\s*\(\d+\)\s*$/, ''),
  )
  return `${sanitizeFilenamePart(name)}_${roleSlug || 'resume'}.pdf`
}
