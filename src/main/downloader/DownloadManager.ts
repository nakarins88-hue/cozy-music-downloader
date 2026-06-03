import PQueue from 'p-queue'
import { EventEmitter } from 'events'
import { existsSync, mkdirSync, readdirSync, statSync } from 'fs'
import { join, extname, basename } from 'path'
import { rename, unlink } from 'fs/promises'
import type { DownloadItem, AppSettings, BatchDownloadRequest } from '../../shared/types'
import type { DownloadRepository } from '../database/repositories/DownloadRepository'
import type { TrackRepository } from '../database/repositories/TrackRepository'
import type { SettingsRepository } from '../database/repositories/SettingsRepository'
import { YtDlpWrapper } from './YtDlpWrapper'
import { createContextLogger } from '../utils/logger'
import { generateId, now, exponentialBackoff, sleep } from '../utils/helpers'
import { ensureDir, buildFilePath, getDefaultDownloadPath, getDefaultTempPath } from '../utils/paths'
import { MetadataService } from '../library/MetadataService'
import { DuplicateDetector } from '../library/DuplicateDetector'
import { FileOrganizer } from '../library/FileOrganizer'
import { IPC_EVENTS } from '../../shared/constants'

const log = createContextLogger('DownloadManager')

export class DownloadManager extends EventEmitter {
  private queue: PQueue
  private activeControllers = new Map<string, AbortController>()
  private ytdlp: YtDlpWrapper
  private isInitialized = false

  constructor(
    private downloadRepo: DownloadRepository,
    private trackRepo: TrackRepository,
    private settingsRepo: SettingsRepository,
    private metadataService: MetadataService,
    private duplicateDetector: DuplicateDetector,
    private fileOrganizer: FileOrganizer
  ) {
    super()
    const settings = settingsRepo.getAll()
    this.queue = new PQueue({ concurrency: settings.maxConcurrentDownloads })
    this.ytdlp = new YtDlpWrapper(settings.ytdlpPath || YtDlpWrapper.getBundledPath())
  }

  initialize(): void {
    if (this.isInitialized) return
    this.isInitialized = true
    this.resumeInterrupted()
    log.info('DownloadManager initialized')
  }

  private resumeInterrupted(): void {
    const interrupted = this.downloadRepo.getByStatus(['downloading', 'processing', 'pending'])
    for (const item of interrupted) {
      this.downloadRepo.update(item.id, { status: 'queued', progress: 0 })
      this.enqueue(item.id)
    }

    const queued = this.downloadRepo.getByStatus('queued')
    for (const item of queued) {
      this.enqueue(item.id)
    }

    log.info(`Resumed ${interrupted.length + queued.length} downloads`)
  }

  async addDownload(url: string, options?: Partial<Pick<DownloadItem, 'format' | 'quality' | 'playlistId' | 'playlistIndex'>>): Promise<DownloadItem> {
    const settings = this.settingsRepo.getAll()
    const item = this.downloadRepo.insert({
      url: url.trim(),
      format: options?.format || settings.audioFormat,
      quality: options?.quality || settings.audioQuality,
      playlistId: options?.playlistId || null,
      playlistIndex: options?.playlistIndex || null,
      maxRetries: settings.maxRetries
    })

    this.emit(IPC_EVENTS.DOWNLOAD_PROGRESS, item)
    this.enqueue(item.id)
    return item
  }

  async addBatch(request: BatchDownloadRequest): Promise<DownloadItem[]> {
    const items: DownloadItem[] = []
    for (const url of request.urls) {
      if (url.trim()) {
        const item = await this.addDownload(url, {
          format: request.format,
          quality: request.quality,
          playlistId: request.playlistId
        })
        items.push(item)
      }
    }
    return items
  }

  private enqueue(id: string): void {
    this.queue.add(() => this.processDownload(id))
  }

  private async processDownload(id: string): Promise<void> {
    const item = this.downloadRepo.findById(id)
    if (!item || item.status === 'cancelled') return

    const controller = new AbortController()
    this.activeControllers.set(id, controller)

    try {
      this.downloadRepo.update(id, { status: 'pending', progress: 0 })
      this.emitProgress(id)

      const info = await this.getInfo(id, item.url)
      if (!info) return

      await this.executeDownload(id, item, info, controller.signal)
    } catch (err) {
      if (!controller.signal.aborted) {
        await this.handleError(id, err)
      }
    } finally {
      this.activeControllers.delete(id)
    }
  }

  private async getInfo(id: string, url: string): Promise<ReturnType<YtDlpWrapper['getInfo']> extends Promise<infer T> ? T : never | null> {
    try {
      return await this.ytdlp.getInfo(url) as Awaited<ReturnType<YtDlpWrapper['getInfo']>>
    } catch (err) {
      log.warn('Could not get info, will try download anyway', { id, error: String(err) })
      return null
    }
  }

  private async executeDownload(id: string, item: DownloadItem, info: Awaited<ReturnType<YtDlpWrapper['getInfo']>> | null, signal: AbortSignal): Promise<void> {
    const settings = this.settingsRepo.getAll()
    const tempPath = settings.tempPath || getDefaultTempPath()
    ensureDir(tempPath)

    if (info) {
      this.downloadRepo.update(id, {
        title: info.title,
        artist: info.uploader || info.channel || '',
        thumbnail: info.thumbnail,
        duration: info.duration
      })
    }

    this.downloadRepo.update(id, { status: 'downloading' })
    this.emitProgress(id)

    let downloadedPath = ''

    try {
      downloadedPath = await this.ytdlp.download({
        url: item.url,
        outputPath: tempPath,
        format: item.format,
        quality: item.quality,
        embedArtwork: settings.embedArtwork,
        embedMetadata: settings.embedMetadata,
        cookiesPath: settings.cookiesPath,
        proxyUrl: settings.proxyUrl,
        rateLimit: settings.rateLimit,
        onProgress: (progress, speed, eta, fileSize) => {
          this.downloadRepo.update(id, { progress, speed, eta, fileSize })
          this.emitProgress(id)
        }
      }, signal)
    } catch (err) {
      const tempFiles = this.findTempFiles(tempPath, id)
      for (const f of tempFiles) {
        try { await unlink(f) } catch {}
      }
      throw err
    }

    this.downloadRepo.update(id, { status: 'processing', progress: 100 })
    this.emitProgress(id)

    await this.processCompletedDownload(id, item, downloadedPath, settings)
  }

  private async processCompletedDownload(id: string, item: DownloadItem, downloadedPath: string, settings: AppSettings): Promise<void> {
    if (!downloadedPath || !existsSync(downloadedPath)) {
      const downloadItem = this.downloadRepo.findById(id)
      if (downloadItem) {
        const tempPath = settings.tempPath || getDefaultTempPath()
        const found = this.findLatestFile(tempPath, item.title || '')
        if (!found) throw new Error('Downloaded file not found')
        downloadedPath = found
      }
    }

    const metadata = await this.metadataService.extractMetadata(downloadedPath)

    if (settings.deduplicationEnabled) {
      const duplicate = await this.duplicateDetector.check(metadata)
      if (duplicate.isDuplicate && settings.deduplicationStrategy === 'skip') {
        await unlink(downloadedPath).catch(() => {})
        this.downloadRepo.update(id, {
          status: 'completed',
          filePath: duplicate.existingTrack?.filePath,
          completedAt: now()
        })
        this.emitProgress(id)
        return
      }
    }

    const finalPath = await this.fileOrganizer.organize(downloadedPath, metadata, settings)

    const track = this.trackRepo.insert({
      ...metadata,
      filePath: finalPath,
      sourceUrl: item.url,
      sourceId: null,
      sourcePlatform: this.detectPlatform(item.url),
      artworkPath: null,
      artworkUrl: item.thumbnail || null,
      fingerprint: null,
      tags: [],
      lyrics: null
    })

    this.downloadRepo.update(id, {
      status: 'completed',
      filePath: finalPath,
      completedAt: now(),
      progress: 100
    })

    this.emitProgress(id)
    this.emit(IPC_EVENTS.LIBRARY_UPDATED, track)
    log.info('Download completed', { id, title: track.title, path: finalPath })
  }

  private async handleError(id: string, err: unknown): Promise<void> {
    const item = this.downloadRepo.findById(id)
    if (!item) return

    const message = err instanceof Error ? err.message : String(err)
    log.error('Download failed', undefined, { id, error: message })

    if (item.retryCount < item.maxRetries) {
      const settings = this.settingsRepo.getAll()
      const delay = exponentialBackoff(item.retryCount, settings.retryDelay, 60000)
      this.downloadRepo.update(id, {
        status: 'failed',
        error: message,
        retryCount: item.retryCount + 1
      })
      this.emitProgress(id)

      await sleep(delay)

      const updated = this.downloadRepo.findById(id)
      if (updated?.status === 'failed') {
        this.downloadRepo.update(id, { status: 'queued', error: null })
        this.emitProgress(id)
        this.enqueue(id)
      }
    } else {
      this.downloadRepo.update(id, { status: 'failed', error: message })
      this.emitProgress(id)
      this.emit(IPC_EVENTS.DOWNLOAD_ERROR, { id, error: message })
    }
  }

  pause(id: string): void {
    const controller = this.activeControllers.get(id)
    if (controller) {
      controller.abort()
      this.activeControllers.delete(id)
    }
    this.downloadRepo.update(id, { status: 'paused' })
    this.emitProgress(id)
  }

  resume(id: string): void {
    const item = this.downloadRepo.findById(id)
    if (!item || item.status !== 'paused') return
    this.downloadRepo.update(id, { status: 'queued', progress: 0 })
    this.emitProgress(id)
    this.enqueue(id)
  }

  cancel(id: string): void {
    const controller = this.activeControllers.get(id)
    if (controller) {
      controller.abort()
      this.activeControllers.delete(id)
    }
    this.downloadRepo.update(id, { status: 'cancelled' })
    this.emitProgress(id)
  }

  retry(id: string): void {
    const item = this.downloadRepo.findById(id)
    if (!item) return
    this.downloadRepo.update(id, { status: 'queued', error: null, retryCount: 0, progress: 0 })
    this.emitProgress(id)
    this.enqueue(id)
  }

  clearCompleted(): number {
    return this.downloadRepo.clearCompleted()
  }

  getQueue(): DownloadItem[] {
    return this.downloadRepo.getAll()
  }

  updateSettings(settings: AppSettings): void {
    this.queue.concurrency = settings.maxConcurrentDownloads
    this.ytdlp.setBinaryPath(settings.ytdlpPath || YtDlpWrapper.getBundledPath())
  }

  private emitProgress(id: string): void {
    const item = this.downloadRepo.findById(id)
    if (item) this.emit(IPC_EVENTS.DOWNLOAD_PROGRESS, item)
  }

  private detectPlatform(url: string): string {
    try {
      const host = new URL(url).hostname.replace('www.', '')
      if (host.includes('youtube') || host.includes('youtu.be')) return 'youtube'
      if (host.includes('soundcloud')) return 'soundcloud'
      if (host.includes('bandcamp')) return 'bandcamp'
      return host
    } catch {
      return 'unknown'
    }
  }

  private findTempFiles(dir: string, id: string): string[] {
    try {
      return readdirSync(dir)
        .filter((f) => f.includes(id))
        .map((f) => join(dir, f))
    } catch {
      return []
    }
  }

  private findLatestFile(dir: string, _hint: string): string | null {
    try {
      const files = readdirSync(dir)
        .map((f) => ({ path: join(dir, f), mtime: statSync(join(dir, f)).mtime }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
      return files[0]?.path || null
    } catch {
      return null
    }
  }
}
