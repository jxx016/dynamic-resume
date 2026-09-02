import type { Database } from 'better-sqlite3'
import { ProfileSchema, type Profile } from '@/lib/schema/profile'
import { emptyProfile } from '@/lib/profile/profile-service'
import { openDb } from './db'
import type { ProfileStore } from './profile-store'
export class SqliteProfileStore implements ProfileStore {
  private db: Database
  constructor(dbPath: string) { this.db = openDb(dbPath) }
  get(): Profile { const row = this.db.prepare('SELECT data FROM profiles WHERE id = ?').get('profile') as { data: string } | undefined; return row ? ProfileSchema.parse(JSON.parse(row.data)) : emptyProfile() }
  replace(profile: Profile): Profile { const value = ProfileSchema.parse(profile); this.db.prepare('INSERT INTO profiles (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data').run(value.id, JSON.stringify(value)); return value }
}
