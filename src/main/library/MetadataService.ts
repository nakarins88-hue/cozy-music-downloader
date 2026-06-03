import NodeID3 from 'node-id3'
import { existsSync, statSync } from 'fs'
import { extname, basename, dirname } from 'path'
import type { Track } from '../../shared/types'
import { createContextLogger } from '../utils/logger'

const log = createContextLogger('MetadataService')

export type TrackMetadata = Omit<Track, 'id' | 'dateAdded' | 'dateModified' | 'playCount' | 'lastPlayed' | 'sourceUrl' | 'sourceId' | 'sourcePlatform' | 'artworkPath' | 'tags' | 'lyrics' | 'fingerprint'>

export class MetadataService {
  async extractMetadata(filePath: string): Promise<TrackMetadata> {
    const ext = extname(filePath).toLowerCase().replace('.', '')
    const stats = existsSync(filePath) ? statSync(filePath) : null
    const fileSize = stats?.size || 0

    if (ext === 'mp3') {
      return this.extractMp3Metadata(filePath, fileSize)
    }

    return this.extractFallbackMetadata(filePath, fileSize, ext)
  }

  private extractMp3Metadata(filePath: string, fileSize: number): TrackMetadata {
    try {
      const tags = NodeID3.read(filePath)

      const title = tags.title || this.titleFromFilename(filePath)
      const artist = tags.artist || tags.performerInfo || ''
      const album = tags.album || ''
      const albumArtist = tags.performerInfo || artist
      const year = tags.year ? parseInt(tags.year) : null
      const genre = this.parseGenre(tags.genre || '')
      const comment = typeof tags.comment === 'object' ? (tags.comment as { text?: string }).text || '' : tags.comment || ''

      const duration = this.estimateDuration(fileSize)
      const bitrate = this.estimateBitrate(fileSize, duration)

      let artworkUrl: string | null = null
      if (tags.image && typeof tags.image === 'object' && 'imageBuffer' in tags.image) {
        artworkUrl = null
      }

      return {
        title,
        artist,
        album,
        albumArtist,
        year: isNaN(year as number) ? null : year,
        genre,
        duration,
        filePath,
        fileSize,
        format: 'mp3',
        bitrate,
        sampleRate: 44100,
        channels: 2,
        artworkUrl,
        comment: comment || null
      }
    } catch (err) {
      log.warn('Failed to read MP3 tags', { filePath, error: String(err) })
      return this.extractFallbackMetadata(filePath, fileSize, 'mp3')
    }
  }

  private extractFallbackMetadata(filePath: string, fileSize: number, ext: string): TrackMetadata {
    const title = this.titleFromFilename(filePath)
    const duration = this.estimateDuration(fileSize)
    const bitrate = this.estimateBitrate(fileSize, duration)

    return {
      title,
      artist: '',
      album: '',
      albumArtist: '',
      year: null,
      genre: '',
      duration,
      filePath,
      fileSize,
      format: ext,
      bitrate,
      sampleRate: 44100,
      channels: 2,
      artworkUrl: null,
      comment: null
    }
  }

  async writeMetadata(filePath: string, metadata: Partial<TrackMetadata>): Promise<void> {
    const ext = extname(filePath).toLowerCase()
    if (ext !== '.mp3') {
      log.debug('Metadata writing only supported for MP3', { filePath })
      return
    }

    const tags: NodeID3.Tags = {}
    if (metadata.title) tags.title = metadata.title
    if (metadata.artist) tags.artist = metadata.artist
    if (metadata.album) tags.album = metadata.album
    if (metadata.albumArtist) tags.performerInfo = metadata.albumArtist
    if (metadata.year) tags.year = String(metadata.year)
    if (metadata.genre) tags.genre = metadata.genre
    if (metadata.comment) tags.comment = { language: 'eng', text: metadata.comment }

    const success = NodeID3.update(tags, filePath)
    if (!success) {
      log.warn('Failed to write metadata', { filePath })
    }
  }

  private titleFromFilename(filePath: string): string {
    const name = basename(filePath)
    return name
      .replace(/\.[^.]+$/, '')
      .replace(/^\d+[\s.-]+/, '')
      .replace(/[_-]+/g, ' ')
      .trim() || 'Unknown Title'
  }

  private parseGenre(genre: string): string {
    const match = genre.match(/\((\d+)\)/)
    if (match) {
      const id3Genres = ['Blues', 'Classic Rock', 'Country', 'Dance', 'Disco', 'Funk',
        'Grunge', 'Hip-Hop', 'Jazz', 'Metal', 'New Age', 'Oldies', 'Other', 'Pop',
        'R&B', 'Rap', 'Reggae', 'Rock', 'Techno', 'Industrial', 'Alternative', 'Ska',
        'Death Metal', 'Pranks', 'Soundtrack', 'Euro-Techno', 'Ambient', 'Trip-Hop',
        'Vocal', 'Jazz+Funk', 'Fusion', 'Trance', 'Classical', 'Instrumental', 'Acid',
        'House', 'Game', 'Sound Clip', 'Gospel', 'Noise', 'Alternative Rock', 'Bass',
        'Soul', 'Punk', 'Space', 'Meditative', 'Instrumental Pop', 'Instrumental Rock',
        'Ethnic', 'Gothic', 'Darkwave', 'Techno-Industrial', 'Electronic', 'Pop-Folk',
        'Eurodance', 'Dream', 'Southern Rock', 'Comedy', 'Cult', 'Gangsta', 'Top 40',
        'Christian Rap', 'Pop/Funk', 'Jungle', 'Native US', 'Cabaret', 'New Wave',
        'Psychadelic', 'Rave', 'Showtunes', 'Trailer', 'Lo-Fi', 'Tribal', 'Acid Punk',
        'Acid Jazz', 'Polka', 'Retro', 'Musical', 'Rock & Roll', 'Hard Rock']
      const idx = parseInt(match[1])
      return id3Genres[idx] || genre
    }
    return genre.replace(/[()]/g, '').trim()
  }

  private estimateDuration(fileSize: number): number {
    const avgBitrate = 192000 / 8
    return fileSize > 0 ? Math.round(fileSize / avgBitrate) : 0
  }

  private estimateBitrate(fileSize: number, duration: number): number {
    if (!duration) return 192
    return Math.round((fileSize * 8) / (duration * 1000))
  }
}
