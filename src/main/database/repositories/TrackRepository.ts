import type { AppDatabase } from '../Database'
import type { Track, SearchQuery, SearchResult } from '../../../shared/types'
import { generateId, now } from '../../utils/helpers'

interface TrackRow {
  id: string
  title: string
  artist: string
  album: string
  album_artist: string
  year: number | null
  genre: string
  duration: number
  file_path: string
  file_size: number
  format: string
  bitrate: number
  sample_rate: number
  channels: number
  artwork_path: string | null
  artwork_url: string | null
  source_url: string | null
  source_id: string | null
  source_platform: string | null
  play_count: number
  last_played: string | null
  date_added: string
  date_modified: string
  fingerprint: string | null
  tags: string
  lyrics: string | null
  comment: string | null
}

function rowToTrack(row: TrackRow): Track {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    album: row.album,
    albumArtist: row.album_artist,
    year: row.year,
    genre: row.genre,
    duration: row.duration,
    filePath: row.file_path,
    fileSize: row.file_size,
    format: row.format,
    bitrate: row.bitrate,
    sampleRate: row.sample_rate,
    channels: row.channels,
    artworkPath: row.artwork_path,
    artworkUrl: row.artwork_url,
    sourceUrl: row.source_url,
    sourceId: row.source_id,
    sourcePlatform: row.source_platform,
    playCount: row.play_count,
    lastPlayed: row.last_played,
    dateAdded: row.date_added,
    dateModified: row.date_modified,
    fingerprint: row.fingerprint,
    tags: JSON.parse(row.tags || '[]'),
    lyrics: row.lyrics,
    comment: row.comment
  }
}

export class TrackRepository {
  constructor(private db: AppDatabase) {}

  insert(track: Omit<Track, 'id' | 'dateAdded' | 'dateModified' | 'playCount'>): Track {
    const id = generateId()
    const ts = now()

    this.db.prepare(`
      INSERT INTO tracks (
        id, title, artist, album, album_artist, year, genre, duration,
        file_path, file_size, format, bitrate, sample_rate, channels,
        artwork_path, artwork_url, source_url, source_id, source_platform,
        play_count, date_added, date_modified, fingerprint, tags, lyrics, comment
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `).run(
      id, track.title, track.artist, track.album, track.albumArtist,
      track.year, track.genre, track.duration, track.filePath, track.fileSize,
      track.format, track.bitrate, track.sampleRate, track.channels,
      track.artworkPath, track.artworkUrl, track.sourceUrl, track.sourceId,
      track.sourcePlatform, 0, ts, ts,
      track.fingerprint, JSON.stringify(track.tags || []),
      track.lyrics, track.comment
    )

    return this.findById(id)!
  }

  findById(id: string): Track | null {
    const row = this.db.prepare('SELECT * FROM tracks WHERE id = ?').get(id) as TrackRow | undefined
    return row ? rowToTrack(row) : null
  }

  findByPath(filePath: string): Track | null {
    const row = this.db.prepare('SELECT * FROM tracks WHERE file_path = ?').get(filePath) as TrackRow | undefined
    return row ? rowToTrack(row) : null
  }

  findBySourceId(sourceId: string): Track | null {
    const row = this.db.prepare('SELECT * FROM tracks WHERE source_id = ?').get(sourceId) as TrackRow | undefined
    return row ? rowToTrack(row) : null
  }

  findByFingerprint(fingerprint: string): Track | null {
    const row = this.db.prepare('SELECT * FROM tracks WHERE fingerprint = ?').get(fingerprint) as TrackRow | undefined
    return row ? rowToTrack(row) : null
  }

  findDuplicateByMetadata(title: string, artist: string): Track | null {
    const row = this.db.prepare(`
      SELECT * FROM tracks
      WHERE lower(title) = lower(?) AND lower(artist) = lower(?)
      LIMIT 1
    `).get(title, artist) as TrackRow | undefined
    return row ? rowToTrack(row) : null
  }

  update(id: string, updates: Partial<Omit<Track, 'id' | 'dateAdded'>>): Track | null {
    const track = this.findById(id)
    if (!track) return null

    const fields: string[] = []
    const values: unknown[] = []

    const fieldMap: Record<string, string> = {
      title: 'title', artist: 'artist', album: 'album',
      albumArtist: 'album_artist', year: 'year', genre: 'genre',
      duration: 'duration', filePath: 'file_path', fileSize: 'file_size',
      format: 'format', bitrate: 'bitrate', sampleRate: 'sample_rate',
      channels: 'channels', artworkPath: 'artwork_path', artworkUrl: 'artwork_url',
      sourceUrl: 'source_url', sourceId: 'source_id', sourcePlatform: 'source_platform',
      playCount: 'play_count', lastPlayed: 'last_played', fingerprint: 'fingerprint',
      lyrics: 'lyrics', comment: 'comment'
    }

    for (const [key, col] of Object.entries(fieldMap)) {
      if (key in updates) {
        fields.push(`${col} = ?`)
        const val = (updates as Record<string, unknown>)[key]
        values.push(key === 'tags' ? JSON.stringify(val) : val)
      }
    }

    if ('tags' in updates) {
      fields.push('tags = ?')
      values.push(JSON.stringify(updates.tags))
    }

    if (fields.length === 0) return track

    fields.push('date_modified = ?')
    values.push(now())
    values.push(id)

    this.db.prepare(`UPDATE tracks SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return this.findById(id)
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM tracks WHERE id = ?').run(id)
    return result.changes > 0
  }

  search(query: SearchQuery): SearchResult {
    const conditions: string[] = []
    const params: unknown[] = []

    if (query.query) {
      conditions.push(`id IN (
        SELECT id FROM tracks_fts WHERE tracks_fts MATCH ?
      )`)
      params.push(query.query + '*')
    }

    if (query.artist) {
      conditions.push('lower(artist) LIKE ?')
      params.push(`%${query.artist.toLowerCase()}%`)
    }

    if (query.album) {
      conditions.push('lower(album) LIKE ?')
      params.push(`%${query.album.toLowerCase()}%`)
    }

    if (query.genre) {
      conditions.push('lower(genre) = ?')
      params.push(query.genre.toLowerCase())
    }

    if (query.year) {
      conditions.push('year = ?')
      params.push(query.year)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const sortField = query.sortField || 'dateAdded'
    const sortOrder = query.sortOrder || 'desc'
    const fieldMap: Record<string, string> = {
      title: 'title', artist: 'artist', album: 'album',
      duration: 'duration', dateAdded: 'date_added', playCount: 'play_count'
    }
    const orderBy = `ORDER BY ${fieldMap[sortField] || 'date_added'} ${sortOrder.toUpperCase()}`
    const limit = query.limit || 50
    const offset = query.offset || 0

    const total = (this.db.prepare(`SELECT COUNT(*) as count FROM tracks ${where}`).get(...params) as { count: number }).count

    const rows = this.db.prepare(`SELECT * FROM tracks ${where} ${orderBy} LIMIT ? OFFSET ?`).all(...params, limit, offset) as TrackRow[]

    return {
      tracks: rows.map(rowToTrack),
      total,
      offset,
      limit
    }
  }

  getAll(sortField = 'date_added', sortOrder = 'DESC', limit = 1000, offset = 0): Track[] {
    const rows = this.db.prepare(
      `SELECT * FROM tracks ORDER BY ${sortField} ${sortOrder} LIMIT ? OFFSET ?`
    ).all(limit, offset) as TrackRow[]
    return rows.map(rowToTrack)
  }

  getStats() {
    const total = (this.db.prepare('SELECT COUNT(*) as c FROM tracks').get() as { c: number }).c
    const duration = (this.db.prepare('SELECT SUM(duration) as d FROM tracks').get() as { d: number | null }).d || 0
    const size = (this.db.prepare('SELECT SUM(file_size) as s FROM tracks').get() as { s: number | null }).s || 0
    const artists = (this.db.prepare('SELECT COUNT(DISTINCT artist) as c FROM tracks').get() as { c: number }).c
    const albums = (this.db.prepare('SELECT COUNT(DISTINCT album) as c FROM tracks').get() as { c: number }).c

    const topArtists = this.db.prepare(
      'SELECT artist, COUNT(*) as count FROM tracks GROUP BY artist ORDER BY count DESC LIMIT 10'
    ).all() as Array<{ artist: string; count: number }>

    const topGenres = this.db.prepare(
      "SELECT genre, COUNT(*) as count FROM tracks WHERE genre != '' GROUP BY genre ORDER BY count DESC LIMIT 10"
    ).all() as Array<{ genre: string; count: number }>

    const recentRows = this.db.prepare(
      'SELECT * FROM tracks ORDER BY date_added DESC LIMIT 20'
    ).all() as TrackRow[]

    return {
      totalTracks: total,
      totalDuration: duration,
      totalSize: size,
      totalArtists: artists,
      totalAlbums: albums,
      topArtists,
      topGenres,
      recentlyAdded: recentRows.map(rowToTrack)
    }
  }

  incrementPlayCount(id: string): void {
    this.db.prepare(`
      UPDATE tracks SET play_count = play_count + 1, last_played = ? WHERE id = ?
    `).run(now(), id)
  }
}
