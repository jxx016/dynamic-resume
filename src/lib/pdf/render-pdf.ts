import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { ResumeDocument } from './resume-document'
import type { Resume } from '@/lib/schema/resume'

export async function renderResumePdf(resume: Resume): Promise<Buffer> {
  const element = React.createElement(ResumeDocument, { resume }) as Parameters<typeof renderToBuffer>[0]
  return renderToBuffer(element)
}
