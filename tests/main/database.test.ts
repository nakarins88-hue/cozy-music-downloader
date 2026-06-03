import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { rmSync, mkdirSync } from 'fs'
import { AppDatabase } from '../../src/main/database/Database'
import { TrackRepository } from '../../src/main/database/repositories/TrackRepository'
import { DownloadRepository } from '../../src/main/database/repositories/DownloadRepository'
import { PlaylistRepository } from '../../src/main/database/repositories/PlaylistRepository'
import { SettingsRepository } from '../../src/main/database/repositories/SettingsRepository'

const TEST_DIR = join(tmpdir(), `cozy-test-${Date.now()}`)
let db: AppDatabase

function makeDb(name: string): AppDatabase {
  mkdirSync(TEST_DIR, { recursive: true })
  const d = new AppDatabase(join(TEST_DIR, name))
  d.open()
  return d
}

describe('Database', () => {
  beforeEach(() => {
    db = makeDb('test.db')
  })

  afterEach(() => {
    db.close()
    try { rmSync(TEST_DIR, { recursive: true, force: true }) } catch {}
  })

  it('opens and creates schema', () => {
    expect(db.raw).toBeTruthy()
    const tables = db.raw.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all() as Array<{ name: string }>
    const names = tables.map((t) => t.name)
    expect(names).toContain('tracks')
    expect(names).toContain('downloads')
    expect(names).toContain('playlists')
    expect(names).toContain('settings')
  })
})

describe('TrackRepository', () => {
  let repo: TrackRepository

  beforeEach(() => {
    db = makeDb('tracks.db')
    repo = new TrackRepository(db)
  })

  afterEach(() => {
    db.close()
    try { rmSync(TEST_DIR, { recursive: true, force: true }) } catch {}
  })

  const sampleTrack = {
    title: 'Test Song',
    artist: 'Test Artist',
    album: 'Test Album',
    albumArtist: 'Test Artist',
    year: 2024,
    genre: 'Rock',
    duration: 180,
    filePath: '/tmp/test.mp3',
    fileSize: 1024 * 1024 * 5,
    format: 'mp3',
    bitrate: 320,
    sampleRate: 44100,
    channels: 2,
    artworkUrl: null,
    comment: null
  }

  it('inserts and retrieves a track', () => {
    const track = repo.insert(sampleTrack)
    expect(track.id).toBeTruthy()
    expect(track.title).toBe('Test Song')

    const found = repo.findById(track.id)
    expect(found).not.toBeNull()
    expect(found!.title).toBe('Test Song')
    expect(found!.artist).toBe('Test Artist')
  })

  it('finds by path', () => {
    repo.insert(sampleTrack)
    const found = repo.findByPath('/tmp/test.mp3')
    expect(found).not.toBeNull()
    expect(found!.title).toBe('Test Song')
  })

  it('updates a track', () => {
    const track = repo.insert(sampleTrack)
    const updated = repo.update(track.id, { title: 'Updated Title' })
    expect(updated!.title).toBe('Updated Title')
    expect(updated!.artist).toBe('Test Artist')
  })

  it('deletes a track', () => {
    const track = repo.insert(sampleTrack)
    const deleted = repo.delete(track.id)
    expect(deleted).toBe(true)
    expect(repo.findById(track.id)).toBeNull()
  })

  it('detects duplicate by metadata', () => {
    repo.insert(sampleTrack)
    const dup = repo.findDuplicateByMetadata('Test Song', 'Test Artist')
    expect(dup).not.toBeNull()

    const notDup = repo.findDuplicateByMetadata('Different Song', 'Test Artist')
    expect(notDup).toBeNull()
  })

  it('gets stats', () => {
    repo.insert(sampleTrack)
    repo.insert({ ...sampleTrack, title: 'Track 2', filePath: '/tmp/test2.mp3', artist: 'Other Artist' })
    const stats = repo.getStats()
    expect(stats.totalTracks).toBe(2)
    expect(stats.totalArtists).toBe(2)
  })

  it('searches tracks', () => {
    repo.insert(sampleTrack)
    repo.insert({ ...sampleTrack, title: 'Another Song', filePath: '/tmp/test3.mp3' })

    const results = repo.search({ query: '', limit: 10, offset: 0 })
    expect(results.total).toBe(2)
    expect(results.tracks.length).toBe(2)
  })
})

describe('DownloadRepository', () => {
  let repo: DownloadRepository

  beforeEach(() => {
    db = makeDb('downloads.db')
    repo = new DownloadRepository(db)
  })

  afterEach(() => {
    db.close()
    try { rmSync(TEST_DIR, { recursive: true, force: true }) } catch {}
  })

  it('creates and retrieves downloads', () => {
    const item = repo.insert({
      url: 'https://youtube.com/watch?v=test',
      format: 'mp3',
      quality: '0',
      playlistId: null,
      playlistIndex: null,
      maxRetries: 3
    })

    expect(item.id).toBeTruthy()
    expect(item.status).toBe('queued')
    expect(item.url).toBe('https://youtube.com/watch?v=test')
  })

  it('updates download status', () => {
    const item = repo.insert({
      url: 'https://youtube.com/watch?v=test2',
      format: 'mp3',
      quality: '0',
      playlistId: null,
      playlistIndex: null,
      maxRetries: 3
    })

    repo.update(item.id, { status: 'downloading', progress: 50 })
    const updated = repo.findById(item.id)!
    expect(updated.status).toBe('downloading')
    expect(updated.progress).toBe(50)
  })

  it('clears completed downloads', () => {
    const item1 = repo.insert({ url: 'https://yt.com/1', format: 'mp3', quality: '0', playlistId: null, playlistIndex: null, maxRetries: 3 })
    const item2 = repo.insert({ url: 'https://yt.com/2', format: 'mp3', quality: '0', playlistId: null, playlistIndex: null, maxRetries: 3 })

    repo.update(item1.id, { status: 'completed' })
    const cleared = repo.clearCompleted()
    expect(cleared).toBe(1)
    expect(repo.findById(item2.id)).not.toBeNull()
  })

  it('gets queue (active downloads only)', () => {
    const item1 = repo.insert({ url: 'https://yt.com/q1', format: 'mp3', quality: '0', playlistId: null, playlistIndex: null, maxRetries: 3 })
    const item2 = repo.insert({ url: 'https://yt.com/q2', format: 'mp3', quality: '0', playlistId: null, playlistIndex: null, maxRetries: 3 })
    repo.update(item2.id, { status: 'completed' })

    const queue = repo.getQueue()
    expect(queue.length).toBe(1)
    expect(queue[0].id).toBe(item1.id)
  })
})

describe('SettingsRepository', () => {
  let repo: SettingsRepository

  beforeEach(() => {
    db = makeDb('settings.db')
    repo = new SettingsRepository(db)
  })

  afterEach(() => {
    db.close()
    try { rmSync(TEST_DIR, { recursive: true, force: true }) } catch {}
  })

  it('returns defaults when no settings are set', () => {
    const settings = repo.getAll()
    expect(settings.audioFormat).toBe('mp3')
    expect(settings.maxConcurrentDownloads).toBe(3)
  })

  it('saves and retrieves settings', () => {
    repo.set('audioFormat', 'flac')
    expect(repo.get('audioFormat')).toBe('flac')
  })

  it('setAll updates multiple settings', () => {
    repo.setAll({ audioFormat: 'opus', audioQuality: '2', maxConcurrentDownloads: 5 })
    const settings = repo.getAll()
    expect(settings.audioFormat).toBe('opus')
    expect(settings.audioQuality).toBe('2')
    expect(settings.maxConcurrentDownloads).toBe(5)
  })

  it('reset clears all settings', () => {
    repo.set('audioFormat', 'flac')
    repo.reset()
    expect(repo.get('audioFormat')).toBe('mp3')
  })
})
