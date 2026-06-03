import YTDlpWrap from 'yt-dlp-wrap'
import { join } from 'path'
import { existsSync } from 'fs'
import { app } from 'electron'
import type { YtDlpInfo } from '../../shared/types'
import { createContextLogger } from '../utils/logger'

const log = createContextLogger('YtDlpWrapper')

export interface DownloadOptions {
  url: string
  outputPath: string
  format: string
  quality: string
  embedArtwork: boolean
  embedMetadata: boolean
  cookiesPath?: string | null
  proxyUrl?: string | null
  rateLimit?: string | null
  onProgress?: (progress: number, speed: string, eta: string, fileSize: number) => void
}

export interface ProgressData {
  progress: number
  speed: string
  eta: string
  fileSize: number
  filePath: string
}

export class YtDlpWrapper {
  private ytdlp: YTDlpWrap
  private binaryPath: string

  constructor(binaryPath = 'yt-dlp') {
    this.binaryPath = binaryPath
    this.ytdlp = new YTDlpWrap(binaryPath)
  }

  setBinaryPath(path: string): void {
    this.binaryPath = path
    this.ytdlp = new YTDlpWrap(path)
  }

  async getInfo(url: string): Promise<YtDlpInfo> {
    log.debug('Getting info', { url })
    const info = await this.ytdlp.getVideoInfo(url)
    return info as YtDlpInfo
  }

  async download(options: DownloadOptions, signal?: AbortSignal): Promise<string> {
    const args = this.buildArgs(options)
    log.debug('Starting download', { url: options.url, format: options.format })

    return new Promise((resolve, reject) => {
      let filePath = ''
      let aborted = false

      const proc = this.ytdlp.execStream(args)

      if (signal) {
        signal.addEventListener('abort', () => {
          aborted = true
          proc.destroy()
          reject(new Error('Download cancelled'))
        })
      }

      proc.on('ytDlpEvent', (eventType: string, eventData: string) => {
        if (eventType === 'download') {
          const match = eventData.match(/\[download\]\s+([\d.]+)%.*?(\d+\.\d+\w+\/s).*?ETA\s+(\S+)/)
          if (match && options.onProgress) {
            const progress = parseFloat(match[1])
            const speed = match[2] || ''
            const eta = match[3] || ''
            options.onProgress(progress, speed, eta, 0)
          }

          const destMatch = eventData.match(/\[download\] Destination: (.+)/)
          if (destMatch) filePath = destMatch[1].trim()

          const mergedMatch = eventData.match(/\[Merger\] Merging formats into "(.+)"/)
          if (mergedMatch) filePath = mergedMatch[1].trim()

          const convertMatch = eventData.match(/\[ExtractAudio\] Destination: (.+)/)
          if (convertMatch) filePath = convertMatch[1].trim()
        }
      })

      proc.on('error', (err: Error) => {
        if (!aborted) reject(err)
      })

      proc.on('close', (code: number) => {
        if (aborted) return
        if (code === 0) {
          resolve(filePath)
        } else {
          reject(new Error(`yt-dlp exited with code ${code}`))
        }
      })
    })
  }

  private buildArgs(options: DownloadOptions): string[] {
    const args: string[] = [options.url]

    if (options.format === 'best') {
      args.push('-x', '--audio-quality', '0')
    } else {
      args.push(
        '-x',
        '--audio-format', options.format,
        '--audio-quality', options.quality
      )
    }

    args.push(
      '-o', join(options.outputPath, '%(title)s.%(ext)s'),
      '--no-playlist',
      '--prefer-ffmpeg',
      '--no-mtime',
      '--progress',
      '--newline'
    )

    if (options.embedArtwork) {
      args.push('--embed-thumbnail', '--convert-thumbnails', 'jpg')
    }

    if (options.embedMetadata) {
      args.push('--add-metadata', '--parse-metadata', 'uploader:%(artist)s')
    }

    if (options.cookiesPath) {
      args.push('--cookies', options.cookiesPath)
    }

    if (options.proxyUrl) {
      args.push('--proxy', options.proxyUrl)
    }

    if (options.rateLimit) {
      args.push('--rate-limit', options.rateLimit)
    }

    args.push('--write-info-json', '--no-write-playlist-metafiles')

    return args
  }

  async downloadPlaylist(
    url: string,
    outputPath: string,
    format: string,
    quality: string,
    archivePath: string,
    options: Partial<DownloadOptions>,
    onItem?: (title: string, index: number, total: number) => void,
    signal?: AbortSignal
  ): Promise<{ added: number; skipped: number }> {
    const args: string[] = [
      url,
      '-x',
      '--audio-format', format === 'best' ? 'mp3' : format,
      '--audio-quality', quality,
      '-o', join(outputPath, '%(playlist_title)s/%(playlist_index)02d - %(title)s.%(ext)s'),
      '--yes-playlist',
      '--download-archive', archivePath,
      '--prefer-ffmpeg',
      '--no-mtime',
      '--progress',
      '--newline'
    ]

    if (options.embedArtwork) args.push('--embed-thumbnail', '--convert-thumbnails', 'jpg')
    if (options.embedMetadata) args.push('--add-metadata')
    if (options.cookiesPath) args.push('--cookies', options.cookiesPath)
    if (options.proxyUrl) args.push('--proxy', options.proxyUrl)

    let added = 0
    let skipped = 0

    await new Promise<void>((resolve, reject) => {
      let aborted = false
      const proc = this.ytdlp.execStream(args)

      if (signal) {
        signal.addEventListener('abort', () => {
          aborted = true
          proc.destroy()
          reject(new Error('Playlist download cancelled'))
        })
      }

      proc.on('ytDlpEvent', (_type: string, data: string) => {
        const progressMatch = data.match(/\[download\] Downloading video (\d+) of (\d+)/)
        if (progressMatch && onItem) {
          onItem('', parseInt(progressMatch[1]), parseInt(progressMatch[2]))
        }

        if (/already in (the )?archive/i.test(data) || /has already been downloaded/i.test(data)) {
          skipped++
        } else if (/^\[ExtractAudio\] Destination:/m.test(data)) {
          added++
        }
      })

      proc.on('error', (err: Error) => { if (!aborted) reject(err) })
      proc.on('close', (code: number) => {
        if (!aborted) {
          if (code === 0) resolve()
          else reject(new Error(`yt-dlp exited with code ${code}`))
        }
      })
    })

    return { added, skipped }
  }

  async checkBinary(): Promise<string | null> {
    try {
      const version = await this.ytdlp.getVersion()
      return version
    } catch {
      return null
    }
  }

  async updateBinary(downloadDir: string): Promise<void> {
    const platform = process.platform
    const binaryName = platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
    const binaryPath = join(downloadDir, binaryName)
    await YTDlpWrap.downloadFromGithub(binaryPath)
    this.setBinaryPath(binaryPath)
    log.info('yt-dlp updated', { path: binaryPath })
  }

  static getBundledPath(): string {
    const platform = process.platform
    const binaryName = platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
    const resourcesPath = app.isPackaged
      ? join(process.resourcesPath, 'bin')
      : join(app.getAppPath(), 'resources', 'bin', platform === 'win32' ? 'win' : platform === 'darwin' ? 'mac' : 'linux')
    const bundled = join(resourcesPath, binaryName)
    return existsSync(bundled) ? bundled : 'yt-dlp'
  }
}
