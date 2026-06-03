import { existsSync, mkdirSync } from 'fs'
import { rename, copyFile, unlink } from 'fs/promises'
import { join, extname, dirname } from 'path'
import type { AppSettings } from '../../shared/types'
import type { TrackMetadata } from './MetadataService'
import { buildFilePath, ensureDir, getDefaultDownloadPath } from '../utils/paths'
import { createContextLogger } from '../utils/logger'

const log = createContextLogger('FileOrganizer')

export class FileOrganizer {
  async organize(sourcePath: string, metadata: TrackMetadata, settings: AppSettings): Promise<string> {
    if (!settings.fileOrganization.enabled) {
      return this.moveToDownloadDir(sourcePath, settings)
    }

    const downloadPath = settings.downloadPath || getDefaultDownloadPath()
    const ext = extname(sourcePath).replace('.', '') || metadata.format || 'mp3'

    const destPath = buildFilePath(
      downloadPath,
      settings.fileOrganization.pattern,
      {
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        year: metadata.year,
        genre: metadata.genre,
        track: null
      },
      ext,
      settings.fileOrganization.sanitizeNames
    )

    if (sourcePath === destPath) return destPath

    ensureDir(dirname(destPath))

    const finalPath = await this.resolveConflict(destPath)

    try {
      await rename(sourcePath, finalPath)
    } catch (err) {
      await copyFile(sourcePath, finalPath)
      await unlink(sourcePath)
    }

    log.debug('File organized', { from: sourcePath, to: finalPath })
    return finalPath
  }

  private async moveToDownloadDir(sourcePath: string, settings: AppSettings): Promise<string> {
    const downloadPath = settings.downloadPath || getDefaultDownloadPath()
    ensureDir(downloadPath)

    const filename = sourcePath.split(/[\\/]/).pop()!
    const destPath = join(downloadPath, filename)

    if (sourcePath === destPath) return destPath

    const finalPath = await this.resolveConflict(destPath)

    try {
      await rename(sourcePath, finalPath)
    } catch {
      await copyFile(sourcePath, finalPath)
      await unlink(sourcePath)
    }

    return finalPath
  }

  private async resolveConflict(targetPath: string): Promise<string> {
    if (!existsSync(targetPath)) return targetPath

    const ext = extname(targetPath)
    const base = targetPath.slice(0, -ext.length)
    let counter = 1

    while (existsSync(`${base} (${counter})${ext}`)) {
      counter++
      if (counter > 999) throw new Error('Too many duplicate files')
    }

    return `${base} (${counter})${ext}`
  }
}
