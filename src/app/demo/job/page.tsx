'use client'

import { useEffect, useState } from 'react'

export default function DemoJobPage() {
  const [qualificationsOpen, setQualificationsOpen] = useState(false)

  useEffect(() => {
    document.title = 'Forward Deployed Engineer — Demo Corp'
  }, [])

  return (
    <div style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif', color: '#1a1a1a', background: '#fff', minHeight: '100vh' }}>
      <header style={{ borderBottom: '1px solid #e5e5e5', padding: '16px 32px', background: '#f7f7f7' }}>
        <p style={{ margin: 0, fontSize: 13, color: '#666' }}>Demo Corp · Careers</p>
        <h1 style={{ margin: '8px 0 0', fontSize: 28 }}>Forward Deployed Engineer</h1>
        <p style={{ margin: '6px 0 0', color: '#555' }}>Austin, TX · Full-time · Remote-friendly</p>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 64px' }}>
        <section>
          <h2>Job Description</h2>
          <p>
            Join our customer-facing engineering team to design and ship AI-powered solutions
            for enterprise clients. You will work directly with stakeholders, translate business
            problems into technical architecture, and deliver production systems using modern
            cloud and LLM tooling.
          </p>
          <p>
            This role emphasizes hands-on full-stack development, solution design workshops,
            and rapid prototyping with LangChain, RAG pipelines, and agent frameworks.
          </p>
        </section>

        <section style={{ marginTop: 28 }}>
          <h2>What you&apos;ll do</h2>
          <ul>
            <li>Lead technical discovery sessions with customer engineering teams</li>
            <li>Build and deploy AI agents, RAG systems, and workflow automations</li>
            <li>Own end-to-end delivery from prototype through production hardening</li>
          </ul>
        </section>

        <section style={{ marginTop: 28 }}>
          <button
            type="button"
            aria-expanded={qualificationsOpen}
            onClick={() => setQualificationsOpen(open => !open)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '12px 16px',
              border: '1px solid #ddd',
              borderRadius: 8,
              background: '#fafafa',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            Qualifications
          </button>
          {qualificationsOpen && (
            <div style={{ padding: '16px 4px 0' }}>
              <ul>
                <li>5+ years of software engineering experience, including customer-facing work</li>
                <li>Strong Python and TypeScript; experience with LangChain, OpenAI API, or similar</li>
                <li>Cloud experience (AWS, GCP, or Azure) and familiarity with solution architecture</li>
                <li>Excellent communication skills for workshops and stakeholder alignment</li>
              </ul>
            </div>
          )}
        </section>

        <section style={{ marginTop: 40, paddingTop: 32, borderTop: '2px solid #e5e5e5' }}>
          <h2>Apply for this job</h2>
          <p style={{ color: '#666', fontSize: 14 }}>
            Demo application form — use the Dynamic Resume extension&apos;s autofill button here.
          </p>
          <form style={{ display: 'grid', gap: 16, marginTop: 20 }} onSubmit={e => e.preventDefault()}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span>Full name</span>
              <input name="name" autoComplete="name" placeholder="Your full name" style={fieldStyle} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span>Email</span>
              <input name="email" type="email" autoComplete="email" placeholder="you@example.com" style={fieldStyle} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span>Phone</span>
              <input name="phone" type="tel" autoComplete="tel" placeholder="555-0100" style={fieldStyle} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span>Location</span>
              <input name="location" autoComplete="address-level2" placeholder="City, State" style={fieldStyle} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span>Resume (attach manually)</span>
              <input type="file" accept=".pdf,.doc,.docx" style={fieldStyle} />
            </label>
            <button type="submit" style={{ ...fieldStyle, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              Submit application
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}

const fieldStyle: React.CSSProperties = {
  padding: '10px 12px',
  border: '1px solid #ccc',
  borderRadius: 6,
  fontSize: 15,
}
