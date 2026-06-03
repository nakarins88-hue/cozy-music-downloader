import type { AppDatabase } from '../Database'
import type { Playlist, PlaylistTrack, Track } from '../../../shared/types'
import { generateId, now } from '../../utils/helpers'

interface PlaylistRow {
  id: string
  name: string
  description: string | null
  source_url: string | null
  source_platform: string | null
  artwork_path: string | null
  artwork_url: string | null
  track_count: number
  total_duration: number
  last_synced: string | null
  sync_enabled: number
  sync_interval: number
  created_at: string
  updated_at: string
}

function rowToPlaylist(row: PlaylistRow): Playlist {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sourceUrl: row.source_url,
    sourcePlatform: row.source_platform,
    artworkPath: row.artwork_path,
    artworkUrl: row.artwork_url,
    trackCount: row.track_count,
    totalDuration: row.total_duration,
    lastSynced: row.last_synced,
    syncEnabled: Boolean(row.sync_enabled),
    syncInterval: row.sync_interval,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export class PlaylistRepository {
  constructor(private db: AppDatabase) {}

  insert(data: Pick<Playlist, 'name' | 'description' | 'sourceUrl' | 'sourcePlatform' | 'artworkUrl' | 'syncEnabled' | 'syncInterval'>): Playlist {
    const id = generateId()
    const ts = now()

    this.db.prepare(`
      INSERT INTO playlists (id, name, description, source_url, source_platform, artwork_url, sync_enabled, sync_interval, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.description ?? null, data.sourceUrl ?? null, data.sourcePlatform ?? null, data.artworkUrl ?? null, data.syncEnabled ? 1 : 0, data.syncInterval || 86400, ts, ts)

    return this.findById(id)!
  }

  findById(id: string): Playlist | null {
    const row = this.db.prepare('SELECT * FROM playlists WHERE id = ?').get(id) as PlaylistRow | undefined
    return row ? rowToPlaylist(row) : null
  }

  findBySourceUrl(url: string): Playlist | null {
    const row = this.db.prepare('SELECT * FROM playlists WHERE source_url = ?').get(url) as PlaylistRow | undefined
    return row ? rowToPlaylist(row) : null
  }

  getAll(): Playlist[] {
    const rows = this.db.prepare('SELECT * FROM playlists ORDER BY updated_at DESC').all() as PlaylistRow[]
    return rows.map(rowToPlaylist)
  }

  update(id: string, updates: Partial<Omit<Playlist, 'id' | 'createdAt'>>): Playlist | null {
    const fields: string[] = []
    const values: unknown[] = []

    const map: Record<string, string> = {
      name: 'name', description: 'description', sourceUrl: 'source_url',
      sourcePlatform: 'source_platform', artworkPath: 'artwork_path', artworkUrl: 'artwork_url',
      trackCount: 'track_count', totalDuration: 'total_duration', lastSynced: 'last_synced',
      syncEnabled: 'sync_enabled', syncInterval: 'sync_interval'
    }

    for (const [key, col] of Object.entries(map)) {
      if (key in updates) {
        fields.push(`${col} = ?`)
        const val = (updates as Record<string, unknown>)[key]
        values.push(key === 'syncEnabled' ? (val ? 1 : 0) : (val ?? null))
      }
    }

    if (fields.length === 0) return this.findById(id)

    fields.push('updated_at = ?')
    values.push(now())
    values.push(id)

    this.db.prepare(`UPDATE playlists SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return this.findById(id)
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM playlists WHERE id = ?').run(id)
    return result.changes > 0
  }

  addTrack(playlistId: string, trackId: string, position?: number): void {
    const pos = position ?? (this.getTrackCount(playlistId))
    this.db.prepare(`
      INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position, added_at)
      VALUES (?, ?, ?, ?)
    `).run(playlistId, trackId, pos, now())
    this.updateStats(playlistId)
  }

  removeTrack(playlistId: string, trackId: string): void {
    this.db.prepare('DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?').run(playlistId, trackId)
    this.updateStats(playlistId)
  }

  getTrackCount(playlistId: string): number {
    const row = this.db.prepare('SELECT COUNT(*) as c FROM playlist_tracks WHERE playlist_id = ?').get(playlistId) as { c: number }
    return row.c
  }

  getTrackIds(playlistId: string): string[] {
    const rows = this.db.prepare(
      'SELECT track_id FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC'
    ).all(playlistId) as Array<{ track_id: string }>
    return rows.map((r) => r.track_id)
  }

  reorderTracks(playlistId: string, trackIds: string[]): void {
    const stmt = this.db.prepare('UPDATE playlist_tracks SET position = ? WHERE playlist_id = ? AND track_id = ?')
    this.db.transaction(() => {
      trackIds.forEach((id, idx) => stmt.run(idx, playlistId, id))
    })
  }

  private updateStats(playlistId: string): void {
    const stats = this.db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(t.duration), 0) as duration
      FROM playlist_tracks pt
      JOIN tracks t ON t.id = pt.track_id
      WHERE pt.playlist_id = ?
    `).get(playlistId) as { count: number; duration: number }

    this.db.prepare('UPDATE playlists SET track_count = ?, total_duration = ?, updated_at = ? WHERE id = ?')
      .run(stats.count, stats.duration, now(), playlistId)
  }

  getSyncable(): Playlist[] {
    const rows = this.db.prepare(
      'SELECT * FROM playlists WHERE sync_enabled = 1 AND source_url IS NOT NULL'
    ).all() as PlaylistRow[]
    return rows.map(rowToPlaylist)
  }
}
