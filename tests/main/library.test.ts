import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { rmSync, mkdirSync, writeFileSync } from 'fs'
import { AppDatabase } from '../../src/main/database/Database'
import { TrackRepository } from '../../src/main/database/repositories/TrackRepository'
import { DuplicateDetector } from '../../src/main/library/DuplicateDetector'
import { FileOrganizer } from '../../src/main/library/FileOrganizer'
import { MetadataService } from '../../src/main/library/MetadataService'

const TEST_DIR = join(tmpdir(), `cozy-lib-test-${Date.now()}`)
let db: AppDatabase

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true })
  db = new AppDatabase(join(TEST_DIR, 'test.db'))
  db.open()
})

afterEach(() => {
  db.close()
  try { rmSync(TEST_DIR, { recursive: true, force: true }) } catch {}
})

describe('DuplicateDetector', () => {
  it('detects metadata duplicates', async () => {
    const repo = new TrackRepository(db)
    const detector = new DuplicateDetector(repo)

    repo.insert({
      title: 'Duplicate Song',
      artist: 'Same Artist',
      album: 'Album',
      albumArtist: 'Same Artist',
      year: null,
      genre: '',
      duration: 200,
      filePath: '/tmp/dup.mp3',
      fileSize: 1000,
      format: 'mp3',
      bitrate: 192,
      sampleRate: 44100,
      channels: 2,
      artworkUrl: null,
      comment: null
    })

    const result = await detector.check({
      title: 'Duplicate Song',
      artist: 'Same Artist',
      album: 'Album',
      albumArtist: 'Same Artist',
      year: null,
      genre: '',
      duration: 200,
      filePath: '/tmp/new.mp3',
      fileSize: 1000,
      format: 'mp3',
      bitrate: 192,
      sampleRate: 44100,
      channels: 2,
      artworkUrl: null,
      comment: null
    })

    expect(result.isDuplicate).toBe(true)
    expect(result.matchType).toBe('metadata')
  })

  it('returns non-duplicate for unique track', async () => {
    const repo = new TrackRepository(db)
    const detector = new DuplicateDetector(repo)

    const result = await detector.check({
      title: 'Unique Song',
      artist: 'New Artist',
      album: '',
      albumArtist: '',
      year: null,
      genre: '',
      duration: 180,
      filePath: '/tmp/unique.mp3',
      fileSize: 1000,
      format: 'mp3',
      bitrate: 192,
      sampleRate: 44100,
      channels: 2,
      artworkUrl: null,
      comment: null
    })

    expect(result.isDuplicate).toBe(false)
  })
})

describe('MetadataService', () => {
  it('extracts fallback metadata from filename', async () => {
    const service = new MetadataService()
    const fakePath = join(TEST_DIR, '01 - My Test Track.mp3')
    writeFileSync(fakePath, Buffer.alloc(1024 * 100))

    const meta = await service.extractMetadata(fakePath)
    expect(meta.filePath).toBe(fakePath)
    expect(meta.format).toBe('mp3')
    expect(meta.fileSize).toBeGreaterThan(0)
  })
})

describe('FileOrganizer', () => {
  it('resolves file conflicts with counter suffix', async () => {
    const organizer = new FileOrganizer()
    const src = join(TEST_DIR, 'source.mp3')
    const destDir = join(TEST_DIR, 'dest')
    mkdirSync(destDir, { recursive: true })
    writeFileSync(src, 'test content')

    const settings = {
      downloadPath: destDir,
      tempPath: TEST_DIR,
      audioFormat: 'mp3' as const,
      audioQuality: '0' as const,
      maxConcurrentDownloads: 3,
      maxRetries: 3,
      retryDelay: 5000,
      embedArtwork: true,
      embedMetadata: true,
      fileOrganization: {
        enabled: true,
        pattern: '{title}',
        sanitizeNames: true,
        createArtistFolder: false,
        createAlbumFolder: false
      },
      deduplicationEnabled: false,
      deduplicationStrategy: 'skip' as const,
      theme: 'dark' as const,
      language: 'en',
      notifications: true,
      minimizeToTray: false,
      startMinimized: false,
      ytdlpPath: 'yt-dlp',
      ffmpegPath: 'ffmpeg',
      proxyUrl: null,
      rateLimit: null,
      cookiesPath: null,
      cleanupEnabled: false,
      cleanupDays: 30,
      logLevel: 'info' as const,
      logRetentionDays: 7
    }

    const meta = {
      title: 'My Song',
      artist: 'Artist',
      album: '',
      albumArtist: '',
      year: null,
      genre: '',
      duration: 180,
      filePath: src,
      fileSize: 1024,
      format: 'mp3',
      bitrate: 192,
      sampleRate: 44100,
      channels: 2,
      artworkUrl: null,
      comment: null
    }

    const dest = await organizer.organize(src, meta, settings)
    expect(dest).toContain('My Song')
    expect(dest).toContain('.mp3')
  })
})
