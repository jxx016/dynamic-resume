import type { Database } from 'better-sqlite3'
import { openDb } from './db'
import { ResumeSchema, type Resume } from '@/lib/schema/resume'
import type { ResumeStore } from './resume-store'

export class SqliteResumeStore implements ResumeStore {
  private db: Database
  constructor(dbPath: string) { this.db = openDb(dbPath) }

  list(): Resume[] {
    const rows = this.db.prepare('SELECT data FROM resumes').all() as { data: string }[]
    return rows.map(r => ResumeSchema.parse(JSON.parse(r.data)))
  }
  get(id: string): Resume | null {
    const row = this.db.prepare('SELECT data FROM resumes WHERE id = ?').get(id) as { data: string } | undefined
    return row ? ResumeSchema.parse(JSON.parse(row.data)) : null
  }
  create(r: Resume): Resume {
    const v = ResumeSchema.parse(r)
    this.db.prepare('INSERT INTO resumes (id, data) VALUES (?, ?)').run(v.id, JSON.stringify(v))
    return v
  }
  update(id: string, r: Resume): Resume {
    const v = ResumeSchema.parse({ ...r, id })
    this.db.prepare('UPDATE resumes SET data = ? WHERE id = ?').run(JSON.stringify(v), id)
    return v
  }
  delete(id: string): boolean {
    return this.db.prepare('DELETE FROM resumes WHERE id = ?').run(id).changes > 0
  }
}
