import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { Resume } from '@/lib/schema/resume'

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, lineHeight: 1.4 },
  name: { fontSize: 18, marginBottom: 2 },
  contact: { fontSize: 9, marginBottom: 10 },
  section: { fontSize: 12, marginTop: 12, marginBottom: 4, fontFamily: 'Helvetica-Bold' },
  role: { fontFamily: 'Helvetica-Bold' },
  bullet: { marginLeft: 10 },
})

// Fixed epoch so the PDF byte stream is deterministic for a given resume:
// @react-pdf/renderer defaults CreationDate/ModDate to `new Date()`, which would
// otherwise embed the render wall-clock time (and a derived /ID hash) into the output.
const DETERMINISTIC_DATE = new Date(0)

export function ResumeDocument({ resume }: { resume: Resume }) {
  const b = resume.basics
  return (
    <Document creationDate={DETERMINISTIC_DATE} modificationDate={DETERMINISTIC_DATE}>
      <Page size="A4" style={s.page}>
        <Text style={s.name}>{b.name}</Text>
        <Text style={s.contact}>{[b.email, b.phone, b.location, ...b.links].filter(Boolean).join('  •  ')}</Text>
        {resume.summary ? <Text>{resume.summary}</Text> : null}

        {resume.experience.length > 0 && <Text style={s.section}>Experience</Text>}
        {resume.experience.map((e, i) => (
          <View key={i}>
            <Text style={s.role}>{e.title} — {e.company} ({e.start}–{e.end})</Text>
            {e.bullets.map(bl => <Text key={bl.id} style={s.bullet}>• {bl.text}</Text>)}
          </View>
        ))}

        {resume.education.length > 0 && <Text style={s.section}>Education</Text>}
        {resume.education.map((ed, i) => (
          <Text key={i}>{ed.degree} {ed.field}, {ed.school} ({ed.start}–{ed.end})</Text>
        ))}

        {resume.skills.length > 0 && <Text style={s.section}>Skills</Text>}
        {resume.skills.length > 0 && <Text>{resume.skills.map(sk => sk.name).join(', ')}</Text>}

        {resume.projects.length > 0 && <Text style={s.section}>Projects</Text>}
        {resume.projects.map((p, i) => (
          <View key={i}>
            <Text style={s.role}>{p.name}</Text>
            {p.bullets.map((bl, j) => <Text key={j} style={s.bullet}>• {bl}</Text>)}
          </View>
        ))}
      </Page>
    </Document>
  )
}
