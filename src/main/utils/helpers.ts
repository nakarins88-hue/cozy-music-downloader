import { createHash, randomUUID } from 'crypto'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'

export function generateId(): string {
  return randomUUID()
}

export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
}

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*\[[^\]]*\]/g, '')
    .replace(/\s*feat\.?\s+.+$/i, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeArtist(artist: string): string {
  return artist
    .toLowerCase()
    .replace(/\s*feat\.?\s+.+$/i, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function getFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('md5')
    const stream = createReadStream(filePath, { highWaterMark: 65536 })
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

export async function getFileSize(filePath: string): Promise<number> {
  const stats = await stat(filePath)
  return stats.size
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function isValidUrl(url: string): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s]+/g
  return (text.match(urlRegex) || []).filter(isValidUrl)
}

export function parseDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  try {
    return new Date(dateStr).toISOString()
  } catch {
    return null
  }
}

export function now(): string {
  return new Date().toISOString()
}

export function exponentialBackoff(attempt: number, baseDelay: number, maxDelay: number): number {
  const delay = baseDelay * Math.pow(2, attempt)
  const jitter = Math.random() * 0.1 * delay
  return Math.min(delay + jitter, maxDelay)
}
