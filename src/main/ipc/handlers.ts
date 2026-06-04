import { ipcMain, dialog, shell, app } from 'electron'
import { existsSync } from 'fs'
import type { BrowserWindow } from 'electron'
import type { AppSettings, BatchDownloadRequest, SearchQuery } from '../../shared/types'
import type { DownloadManager } from '../downloader/DownloadManager'
import type { LibraryManager } from '../library/LibraryManager'
import type { PlaylistRepository } from '../database/repositories/PlaylistRepository'
import type { SettingsRepository } from '../database/repositories/SettingsRepository'
import type { DownloadRepository } from '../database/repositories/DownloadRepository'
import type { PlaylistSync } from '../sync/PlaylistSync'
import { YtDlpWrapper } from '../downloader/YtDlpWrapper'
import { createContextLogger } from '../utils/logger'
import { IPC_EVENTS } from '../../shared/constants'

const log = createContextLogger('IPC')

function handle(channel: string, handler: (...args: unknown[]) => unknown): void {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      return { success: true, data: await handler(...args) }
    } catch (err) {
      log.error(`IPC handler error: ${channel}`, undefined, { error: String(err) })
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
}

export function registerIpcHandlers(
  win: BrowserWindow,
  downloadManager: DownloadManager,
  libraryManager: LibraryManager,
  playlistRepo: PlaylistRepository,
  settingsRepo: SettingsRepository,
  downloadRepo: DownloadRepository,
  playlistSync: PlaylistSync
): void {
  // Forward events to renderer
  const forward = (event: string) => {
    downloadManager.on(event, (data: unknown) => {
      win.webContents.send(event, data)
    })
  }

  forward(IPC_EVENTS.DOWNLOAD_PROGRESS)
  forward(IPC_EVENTS.DOWNLOAD_COMPLETED)
  forward(IPC_EVENTS.DOWNLOAD_ERROR)
  forward(IPC_EVENTS.LIBRARY_UPDATED)

  libraryManager.on(IPC_EVENTS.LIBRARY_UPDATED, (data: unknown) => {
    win.webContents.send(IPC_EVENTS.LIBRARY_UPDATED, data)
  })

  libraryManager.on(IPC_EVENTS.LIBRARY_SCAN_PROGRESS, (data: unknown) => {
    win.webContents.send(IPC_EVENTS.LIBRARY_SCAN_PROGRESS, data)
  })

  // Download handlers
  handle('download:start', (url: unknown, options: unknown) => {
    const opts = options as { format?: string; quality?: string } | undefined
    return downloadManager.addDownload(url as string, opts)
  })

  handle('download:batch', (request: unknown) =>
    downloadManager.addBatch(request as BatchDownloadRequest)
  )

  handle('download:pause', (id: unknown) => downloadManager.pause(id as string))
  handle('download:resume', (id: unknown) => downloadManager.resume(id as string))
  handle('download:cancel', (id: unknown) => downloadManager.cancel(id as string))
  handle('download:retry', (id: unknown) => downloadManager.retry(id as string))

  handle('download:clear-completed', () => downloadManager.clearCompleted())

  handle('download:get-queue', () => downloadManager.getQueue())

  handle('download:get-info', async (url: unknown) => {
    const settings = settingsRepo.getAll()
    const wrapper = new YtDlpWrapper(settings.ytdlpPath || YtDlpWrapper.getBundledPath())
    return wrapper.getInfo(url as string)
  })

  // Library handlers
  handle('library:get-tracks', (sortField: unknown, sortOrder: unknown, limit: unknown, offset: unknown) =>
    libraryManager.getTracks(
      sortField as string,
      sortOrder as 'ASC' | 'DESC',
      limit as number,
      offset as number
    )
  )

  handle('library:get-track', (id: unknown) => libraryManager.getTrack(id as string))

  handle('library:search', (query: unknown) => libraryManager.search(query as SearchQuery))

  handle('library:delete-track', (id: unknown, deleteFile: unknown) =>
    libraryManager.deleteTrack(id as string, deleteFile as boolean)
  )

  handle('library:update-track', (id: unknown, updates: unknown) =>
    libraryManager.updateTrack(id as string, updates as Parameters<LibraryManager['updateTrack']>[1])
  )

  handle('library:get-stats', () => libraryManager.getStats())

  handle('library:scan', (dirPath: unknown) =>
    libraryManager.scanDirectory(dirPath as string | undefined)
  )

  handle('library:export', async (format: unknown) => {
    const result = await dialog.showSaveDialog(win, {
      title: 'Export Library',
      defaultPath: `music-library.${format}`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (!result.canceled && result.filePath) {
      const tracks = libraryManager.getTracks()
      const { writeFileSync } = await import('fs')
      writeFileSync(result.filePath, JSON.stringify(tracks, null, 2))
      return result.filePath
    }
    return null
  })

  // Playlist handlers
  handle('playlist:get-all', () => playlistRepo.getAll())

  handle('playlist:get-by-id', (id: unknown) => playlistRepo.findById(id as string))

  handle('playlist:create', (data: unknown) => {
    const d = data as Parameters<PlaylistRepository['insert']>[0]
    return playlistRepo.insert(d)
  })

  handle('playlist:update', (id: unknown, updates: unknown) =>
    playlistRepo.update(id as string, updates as Parameters<PlaylistRepository['update']>[1])
  )

  handle('playlist:delete', (id: unknown) => playlistRepo.delete(id as string))

  handle('playlist:add-track', (playlistId: unknown, trackId: unknown) =>
    playlistRepo.addTrack(playlistId as string, trackId as string)
  )

  handle('playlist:remove-track', (playlistId: unknown, trackId: unknown) =>
    playlistRepo.removeTrack(playlistId as string, trackId as string)
  )

  handle('playlist:reorder', (playlistId: unknown, trackIds: unknown) =>
    playlistRepo.reorderTracks(playlistId as string, trackIds as string[])
  )

  handle('playlist:sync', (playlistId: unknown) =>
    playlistSync.syncPlaylist(playlistId as string)
  )

  // Settings handlers
  handle('settings:get', () => settingsRepo.getAll())

  handle('settings:update', (updates: unknown) => {
    const s = updates as Partial<AppSettings>
    settingsRepo.setAll(s)
    downloadManager.updateSettings(settingsRepo.getAll())
    win.webContents.send(IPC_EVENTS.SETTINGS_UPDATED, settingsRepo.getAll())
    return settingsRepo.getAll()
  })

  handle('settings:reset', () => {
    settingsRepo.reset()
    return settingsRepo.getAll()
  })

  handle('settings:browse-folder', async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Select Download Folder'
    })
    return result.canceled ? null : result.filePaths[0]
  })

  handle('settings:check-ytdlp', async (path: unknown) => {
    const wrapper = new YtDlpWrapper(path as string || 'yt-dlp')
    return wrapper.checkBinary()
  })

  handle('settings:check-ffmpeg', async () => {
    const { execSync } = await import('child_process')
    try {
      const output = execSync('ffmpeg -version', { encoding: 'utf8', timeout: 5000 })
      return output.split('\n')[0]
    } catch {
      return null
    }
  })

  handle('settings:update-ytdlp', async () => {
    const settings = settingsRepo.getAll()
    const wrapper = new YtDlpWrapper(settings.ytdlpPath)
    await wrapper.updateBinary(app.getPath('userData'))
    return true
  })

  // Logs handlers
  handle('logs:get', async (limit: unknown, offset: unknown) => {
    const { getDatabase } = await import('../database/Database')
    const db = getDatabase()
    const rows = db.prepare(
      'SELECT * FROM logs ORDER BY timestamp DESC LIMIT ? OFFSET ?'
    ).all(limit || 100, offset || 0)
    return rows
  })

  handle('logs:clear', async () => {
    const { getDatabase } = await import('../database/Database')
    const db = getDatabase()
    db.prepare('DELETE FROM logs').run()
    return true
  })

  // App handlers
  handle('app:get-version', () => app.getVersion())

  handle('app:check-update', async () => {
    // Update mechanism not yet implemented
    return null
  })

  handle('app:open-folder', async (path: unknown) => {
    await shell.openPath(path as string)
  })

  handle('app:reveal-file', async (path: unknown) => {
    shell.showItemInFolder(path as string)
  })

  ipcMain.on('app:minimize', () => win.minimize())
  ipcMain.on('app:maximize', () => {
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
  ipcMain.on('app:close', () => win.close())

  log.info('IPC handlers registered')
}
