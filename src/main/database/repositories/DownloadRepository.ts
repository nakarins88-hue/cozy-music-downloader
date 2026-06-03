import type { AppDatabase } from '../Database'
import type { DownloadItem, DownloadStatus } from '../../../shared/types'
import { generateId, now } from '../../utils/helpers'

interface DownloadRow {
  id: string
  url: string
  title: string | null
  artist: string | null
  album: string | null
  thumbnail: string | null
  duration: number | null
  status: string
  progress: number
  speed: string | null
  eta: string | null
  file_size: number | null
  file_path: string | null
  error: string | null
  retry_count: number
  max_retries: number
  format: string
  quality: string
  playlist_id: string | null
  playlist_index: number | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

function rowToDownload(row: DownloadRow): DownloadItem {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    artist: row.artist,
    album: row.album,
    thumbnail: row.thumbnail,
    duration: row.duration,
    status: row.status as DownloadStatus,
    progress: row.progress,
    speed: row.speed,
    eta: row.eta,
    fileSize: row.file_size,
    filePath: row.file_path,
    error: row.error,
    retryCount: row.retry_count,
    maxRetries: row.max_retries,
    format: row.format as DownloadItem['format'],
    quality: row.quality as DownloadItem['quality'],
    playlistId: row.playlist_id,
    playlistIndex: row.playlist_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at
  }
}

export class DownloadRepository {
  constructor(private db: AppDatabase) {}

  insert(item: Pick<DownloadItem, 'url' | 'format' | 'quality' | 'playlistId' | 'playlistIndex' | 'maxRetries'>): DownloadItem {
    const id = generateId()
    const ts = now()

    this.db.prepare(`
      INSERT INTO downloads (id, url, status, progress, format, quality, playlist_id, playlist_index, max_retries, created_at, updated_at)
      VALUES (?, ?, 'queued', 0, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, item.url, item.format, item.quality, item.playlistId ?? null, item.playlistIndex ?? null, item.maxRetries, ts, ts)

    return this.findById(id)!
  }

  findById(id: string): DownloadItem | null {
    const row = this.db.prepare('SELECT * FROM downloads WHERE id = ?').get(id) as DownloadRow | undefined
    return row ? rowToDownload(row) : null
  }

  update(id: string, updates: Partial<Omit<DownloadItem, 'id' | 'createdAt'>>): void {
    const fields: string[] = []
    const values: unknown[] = []

    const fieldMap: Record<string, string> = {
      url: 'url', title: 'title', artist: 'artist', album: 'album',
      thumbnail: 'thumbnail', duration: 'duration', status: 'status',
      progress: 'progress', speed: 'speed', eta: 'eta', fileSize: 'file_size',
      filePath: 'file_path', error: 'error', retryCount: 'retry_count',
      maxRetries: 'max_retries', completedAt: 'completed_at'
    }

    for (const [key, col] of Object.entries(fieldMap)) {
      if (key in updates) {
        fields.push(`${col} = ?`)
        values.push((updates as Record<string, unknown>)[key] ?? null)
      }
    }

    if (fields.length === 0) return

    fields.push('updated_at = ?')
    values.push(now())
    values.push(id)

    this.db.prepare(`UPDATE downloads SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  }

  getQueue(): DownloadItem[] {
    const rows = this.db.prepare(`
      SELECT * FROM downloads
      WHERE status IN ('queued', 'pending', 'downloading', 'processing', 'paused')
      ORDER BY created_at ASC
    `).all() as DownloadRow[]
    return rows.map(rowToDownload)
  }

  getByStatus(status: DownloadStatus | DownloadStatus[]): DownloadItem[] {
    const statuses = Array.isArray(status) ? status : [status]
    const placeholders = statuses.map(() => '?').join(',')
    const rows = this.db.prepare(
      `SELECT * FROM downloads WHERE status IN (${placeholders}) ORDER BY created_at DESC`
    ).all(...statuses) as DownloadRow[]
    return rows.map(rowToDownload)
  }

  getHistory(limit = 100, offset = 0): DownloadItem[] {
    const rows = this.db.prepare(`
      SELECT * FROM downloads
      WHERE status IN ('completed', 'failed', 'cancelled')
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset) as DownloadRow[]
    return rows.map(rowToDownload)
  }

  getAll(limit = 200, offset = 0): DownloadItem[] {
    const rows = this.db.prepare(
      'SELECT * FROM downloads ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(limit, offset) as DownloadRow[]
    return rows.map(rowToDownload)
  }

  clearCompleted(): number {
    const result = this.db.prepare(
      "DELETE FROM downloads WHERE status IN ('completed', 'cancelled')"
    ).run()
    return result.changes
  }

  deleteOlderThan(days: number): number {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const result = this.db.prepare(
      "DELETE FROM downloads WHERE status IN ('completed', 'failed', 'cancelled') AND updated_at < ?"
    ).run(cutoff.toISOString())
    return result.changes
  }

  getPendingRetries(): DownloadItem[] {
    const rows = this.db.prepare(`
      SELECT * FROM downloads
      WHERE status = 'failed' AND retry_count < max_retries
      ORDER BY updated_at ASC
    `).all() as DownloadRow[]
    return rows.map(rowToDownload)
  }
}
