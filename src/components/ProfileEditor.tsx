'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { withUserProvenance, emptyProfile } from '@/lib/profile/profile-service'
import type { Profile, ProfileEvidence } from '@/lib/schema/profile'
import type { Resume } from '@/lib/schema/resume'

type Basics = NonNullable<Profile['basics']>['value']
type Experience = Resume['experience'][number]
type Skill = Resume['skills'][number]

function sourceHint(item: { provenance: { sourceId: string }[] }) {
  const ids = item.provenance.map(p => p.sourceId).filter(id => id !== 'user')
  if (item.provenance.some(p => p.sourceId === 'user')) return 'edited by you'
  if (ids.length === 0) return 'profile'
  return `from: ${ids.slice(0, 3).join(', ')}${ids.length > 3 ? '…' : ''}`
}

export function ProfileEditor() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(true)

  async function load() {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/profile')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Could not load profile')
      setProfile(data)
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void load() }, [])

  function updateBasics(patch: Partial<Basics>) {
    setProfile(current => {
      if (!current) return current
      const previous = current.basics?.value ?? { name: '', email: '', phone: '', location: '', links: [] }
      const value = { ...previous, ...patch }
      const base = current.basics ?? { id: 'basics', value, provenance: [] }
      return {
        ...current,
        basics: withUserProvenance({ ...base, value }, JSON.stringify(value)),
      }
    })
  }

  function updateSummary(summary: string) {
    setProfile(current => {
      if (!current) return current
      const base = current.summary ?? { id: 'summary', value: summary, provenance: [] }
      return {
        ...current,
        summary: withUserProvenance({ ...base, value: summary }, summary),
      }
    })
  }

  function updateSkill(index: number, name: string) {
    setProfile(current => {
      if (!current) return current
      const skills = current.skills.map((skill, i) => {
        if (i !== index) return skill
        const value: Skill = { ...skill.value, name }
        return withUserProvenance({ ...skill, value }, name)
      })
      return { ...current, skills }
    })
  }

  function removeSkill(index: number) {
    setProfile(current => current ? { ...current, skills: current.skills.filter((_, i) => i !== index) } : current)
  }

  function addSkill() {
    setProfile(current => {
      if (!current) return current
      const value: Skill = { name: '', category: 'technical' }
      const item: ProfileEvidence<Skill> = withUserProvenance(
        { id: `skill_user_${Date.now()}`, value, provenance: [] },
        '',
      )
      return { ...current, skills: [...current.skills, item] }
    })
  }

  function updateExperience(index: number, patch: Partial<Experience>) {
    setProfile(current => {
      if (!current) return current
      const experience = current.experience.map((role, i) => {
        if (i !== index) return role
        const value = { ...role.value, ...patch }
        return withUserProvenance({ ...role, value }, JSON.stringify(value))
      })
      return { ...current, experience }
    })
  }

  function updateBullets(index: number, text: string) {
    const bullets = text.split('\n').map(line => line.replace(/^•\s*/, '').trim()).filter(Boolean)
      .map((line, bulletIndex) => ({ id: `b_${index}_${bulletIndex}`, text: line, tags: [] as string[] }))
    updateExperience(index, { bullets })
  }

  function removeExperience(index: number) {
    setProfile(current => current ? { ...current, experience: current.experience.filter((_, i) => i !== index) } : current)
  }

  async function save() {
    if (!profile) return
    setBusy(true)
    setError(null)
    setStatus(null)
    try {
      const payload = { ...profile, updatedAt: new Date().toISOString() }
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Could not save profile')
      setProfile(data)
      setStatus('Profile saved — new generations will use this.')
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function rebuild() {
    setBusy(true)
    setError(null)
    setStatus(null)
    try {
      const response = await fetch('/api/profile/rebuild', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Could not rebuild profile')
      setProfile(data)
      setStatus('Rebuilt from your uploaded base resumes.')
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (busy && !profile) {
    return <p className="muted">Loading profile…</p>
  }

  if (!profile) {
    return (
      <section className="section">
        {error && <p className="error">{error}</p>}
        <p className="empty">No profile yet. Import a resume on the home page, then rebuild.</p>
        <button type="button" onClick={() => setProfile(emptyProfile())}>Start empty profile</button>
      </section>
    )
  }

  const basics = profile.basics?.value ?? { name: '', email: '', phone: '', location: '', links: [] }

  return (
    <section className="section">
      <p className="section-hint">
        This is what Generate uses. Edit lightly — no conflict screens. Save when it looks right.
      </p>

      {error && <p className="error">{error}</p>}
      {status && <p className="muted">{status}</p>}

      <div className="panel" style={{ marginBottom: '1.25rem' }}>
        <h3>Contact</h3>
        <div className="field">
          <label htmlFor="profile-name">Name</label>
          <input id="profile-name" value={basics.name} onChange={e => updateBasics({ name: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="profile-email">Email</label>
          <input id="profile-email" value={basics.email} onChange={e => updateBasics({ email: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="profile-phone">Phone</label>
          <input id="profile-phone" value={basics.phone} onChange={e => updateBasics({ phone: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="profile-location">Location</label>
          <input id="profile-location" value={basics.location} onChange={e => updateBasics({ location: e.target.value })} />
        </div>
        {profile.basics && <p className="card-meta">{sourceHint(profile.basics)}</p>}
      </div>

      <div className="panel" style={{ marginBottom: '1.25rem' }}>
        <h3>Summary</h3>
        <textarea
          aria-label="Summary"
          rows={4}
          value={profile.summary?.value ?? ''}
          onChange={e => updateSummary(e.target.value)}
        />
        {profile.summary && <p className="card-meta">{sourceHint(profile.summary)}</p>}
      </div>

      <div className="panel" style={{ marginBottom: '1.25rem' }}>
        <h3>Skills ({profile.skills.length})</h3>
        <div className="stack">
          {profile.skills.map((skill, index) => (
            <div key={skill.id} className="sunken">
              <input
                aria-label={`Skill ${index + 1}`}
                value={skill.value.name}
                onChange={e => updateSkill(index, e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem' }}>
                <span className="card-meta">{sourceHint(skill)}</span>
                <button type="button" className="secondary" onClick={() => removeSkill(index)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="secondary" style={{ marginTop: '0.75rem' }} onClick={addSkill}>Add skill</button>
      </div>

      <div className="panel" style={{ marginBottom: '1.25rem' }}>
        <h3>Experience ({profile.experience.length})</h3>
        <div className="stack">
          {profile.experience.map((role, index) => (
            <div key={role.id} className="sunken">
              <div className="field">
                <label htmlFor={`title-${role.id}`}>Title</label>
                <input
                  id={`title-${role.id}`}
                  value={role.value.title}
                  onChange={e => updateExperience(index, { title: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor={`company-${role.id}`}>Company</label>
                <input
                  id={`company-${role.id}`}
                  value={role.value.company}
                  onChange={e => updateExperience(index, { company: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label htmlFor={`start-${role.id}`}>Start</label>
                  <input
                    id={`start-${role.id}`}
                    value={role.value.start}
                    onChange={e => updateExperience(index, { start: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor={`end-${role.id}`}>End</label>
                  <input
                    id={`end-${role.id}`}
                    value={role.value.end}
                    onChange={e => updateExperience(index, { end: e.target.value })}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor={`bullets-${role.id}`}>Bullets (one per line)</label>
                <textarea
                  id={`bullets-${role.id}`}
                  rows={4}
                  value={role.value.bullets.map(b => b.text).join('\n')}
                  onChange={e => updateBullets(index, e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="card-meta">{sourceHint(role)}</span>
                <button type="button" className="secondary" onClick={() => removeExperience(index)}>Remove role</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
        <button type="button" onClick={save} disabled={busy}>Save profile</button>
        <button type="button" className="secondary" onClick={rebuild} disabled={busy}>Rebuild from uploads</button>
        <Link className="action secondary" href="/">Back to library</Link>
      </div>
    </section>
  )
}
