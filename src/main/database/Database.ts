import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync } from 'fs'
import { SCHEMA_VERSION, MIGRATIONS } from './schema'
import { createContextLogger } from '../utils/logger'
import { ensureDir } from '../utils/paths'

const log = createContextLogger('Database')

export class AppDatabase {
  private db: Database.Database | null = null
  private dbPath: string

  constructor(dbPath?: string) {
    if (dbPath) {
      this.dbPath = dbPath
    } else {
      // Lazy-import electron to allow test environments without Electron installed
      const { app } = require('electron') as typeof import('electron')
      this.dbPath = join(app.getPath('userData'), 'library.db')
    }
  }

  open(): void {
    ensureDir(join(this.dbPath, '..'))

    this.db = new Database(this.dbPath, {
      verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
    })

    this.runMigrations()
    log.info('Database opened', { path: this.dbPath })
  }

  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      log.info('Database closed')
    }
  }

  get raw(): Database.Database {
    if (!this.db) throw new Error('Database not opened')
    return this.db
  }

  private runMigrations(): void {
    const db = this.raw

    db.exec(`CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`)

    const current = db
      .prepare('SELECT MAX(version) as v FROM schema_version')
      .get() as { v: number | null }
    const currentVersion = current?.v ?? 0

    for (let v = currentVersion + 1; v <= SCHEMA_VERSION; v++) {
      const migration = MIGRATIONS[v]
      if (!migration) continue

      try {
        db.exec(migration)
        db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(v)
        log.info(`Migration v${v} applied`)
      } catch (err) {
        log.error(`Migration v${v} failed`, undefined, { error: String(err) })
        throw err
      }
    }
  }

  transaction<T>(fn: () => T): T {
    return this.raw.transaction(fn)()
  }

  prepare(sql: string): Database.Statement {
    return this.raw.prepare(sql)
  }

  exec(sql: string): void {
    this.raw.exec(sql)
  }
}

let instance: AppDatabase | null = null

export function getDatabase(dbPath?: string): AppDatabase {
  if (!instance) {
    instance = new AppDatabase(dbPath)
    instance.open()
  }
  return instance
}

export function closeDatabase(): void {
  if (instance) {
    instance.close()
    instance = null
  }
}
