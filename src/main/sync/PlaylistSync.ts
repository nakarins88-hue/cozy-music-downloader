import { join } from 'path'
import { existsSync, writeFileSync } from 'fs'
import { unlink } from 'fs/promises'
import type { Playlist } from '../../shared/types'
import type { PlaylistRepository } from '../database/repositories/PlaylistRepository'
import type { SettingsRepository } from '../database/repositories/SettingsRepository'
import { YtDlpWrapper } from '../downloader/YtDlpWrapper'
import { createContextLogger } from '../utils/logger'
import { now } from '../utils/helpers'
import { ensureDir, getDefaultDownloadPath } from '../utils/paths'

const log = createContextLogger('PlaylistSync')

export class PlaylistSync {
  private ytdlp: YtDlpWrapper
  private syncTimers = new Map<string, NodeJS.Timeout>()

  constructor(
    private playlistRepo: PlaylistRepository,
    private settingsRepo: SettingsRepository
  ) {
    const settings = settingsRepo.getAll()
    this.ytdlp = new YtDlpWrapper(settings.ytdlpPath || YtDlpWrapper.getBundledPath())
  }

  startAutoSync(): void {
    const playlists = this.playlistRepo.getSyncable()
    for (const playlist of playlists) {
      this.scheduleSync(playlist)
    }
    log.info(`Auto-sync scheduled for ${playlists.length} playlists`)
  }

  stopAutoSync(): void {
    for (const timer of this.syncTimers.values()) {
      clearInterval(timer)
    }
    this.syncTimers.clear()
  }

  scheduleSync(playlist: Playlist): void {
    if (this.syncTimers.has(playlist.id)) {
      clearInterval(this.syncTimers.get(playlist.id)!)
    }

    const timer = setInterval(
      () => this.syncPlaylist(playlist.id),
      playlist.syncInterval * 1000
    )
    this.syncTimers.set(playlist.id, timer)
  }

  unscheduleSync(playlistId: string): void {
    const timer = this.syncTimers.get(playlistId)
    if (timer) {
      clearInterval(timer)
      this.syncTimers.delete(playlistId)
    }
  }

  async syncPlaylist(
    playlistId: string,
    onProgress?: (index: number, total: number) => void
  ): Promise<{ added: number; skipped: number }> {
    const playlist = this.playlistRepo.findById(playlistId)
    if (!playlist?.sourceUrl) {
      return { added: 0, skipped: 0 }
    }

    log.info('Syncing playlist', { name: playlist.name, url: playlist.sourceUrl })

    const settings = this.settingsRepo.getAll()
    const downloadPath = settings.downloadPath || getDefaultDownloadPath()
    const archivePath = join(downloadPath, '.archives', `${playlistId}.txt`)
    ensureDir(join(downloadPath, '.archives'))

    let added = 0
    let skipped = 0

    try {
      const result = await this.ytdlp.downloadPlaylist(
        playlist.sourceUrl,
        downloadPath,
        settings.audioFormat,
        settings.audioQuality,
        archivePath,
        {
          embedArtwork: settings.embedArtwork,
          embedMetadata: settings.embedMetadata,
          cookiesPath: settings.cookiesPath,
          proxyUrl: settings.proxyUrl
        },
        (title, index, total) => {
          if (onProgress) onProgress(index, total)
        }
      )

      added = result.added
      skipped = result.skipped
      this.playlistRepo.update(playlistId, { lastSynced: now() })
      log.info('Playlist sync complete', { name: playlist.name, added, skipped })
    } catch (err) {
      log.error('Playlist sync failed', undefined, { name: playlist.name, error: String(err) })
    }

    return { added, skipped }
  }

  async getPlaylistInfo(url: string): Promise<{ title: string; trackCount: number; thumbnailUrl: string | null } | null> {
    try {
      const info = await this.ytdlp.getInfo(url)
      if (info.entries) {
        return {
          title: info.title || 'Unknown Playlist',
          trackCount: info.entries.length,
          thumbnailUrl: info.thumbnail || null
        }
      }
      return null
    } catch (err) {
      log.warn('Failed to get playlist info', { url, error: String(err) })
      return null
    }
  }
}
