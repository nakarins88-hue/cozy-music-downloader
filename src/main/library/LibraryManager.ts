import { EventEmitter } from 'events'
import { readdirSync, statSync, existsSync } from 'fs'
import { join, extname } from 'path'
import type { Track, SearchQuery, SearchResult, LibraryStats } from '../../shared/types'
import type { TrackRepository } from '../database/repositories/TrackRepository'
import type { PlaylistRepository } from '../database/repositories/PlaylistRepository'
import type { SettingsRepository } from '../database/repositories/SettingsRepository'
import { MetadataService } from './MetadataService'
import { DuplicateDetector } from './DuplicateDetector'
import { SCAN_EXTENSIONS, IPC_EVENTS } from '../../shared/constants'
import { createContextLogger } from '../utils/logger'
import { getDefaultDownloadPath } from '../utils/paths'

const log = createContextLogger('LibraryManager')

export class LibraryManager extends EventEmitter {
  private isScanning = false

  constructor(
    private trackRepo: TrackRepository,
    private playlistRepo: PlaylistRepository,
    private settingsRepo: SettingsRepository,
    private metadataService: MetadataService,
    private duplicateDetector: DuplicateDetector
  ) {
    super()
  }

  getTracks(sortField?: string, sortOrder?: 'ASC' | 'DESC', limit?: number, offset?: number): Track[] {
    return this.trackRepo.getAll(sortField, sortOrder, limit, offset)
  }

  getTrack(id: string): Track | null {
    return this.trackRepo.findById(id)
  }

  search(query: SearchQuery): SearchResult {
    return this.trackRepo.search(query)
  }

  getStats(): LibraryStats & { totalPlaylists: number } {
    const stats = this.trackRepo.getStats()
    const totalPlaylists = this.playlistRepo.getAll().length
    return { ...stats, totalPlaylists }
  }

  updateTrack(id: string, updates: Partial<Omit<Track, 'id' | 'dateAdded'>>): Track | null {
    const updated = this.trackRepo.update(id, updates)
    if (updated) this.emit(IPC_EVENTS.LIBRARY_UPDATED, updated)
    return updated
  }

  async deleteTrack(id: string, deleteFile = false): Promise<boolean> {
    const track = this.trackRepo.findById(id)
    if (!track) return false

    if (deleteFile && existsSync(track.filePath)) {
      const { unlink } = await import('fs/promises')
      await unlink(track.filePath).catch(() => {})
    }

    const deleted = this.trackRepo.delete(id)
    if (deleted) this.emit(IPC_EVENTS.LIBRARY_UPDATED, null)
    return deleted
  }

  async scanDirectory(dirPath?: string): Promise<{ added: number; updated: number; errors: number }> {
    if (this.isScanning) {
      log.warn('Scan already in progress')
      return { added: 0, updated: 0, errors: 0 }
    }

    this.isScanning = true
    const settings = this.settingsRepo.getAll()
    const scanPath = dirPath || settings.downloadPath || getDefaultDownloadPath()

    if (!existsSync(scanPath)) {
      this.isScanning = false
      return { added: 0, updated: 0, errors: 0 }
    }

    log.info('Starting library scan', { path: scanPath })
    const results = { added: 0, updated: 0, errors: 0 }

    try {
      const files = this.collectAudioFiles(scanPath)
      const total = files.length
      let processed = 0

      for (const filePath of files) {
        try {
          const existing = this.trackRepo.findByPath(filePath)
          const stats = statSync(filePath)

          if (!existing) {
            const metadata = await this.metadataService.extractMetadata(filePath)
            this.trackRepo.insert({
              ...metadata,
              sourceUrl: null,
              sourceId: null,
              sourcePlatform: null,
              artworkPath: null,
              artworkUrl: null,
              fingerprint: null,
              tags: [],
              lyrics: null
            })
            results.added++
          } else if (new Date(existing.dateModified) < stats.mtime) {
            const metadata = await this.metadataService.extractMetadata(filePath)
            this.trackRepo.update(existing.id, {
              title: metadata.title,
              artist: metadata.artist,
              album: metadata.album,
              genre: metadata.genre,
              duration: metadata.duration,
              fileSize: metadata.fileSize
            })
            results.updated++
          }
        } catch (err) {
          log.error('Failed to process file during scan', undefined, { filePath, error: String(err) })
          results.errors++
        }

        processed++
        this.emit(IPC_EVENTS.LIBRARY_SCAN_PROGRESS, {
          total,
          processed,
          current: filePath,
          results
        })
      }

      this.removeDeletedTracks()
      log.info('Library scan complete', results)
    } finally {
      this.isScanning = false
    }

    return results
  }

  private collectAudioFiles(dir: string): string[] {
    const files: string[] = []

    const walk = (currentDir: string, depth = 0) => {
      if (depth > 10) return
      try {
        const entries = readdirSync(currentDir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = join(currentDir, entry.name)
          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            walk(fullPath, depth + 1)
          } else if (entry.isFile()) {
            const ext = extname(entry.name).toLowerCase()
            if (SCAN_EXTENSIONS.includes(ext)) {
              files.push(fullPath)
            }
          }
        }
      } catch {}
    }

    walk(dir)
    return files
  }

  private removeDeletedTracks(): void {
    const tracks = this.trackRepo.getAll('date_added', 'DESC', 10000, 0)
    let removed = 0
    for (const track of tracks) {
      if (!existsSync(track.filePath)) {
        this.trackRepo.delete(track.id)
        removed++
      }
    }
    if (removed > 0) log.info(`Removed ${removed} tracks with deleted files`)
  }
}
