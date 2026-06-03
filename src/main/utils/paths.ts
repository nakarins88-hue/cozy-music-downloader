import { join, resolve } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { homedir } from 'os'

function electronApp() {
  try {
    const { app } = require('electron') as typeof import('electron')
    return app
  } catch {
    return null
  }
}

export function getDataDir(): string {
  return electronApp()?.getPath('userData') ?? resolve('./data')
}

export function getDefaultDownloadPath(): string {
  return join(homedir(), 'Music', 'Cozy Downloads')
}

export function getDefaultTempPath(): string {
  return join(getDataDir(), 'temp')
}

export function getArtworkDir(): string {
  return join(getDataDir(), 'artwork')
}

export function getLogsDir(): string {
  return join(getDataDir(), 'logs')
}

export function getDatabasePath(): string {
  return join(getDataDir(), 'library.db')
}

export function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true })
  }
}

export function ensureAppDirs(): void {
  ensureDir(getDataDir())
  ensureDir(getDefaultTempPath())
  ensureDir(getArtworkDir())
  ensureDir(getLogsDir())
}

export function sanitizeFileName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/^[\s.]+|[\s.]+$/g, '')
    .replace(/\s+/g, ' ')
    .substring(0, 200) || 'Unknown'
}

export function buildFilePath(
  basePath: string,
  pattern: string,
  meta: {
    title: string
    artist: string
    album: string
    year: number | null
    genre: string
    track: number | null
  },
  ext: string,
  sanitize: boolean
): string {
  const sanitizeFn = sanitize ? sanitizeFileName : (s: string) => s

  const replacements: Record<string, string> = {
    '{title}': sanitizeFn(meta.title || 'Unknown Title'),
    '{artist}': sanitizeFn(meta.artist || 'Unknown Artist'),
    '{album}': sanitizeFn(meta.album || 'Unknown Album'),
    '{year}': meta.year ? String(meta.year) : 'Unknown Year',
    '{genre}': sanitizeFn(meta.genre || 'Unknown Genre'),
    '{track}': meta.track ? String(meta.track).padStart(2, '0') : '00'
  }

  let filePath = pattern
  for (const [key, value] of Object.entries(replacements)) {
    filePath = filePath.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value)
  }

  return join(basePath, `${filePath}.${ext}`)
}
