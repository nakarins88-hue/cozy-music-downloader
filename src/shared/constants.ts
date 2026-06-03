export const APP_NAME = 'Cozy Music Downloader'
export const APP_VERSION = '1.0.0'

export const DEFAULT_SETTINGS = {
  downloadPath: '',
  tempPath: '',
  audioFormat: 'mp3' as const,
  audioQuality: '0' as const,
  maxConcurrentDownloads: 3,
  maxRetries: 3,
  retryDelay: 5000,
  embedArtwork: true,
  embedMetadata: true,
  fileOrganization: {
    enabled: true,
    pattern: '{artist}/{album}/{title}',
    sanitizeNames: true,
    createArtistFolder: true,
    createAlbumFolder: true
  },
  deduplicationEnabled: true,
  deduplicationStrategy: 'skip' as const,
  theme: 'system' as const,
  language: 'en',
  notifications: true,
  minimizeToTray: false,
  startMinimized: false,
  ytdlpPath: 'yt-dlp',
  ffmpegPath: 'ffmpeg',
  proxyUrl: null,
  rateLimit: null,
  cookiesPath: null,
  cleanupEnabled: true,
  cleanupDays: 30,
  logLevel: 'info' as const,
  logRetentionDays: 7
}

export const SUPPORTED_PLATFORMS = [
  'youtube.com',
  'youtu.be',
  'soundcloud.com',
  'bandcamp.com',
  'vimeo.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'tiktok.com',
  'twitch.tv',
  'mixcloud.com',
  'dailymotion.com'
]

export const AUDIO_FORMATS = [
  { value: 'mp3', label: 'MP3', description: 'Most compatible format' },
  { value: 'flac', label: 'FLAC', description: 'Lossless audio' },
  { value: 'm4a', label: 'M4A', description: 'Apple Audio format' },
  { value: 'opus', label: 'Opus', description: 'Modern open codec' },
  { value: 'ogg', label: 'OGG', description: 'Open source format' },
  { value: 'wav', label: 'WAV', description: 'Uncompressed audio' },
  { value: 'best', label: 'Best', description: 'Best available quality' }
] as const

export const AUDIO_QUALITIES = [
  { value: '0', label: 'Best (320kbps)' },
  { value: '1', label: 'Excellent (256kbps)' },
  { value: '2', label: 'Very Good (192kbps)' },
  { value: '3', label: 'Good (160kbps)' },
  { value: '4', label: 'Medium (128kbps)' },
  { value: '5', label: 'Fair (96kbps)' },
  { value: '9', label: 'Smallest' }
] as const

export const FILE_ORGANIZATION_VARS = [
  { variable: '{title}', description: 'Track title' },
  { variable: '{artist}', description: 'Artist name' },
  { variable: '{album}', description: 'Album name' },
  { variable: '{year}', description: 'Release year' },
  { variable: '{genre}', description: 'Genre' },
  { variable: '{track}', description: 'Track number' }
]

export const MAX_CONCURRENT_DOWNLOADS = 10
export const MIN_CONCURRENT_DOWNLOADS = 1
export const DEFAULT_CONCURRENT_DOWNLOADS = 3

export const RETRY_BACKOFF_MULTIPLIER = 2
export const MAX_RETRY_DELAY = 60000

export const DB_VERSION = 1
export const DB_FILE = 'library.db'
export const LOG_DIR = 'logs'
export const ARTWORK_DIR = 'artwork'
export const TEMP_DIR = 'temp'

export const ARTWORK_MAX_SIZE = 1200
export const ARTWORK_QUALITY = 85

export const SCAN_EXTENSIONS = ['.mp3', '.flac', '.m4a', '.ogg', '.opus', '.wav', '.wma', '.aac']

export const IPC_EVENTS = {
  DOWNLOAD_PROGRESS: 'download:progress',
  DOWNLOAD_COMPLETED: 'download:completed',
  DOWNLOAD_ERROR: 'download:error',
  LIBRARY_UPDATED: 'library:updated',
  LIBRARY_SCAN_PROGRESS: 'library:scan-progress',
  SETTINGS_UPDATED: 'settings:updated',
  NOTIFICATION: 'app:notification'
} as const
