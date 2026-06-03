import { existsSync } from 'fs'
import type { DuplicateCheckResult } from '../../shared/types'
import type { TrackRepository } from '../database/repositories/TrackRepository'
import type { TrackMetadata } from './MetadataService'
import { getFileHash } from '../utils/helpers'
import { createContextLogger } from '../utils/logger'

const log = createContextLogger('DuplicateDetector')

export class DuplicateDetector {
  constructor(private trackRepo: TrackRepository) {}

  async check(metadata: TrackMetadata): Promise<DuplicateCheckResult> {
    if (metadata.filePath && existsSync(metadata.filePath)) {
      try {
        const hash = await getFileHash(metadata.filePath)
        const existing = this.trackRepo.findByFingerprint(hash)
        if (existing) {
          log.debug('Exact duplicate found', { title: metadata.title, fingerprint: hash })
          return { isDuplicate: true, existingTrack: existing, matchType: 'exact' }
        }
      } catch (err) {
        log.warn('Hash check failed', { error: String(err) })
      }
    }

    if (metadata.title && metadata.artist) {
      const existing = this.trackRepo.findDuplicateByMetadata(metadata.title, metadata.artist)
      if (existing) {
        log.debug('Metadata duplicate found', { title: metadata.title, artist: metadata.artist })
        return { isDuplicate: true, existingTrack: existing, matchType: 'metadata' }
      }
    }

    return { isDuplicate: false, existingTrack: null, matchType: null }
  }

  async computeFingerprint(filePath: string): Promise<string | null> {
    try {
      return await getFileHash(filePath)
    } catch {
      return null
    }
  }
}
