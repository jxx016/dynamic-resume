import type { Database } from 'better-sqlite3'
import { ApplicationSchema, type Application } from '@/lib/schema/application'
import { openDb } from './db'
import type { ApplicationStore } from './application-store'

export class SqliteApplicationStore implements ApplicationStore {
  private db: Database

  constructor(dbPath: string) { this.db = openDb(dbPath) }

  list(): Application[] {
    const rows = this.db.prepare('SELECT data FROM applications ORDER BY rowid DESC').all() as { data: string }[]
    return rows.map(row => ApplicationSchema.parse(JSON.parse(row.data)))
  }

  get(id: string): Application | null {
    const row = this.db.prepare('SELECT data FROM applications WHERE id = ?').get(id) as { data: string } | undefined
    return row ? ApplicationSchema.parse(JSON.parse(row.data)) : null
  }

  create(application: Application): Application {
    const value = ApplicationSchema.parse(application)
    this.db.prepare('INSERT INTO applications (id, data) VALUES (?, ?)').run(value.id, JSON.stringify(value))
    return value
  }

  update(id: string, application: Application): Application {
    const value = ApplicationSchema.parse({ ...application, id })
    this.db.prepare('UPDATE applications SET data = ? WHERE id = ?').run(JSON.stringify(value), id)
    return value
  }
}
