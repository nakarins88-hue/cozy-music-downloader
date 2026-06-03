import { contextBridge, ipcRenderer } from 'electron'
import type {
  DownloadItem,
  Track,
  Playlist,
  AppSettings,
  SearchQuery,
  BatchDownloadRequest
} from '../shared/types'

type IpcResponse<T> = { success: true; data: T } | { success: false; error: string }

async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  const result: IpcResponse<T> = await ipcRenderer.invoke(channel, ...args)
  if (!result.success) throw new Error(result.error)
  return result.data
}

const api = {
  // Download
  download: {
    start: (url: string) => invoke<DownloadItem>('download:start', url),
    batch: (req: BatchDownloadRequest) => invoke<DownloadItem[]>('download:batch', req),
    pause: (id: string) => invoke<void>('download:pause', id),
    resume: (id: string) => invoke<void>('download:resume', id),
    cancel: (id: string) => invoke<void>('download:cancel', id),
    retry: (id: string) => invoke<void>('download:retry', id),
    clearCompleted: () => invoke<number>('download:clear-completed'),
    getQueue: () => invoke<DownloadItem[]>('download:get-queue'),
    getInfo: (url: string) => invoke<Record<string, unknown>>('download:get-info', url)
  },

  // Library
  library: {
    getTracks: (sortField?: string, sortOrder?: string, limit?: number, offset?: number) =>
      invoke<Track[]>('library:get-tracks', sortField, sortOrder, limit, offset),
    getTrack: (id: string) => invoke<Track | null>('library:get-track', id),
    search: (query: SearchQuery) => invoke<{ tracks: Track[]; total: number }>('library:search', query),
    deleteTrack: (id: string, deleteFile?: boolean) => invoke<boolean>('library:delete-track', id, deleteFile),
    updateTrack: (id: string, updates: Partial<Track>) => invoke<Track | null>('library:update-track', id, updates),
    getStats: () => invoke<Record<string, unknown>>('library:get-stats'),
    scan: (dirPath?: string) => invoke<{ added: number; updated: number; errors: number }>('library:scan', dirPath),
    export: (format: string) => invoke<string | null>('library:export', format)
  },

  // Playlists
  playlist: {
    getAll: () => invoke<Playlist[]>('playlist:get-all'),
    getById: (id: string) => invoke<Playlist | null>('playlist:get-by-id', id),
    create: (data: Partial<Playlist>) => invoke<Playlist>('playlist:create', data),
    update: (id: string, updates: Partial<Playlist>) => invoke<Playlist | null>('playlist:update', id, updates),
    delete: (id: string) => invoke<boolean>('playlist:delete', id),
    addTrack: (playlistId: string, trackId: string) => invoke<void>('playlist:add-track', playlistId, trackId),
    removeTrack: (playlistId: string, trackId: string) => invoke<void>('playlist:remove-track', playlistId, trackId),
    reorder: (playlistId: string, trackIds: string[]) => invoke<void>('playlist:reorder', playlistId, trackIds),
    sync: (playlistId: string) => invoke<{ added: number; skipped: number }>('playlist:sync', playlistId)
  },

  // Settings
  settings: {
    get: () => invoke<AppSettings>('settings:get'),
    update: (updates: Partial<AppSettings>) => invoke<AppSettings>('settings:update', updates),
    reset: () => invoke<AppSettings>('settings:reset'),
    browseFolder: () => invoke<string | null>('settings:browse-folder'),
    checkYtdlp: (path?: string) => invoke<string | null>('settings:check-ytdlp', path),
    checkFfmpeg: () => invoke<string | null>('settings:check-ffmpeg'),
    updateYtdlp: () => invoke<boolean>('settings:update-ytdlp')
  },

  // Logs
  logs: {
    get: (limit?: number, offset?: number) => invoke<Record<string, unknown>[]>('logs:get', limit, offset),
    clear: () => invoke<boolean>('logs:clear')
  },

  // App
  app: {
    getVersion: () => invoke<string>('app:get-version'),
    openFolder: (path: string) => invoke<void>('app:open-folder', path),
    revealFile: (path: string) => invoke<void>('app:reveal-file', path),
    minimize: () => ipcRenderer.send('app:minimize'),
    maximize: () => ipcRenderer.send('app:maximize'),
    close: () => ipcRenderer.send('app:close')
  },

  // Event subscriptions
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args)
    ipcRenderer.on(channel, subscription)
    return () => ipcRenderer.removeListener(channel, subscription)
  },

  once: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.once(channel, (_event, ...args) => callback(...args))
  }
}

contextBridge.exposeInMainWorld('api', api)

export type AppApi = typeof api
