import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

export function openDb(dbPath: string) {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  }
  const db = new Database(dbPath)
  db.exec(`CREATE TABLE IF NOT EXISTS resumes (id TEXT PRIMARY KEY, data TEXT NOT NULL)`)
  db.exec(`CREATE TABLE IF NOT EXISTS applications (id TEXT PRIMARY KEY, data TEXT NOT NULL)`)
  db.exec(`CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, data TEXT NOT NULL)`)
  return db
}
