import type { AppDatabase } from '../Database'
import type { AppSettings } from '../../../shared/types'
import { DEFAULT_SETTINGS } from '../../../shared/constants'
import { now } from '../../utils/helpers'

export class SettingsRepository {
  constructor(private db: AppDatabase) {}

  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
    if (!row) return DEFAULT_SETTINGS[key]
    try {
      return JSON.parse(row.value) as AppSettings[K]
    } catch {
      return row.value as AppSettings[K]
    }
  }

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    const serialized = JSON.stringify(value)
    this.db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, serialized, now())
  }

  getAll(): AppSettings {
    const rows = this.db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>
    const settings = { ...DEFAULT_SETTINGS } as AppSettings

    for (const row of rows) {
      try {
        (settings as Record<string, unknown>)[row.key] = JSON.parse(row.value)
      } catch {
        (settings as Record<string, unknown>)[row.key] = row.value
      }
    }

    return settings
  }

  setAll(settings: Partial<AppSettings>): void {
    const stmt = this.db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `)

    this.db.transaction(() => {
      for (const [key, value] of Object.entries(settings)) {
        stmt.run(key, JSON.stringify(value), now())
      }
    })
  }

  reset(): void {
    this.db.prepare('DELETE FROM settings').run()
  }
}
