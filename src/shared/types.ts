export type DownloadStatus =
  | 'queued'
  | 'pending'
  | 'downloading'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'cancelled'

export type AudioFormat = 'mp3' | 'flac' | 'm4a' | 'opus' | 'ogg' | 'wav' | 'best'
export type AudioQuality = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
export type Theme = 'light' | 'dark' | 'system'
export type SortField = 'title' | 'artist' | 'album' | 'duration' | 'dateAdded' | 'playCount'
export type SortOrder = 'asc' | 'desc'
export type ViewMode = 'list' | 'grid'

export interface Track {
  id: string
  title: string
  artist: string
  album: string
  albumArtist: string
  year: number | null
  genre: string
  duration: number
  filePath: string
  fileSize: number
  format: string
  bitrate: number
  sampleRate: number
  channels: number
  artworkPath: string | null
  artworkUrl: string | null
  sourceUrl: string | null
  sourceId: string | null
  sourcePlatform: string | null
  playCount: number
  lastPlayed: string | null
  dateAdded: string
  dateModified: string
  fingerprint: string | null
  tags: string[]
  lyrics: string | null
  comment: string | null
}

export interface DownloadItem {
  id: string
  url: string
  title: string | null
  artist: string | null
  album: string | null
  thumbnail: string | null
  duration: number | null
  status: DownloadStatus
  progress: number
  speed: string | null
  eta: string | null
  fileSize: number | null
  filePath: string | null
  error: string | null
  retryCount: number
  maxRetries: number
  format: AudioFormat
  quality: AudioQuality
  playlistId: string | null
  playlistIndex: number | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export interface Playlist {
  id: string
  name: string
  description: string | null
  sourceUrl: string | null
  sourcePlatform: string | null
  artworkPath: string | null
  artworkUrl: string | null
  trackCount: number
  totalDuration: number
  lastSynced: string | null
  syncEnabled: boolean
  syncInterval: number
  createdAt: string
  updatedAt: string
}

export interface PlaylistTrack {
  playlistId: string
  trackId: string
  position: number
  addedAt: string
}

export interface AppSettings {
  downloadPath: string
  tempPath: string
  audioFormat: AudioFormat
  audioQuality: AudioQuality
  maxConcurrentDownloads: number
  maxRetries: number
  retryDelay: number
  embedArtwork: boolean
  embedMetadata: boolean
  fileOrganization: FileOrganizationTemplate
  deduplicationEnabled: boolean
  deduplicationStrategy: 'skip' | 'replace' | 'rename'
  theme: Theme
  language: string
  notifications: boolean
  minimizeToTray: boolean
  startMinimized: boolean
  ytdlpPath: string
  ffmpegPath: string
  proxyUrl: string | null
  rateLimit: string | null
  cookiesPath: string | null
  cleanupEnabled: boolean
  cleanupDays: number
  logLevel: 'error' | 'warn' | 'info' | 'debug'
  logRetentionDays: number
}

export interface FileOrganizationTemplate {
  enabled: boolean
  pattern: string
  sanitizeNames: boolean
  createArtistFolder: boolean
  createAlbumFolder: boolean
}

export interface DownloadProgress {
  id: string
  status: DownloadStatus
  progress: number
  speed: string | null
  eta: string | null
  fileSize: number | null
  filePath: string | null
  error: string | null
}

export interface BatchDownloadRequest {
  urls: string[]
  format?: AudioFormat
  quality?: AudioQuality
  playlistId?: string
}

export interface SearchQuery {
  query: string
  artist?: string
  album?: string
  genre?: string
  year?: number
  tags?: string[]
  sortField?: SortField
  sortOrder?: SortOrder
  limit?: number
  offset?: number
}

export interface SearchResult {
  tracks: Track[]
  total: number
  offset: number
  limit: number
}

export interface LibraryStats {
  totalTracks: number
  totalDuration: number
  totalSize: number
  totalArtists: number
  totalAlbums: number
  totalPlaylists: number
  topArtists: Array<{ artist: string; count: number }>
  topGenres: Array<{ genre: string; count: number }>
  recentlyAdded: Track[]
}

export interface LogEntry {
  id: string
  level: 'error' | 'warn' | 'info' | 'debug'
  message: string
  context: string | null
  metadata: Record<string, unknown> | null
  timestamp: string
}

export interface YtDlpInfo {
  id: string
  title: string
  uploader: string
  channel: string
  upload_date: string
  duration: number
  thumbnail: string
  description: string
  webpage_url: string
  ext: string
  filesize: number | null
  filesize_approx: number | null
  format_id: string
  acodec: string
  abr: number
  asr: number
  playlist_title?: string
  playlist_index?: number
  playlist_count?: number
  entries?: YtDlpInfo[]
}

export interface DuplicateCheckResult {
  isDuplicate: boolean
  existingTrack: Track | null
  matchType: 'exact' | 'metadata' | null
}

export interface MainWindow {
  show(): void
  hide(): void
  minimize(): void
  close(): void
}

export type IpcChannel =
  | 'download:start'
  | 'download:batch'
  | 'download:pause'
  | 'download:resume'
  | 'download:cancel'
  | 'download:retry'
  | 'download:clear-completed'
  | 'download:get-queue'
  | 'download:get-info'
  | 'download:progress'
  | 'library:get-tracks'
  | 'library:get-track'
  | 'library:search'
  | 'library:delete-track'
  | 'library:update-track'
  | 'library:get-stats'
  | 'library:scan'
  | 'library:scan-progress'
  | 'library:export'
  | 'playlist:get-all'
  | 'playlist:get-by-id'
  | 'playlist:create'
  | 'playlist:update'
  | 'playlist:delete'
  | 'playlist:add-track'
  | 'playlist:remove-track'
  | 'playlist:reorder'
  | 'playlist:sync'
  | 'settings:get'
  | 'settings:update'
  | 'settings:reset'
  | 'settings:browse-folder'
  | 'settings:check-ytdlp'
  | 'settings:check-ffmpeg'
  | 'settings:update-ytdlp'
  | 'logs:get'
  | 'logs:clear'
  | 'app:get-version'
  | 'app:check-update'
  | 'app:open-folder'
  | 'app:reveal-file'
  | 'app:minimize'
  | 'app:maximize'
  | 'app:close'
