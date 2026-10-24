import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { Resume } from '@/lib/schema/resume'

const accent = '#2B579A'

const s = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 40,
    paddingHorizontal: 44,
    fontFamily: 'Times-Roman',
    fontSize: 10.5,
    lineHeight: 1.45,
    color: '#111111',
  },
  header: { alignItems: 'center', marginBottom: 14 },
  name: {
    fontFamily: 'Times-Bold',
    fontSize: 20,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headline: {
    fontFamily: 'Times-Bold',
    fontSize: 11,
    color: accent,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  contact: {
    fontSize: 10,
    color: '#222222',
    textAlign: 'center',
  },
  sectionBlock: { marginTop: 12, marginBottom: 4 },
  sectionTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 11,
    color: accent,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionRule: {
    borderBottomWidth: 1,
    borderBottomColor: accent,
    marginBottom: 8,
  },
  summary: { textAlign: 'justify' },
  roleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 6,
  },
  roleTitle: { fontFamily: 'Times-Bold', fontSize: 10.5, flexGrow: 1, flexShrink: 1 },
  roleDates: { fontFamily: 'Times-Bold', fontSize: 10.5, flexShrink: 0 },
  companyLine: {
    fontFamily: 'Times-Italic',
    fontSize: 10,
    marginTop: 1,
    marginBottom: 3,
  },
  bullet: { marginLeft: 10, paddingLeft: 2 },
  bulletPrefix: { fontFamily: 'Times-Roman' },
  projectTitle: { fontFamily: 'Times-Bold', fontSize: 10.5, marginTop: 6, marginBottom: 2 },
  skillsLine: { marginTop: 2 },
})

const DETERMINISTIC_DATE = new Date(0)

function resumeHeadline(resume: Resume): string | null {
  if (resume.label.includes(' — ')) {
    return resume.label.split(' — ').slice(1).join(' — ').replace(/\s*\(\d+\)\s*$/, '').trim()
  }
  if (resume.isBase && resume.label.trim()) return resume.label.trim()
  if (resume.experience[0]?.title) return resume.experience[0].title
  return null
}

function contactLine(resume: Resume): string {
  const { phone, email, location } = resume.basics
  return [phone, email, location].filter(Boolean).join(' | ')
}

function formatDates(start: string, end: string): string {
  return `${start} - ${end}`
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.sectionBlock}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionRule} />
      {children}
    </View>
  )
}

export function ResumeDocument({ resume }: { resume: Resume }) {
  const b = resume.basics
  const headline = resumeHeadline(resume)

  return (
    <Document creationDate={DETERMINISTIC_DATE} modificationDate={DETERMINISTIC_DATE}>
      <Page size="LETTER" style={s.page}>
        <View style={s.header}>
          <Text style={s.name}>{b.name}</Text>
          {headline ? <Text style={s.headline}>{headline}</Text> : null}
          {contactLine(resume) ? <Text style={s.contact}>{contactLine(resume)}</Text> : null}
        </View>

        {resume.summary ? (
          <Section title="Profile">
            <Text style={s.summary}>{resume.summary}</Text>
          </Section>
        ) : null}

        {resume.experience.length > 0 ? (
          <Section title="Work Experience">
            {resume.experience.map((role, index) => (
              <View key={`${role.company}-${role.title}-${index}`} wrap={false}>
                <View style={s.roleRow}>
                  <Text style={s.roleTitle}>{role.title}</Text>
                  <Text style={s.roleDates}>{formatDates(role.start, role.end)}</Text>
                </View>
                <Text style={s.companyLine}>
                  {[role.company, role.location].filter(Boolean).join(' | ')}
                </Text>
                {role.bullets.map(bullet => (
                  <Text key={bullet.id} style={s.bullet}>
                    <Text style={s.bulletPrefix}>• </Text>
                    {bullet.text}
                  </Text>
                ))}
              </View>
            ))}
          </Section>
        ) : null}

        {resume.projects.length > 0 ? (
          <Section title="Selected Technical Projects">
            {resume.projects.map((project, index) => (
              <View key={`${project.name}-${index}`}>
                <Text style={s.projectTitle}>{project.name}</Text>
                {project.description ? <Text style={s.bullet}>{project.description}</Text> : null}
                {project.bullets.map((bullet, bulletIndex) => (
                  <Text key={`${project.name}-${bulletIndex}`} style={s.bullet}>
                    <Text style={s.bulletPrefix}>• </Text>
                    {bullet}
                  </Text>
                ))}
              </View>
            ))}
          </Section>
        ) : null}

        {resume.education.length > 0 ? (
          <Section title="Education">
            {resume.education.map((item, index) => (
              <Text key={`${item.school}-${index}`} style={s.bullet}>
                {[item.degree, item.field].filter(Boolean).join(', ')}
                {item.school ? ` — ${item.school}` : ''}
                {item.start || item.end ? ` (${formatDates(item.start, item.end)})` : ''}
              </Text>
            ))}
          </Section>
        ) : null}

        {resume.skills.length > 0 ? (
          <Section title="Technical Skills">
            <Text style={s.skillsLine}>{resume.skills.map(skill => skill.name).join(' · ')}</Text>
          </Section>
        ) : null}
      </Page>
    </Document>
  )
}
