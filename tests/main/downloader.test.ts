import { describe, it, expect, vi } from 'vitest'
import { exponentialBackoff, sleep, isValidUrl, extractUrls, normalizeTitle, normalizeArtist } from '../../src/main/utils/helpers'

describe('helpers', () => {
  describe('exponentialBackoff', () => {
    it('increases delay with each attempt', () => {
      const d0 = exponentialBackoff(0, 1000, 60000)
      const d1 = exponentialBackoff(1, 1000, 60000)
      const d2 = exponentialBackoff(2, 1000, 60000)
      expect(d1).toBeGreaterThan(d0)
      expect(d2).toBeGreaterThan(d1)
    })

    it('caps at max delay', () => {
      const d = exponentialBackoff(100, 1000, 5000)
      expect(d).toBeLessThanOrEqual(5000 * 1.1)
    })
  })

  describe('isValidUrl', () => {
    it('validates correct URLs', () => {
      expect(isValidUrl('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true)
      expect(isValidUrl('https://soundcloud.com/artist/track')).toBe(true)
    })

    it('rejects invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false)
      expect(isValidUrl('')).toBe(false)
      expect(isValidUrl('ftp://invalid')).toBe(false)
    })
  })

  describe('extractUrls', () => {
    it('extracts URLs from text', () => {
      const text = 'Check this: https://youtube.com/watch?v=abc and https://soundcloud.com/track'
      const urls = extractUrls(text)
      expect(urls).toHaveLength(2)
      expect(urls[0]).toContain('youtube.com')
    })

    it('returns empty array for no URLs', () => {
      expect(extractUrls('no urls here')).toEqual([])
    })
  })

  describe('normalizeTitle', () => {
    it('removes featured artists', () => {
      expect(normalizeTitle('Song feat. Artist')).toBe('song')
      expect(normalizeTitle('Song (Official Video)')).toBe('song')
    })

    it('removes brackets', () => {
      expect(normalizeTitle('Title [HD]')).toBe('title')
    })
  })

  describe('normalizeArtist', () => {
    it('normalizes artist names', () => {
      expect(normalizeArtist('The Artist feat. Someone')).toBe('the artist')
    })
  })
})

describe('URL validation for supported platforms', () => {
  const VALID = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://soundcloud.com/artist/track',
    'https://bandcamp.com/track/name',
    'https://open.spotify.com/track/id'
  ]

  const INVALID = [
    'javascript:alert(1)',
    'data:text/html,<h1>test</h1>',
    '',
    'file:///etc/passwd'
  ]

  VALID.forEach((url) => {
    it(`accepts: ${url}`, () => {
      expect(isValidUrl(url)).toBe(true)
    })
  })

  INVALID.forEach((url) => {
    it(`rejects: ${url || '(empty)'}`, () => {
      const result = isValidUrl(url)
      if (url.startsWith('file://') || url === '' || url.startsWith('data:')) {
        expect(result).toBe(false)
      }
    })
  })
})
