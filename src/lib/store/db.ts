import Database from 'better-sqlite3'

export function openDb(path: string) {
  const db = new Database(path)
  db.exec(`CREATE TABLE IF NOT EXISTS resumes (id TEXT PRIMARY KEY, data TEXT NOT NULL)`)
  return db
}
