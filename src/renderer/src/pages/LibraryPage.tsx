import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Grid, List, Music2, Clock, MoreVertical,
  Trash2, FolderOpen, RefreshCw, Download, SortAsc, SortDesc, Filter
} from 'lucide-react'
import { clsx } from 'clsx'
import { useLibraryStore } from '../store/libraryStore'
import { useUiStore } from '../store/uiStore'
import { Button, Input, Badge, ScrollArea, Modal } from '../components/ui'
import type { Track } from '../../../shared/types'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatSize(bytes: number): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function TrackContextMenu({ track, onDelete }: { track: Track; onDelete: (deleteFile: boolean) => void }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="p-1.5 rounded text-surface-600 hover:text-surface-300 hover:bg-surface-800 opacity-0 group-hover:opacity-100 transition-all">
          <MoreVertical size={14} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-[200] min-w-[160px] bg-surface-800 border border-surface-700 rounded-xl shadow-2xl p-1 animate-fade-in"
          sideOffset={4}
        >
          {track.filePath && (
            <DropdownMenu.Item
              className="flex items-center gap-2 px-3 py-2 text-sm text-surface-200 rounded-lg cursor-default hover:bg-surface-700 focus:outline-none"
              onSelect={() => window.api.app.revealFile(track.filePath)}
            >
              <FolderOpen size={14} /> Show in Folder
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Separator className="my-1 h-px bg-surface-700" />
          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-surface-400 rounded-lg cursor-default hover:bg-surface-700 focus:outline-none"
            onSelect={() => onDelete(false)}
          >
            <Trash2 size={14} /> Remove from Library
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 rounded-lg cursor-default hover:bg-red-500/10 focus:outline-none"
            onSelect={() => onDelete(true)}
          >
            <Trash2 size={14} /> Delete File
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function TrackRow({ track, onDelete }: { track: Track; onDelete: (id: string, deleteFile: boolean) => void }) {
  return (
    <div className="group flex items-center gap-3 px-4 py-2.5 hover:bg-surface-800/50 rounded-lg transition-colors">
      {/* Artwork */}
      <div className="w-9 h-9 rounded bg-surface-800 shrink-0 flex items-center justify-center overflow-hidden">
        {track.artworkPath ? (
          <img src={`file://${track.artworkPath}`} alt="" className="w-full h-full object-cover" />
        ) : (
          <Music2 size={14} className="text-surface-600" />
        )}
      </div>

      {/* Title & Artist */}
      <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-surface-100 truncate">{track.title || 'Unknown'}</p>
          <p className="text-xs text-surface-500 truncate">{track.artist || 'Unknown Artist'}</p>
        </div>
        <div className="min-w-0">
          <p className="text-sm text-surface-400 truncate">{track.album || '—'}</p>
          <p className="text-xs text-surface-600 truncate">{track.genre || ''}</p>
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-4 shrink-0 text-xs text-surface-600">
        {track.year && <span>{track.year}</span>}
        {track.bitrate > 0 && <span>{track.bitrate}kbps</span>}
        <span>{formatSize(track.fileSize)}</span>
        <span className="w-10 text-right">{formatDuration(track.duration)}</span>
        <span className="text-surface-700 uppercase">{track.format}</span>
      </div>

      <TrackContextMenu track={track} onDelete={(del) => onDelete(track.id, del)} />
    </div>
  )
}

const SORT_OPTIONS = [
  { value: 'date_added', label: 'Date Added' },
  { value: 'title', label: 'Title' },
  { value: 'artist', label: 'Artist' },
  { value: 'album', label: 'Album' },
  { value: 'duration', label: 'Duration' },
  { value: 'play_count', label: 'Play Count' }
]

export function LibraryPage() {
  const { tracks, isLoading, isScanning, sortField, sortOrder, loadTracks, deleteTrack, scanLibrary, setSortField, setSortOrder } = useLibraryStore()
  const { addToast } = useUiStore()
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  const filtered = tracks.filter((t) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      t.album.toLowerCase().includes(q)
    )
  })

  const handleDelete = async (id: string, deleteFile: boolean) => {
    try {
      await deleteTrack(id, deleteFile)
      addToast({ type: 'success', title: deleteFile ? 'Track and file deleted' : 'Track removed from library' })
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to delete', message: String(err) })
    }
  }

  const handleScan = async () => {
    try {
      const result = await window.api.library.scan()
      await loadTracks()
      addToast({
        type: 'success',
        title: 'Library scan complete',
        message: `Added ${result.added}, updated ${result.updated}, errors ${result.errors}`
      })
    } catch (err) {
      addToast({ type: 'error', title: 'Scan failed', message: String(err) })
    }
  }

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')
    } else {
      setSortField(field)
      setSortOrder('DESC')
    }
    loadTracks()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-surface-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-surface-100">Library</h1>
            <p className="text-xs text-surface-500 mt-0.5">{tracks.length} tracks</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={handleScan} loading={isScanning}>
              <RefreshCw size={13} /> Scan
            </Button>
            <div className="flex items-center rounded-lg bg-surface-800 border border-surface-700 overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={clsx('p-2 transition-colors', viewMode === 'list' ? 'text-surface-100 bg-surface-700' : 'text-surface-500 hover:text-surface-300')}
              >
                <List size={14} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={clsx('p-2 transition-colors', viewMode === 'grid' ? 'text-surface-100 bg-surface-700' : 'text-surface-500 hover:text-surface-300')}
              >
                <Grid size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tracks, artists, albums..."
            leftIcon={<Search size={14} />}
            className="flex-1"
          />
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button size="sm" variant="secondary">
                <SortAsc size={13} />
                {SORT_OPTIONS.find((o) => o.value === sortField)?.label || 'Sort'}
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="z-[200] min-w-[160px] bg-surface-800 border border-surface-700 rounded-xl shadow-2xl p-1 animate-fade-in" sideOffset={4}>
                {SORT_OPTIONS.map((opt) => (
                  <DropdownMenu.Item
                    key={opt.value}
                    className={clsx(
                      'flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-lg cursor-default focus:outline-none hover:bg-surface-700',
                      sortField === opt.value ? 'text-primary-300' : 'text-surface-200'
                    )}
                    onSelect={() => toggleSort(opt.value)}
                  >
                    {opt.label}
                    {sortField === opt.value && (sortOrder === 'ASC' ? <SortAsc size={12} /> : <SortDesc size={12} />)}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-1 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg skeleton" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20">
            <Music2 size={40} className="text-surface-700 mb-3" />
            <p className="text-surface-500 text-sm">
              {search ? 'No tracks match your search' : 'Your library is empty'}
            </p>
            <p className="text-surface-700 text-xs mt-1">
              {search ? 'Try a different search term' : 'Download some music to get started'}
            </p>
          </div>
        ) : (
          <div className={clsx(viewMode === 'list' ? 'p-2 space-y-0.5' : 'p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3')}>
            <AnimatePresence>
              {filtered.map((track) =>
                viewMode === 'list' ? (
                  <motion.div key={track.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <TrackRow track={track} onDelete={handleDelete} />
                  </motion.div>
                ) : (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="card-hover p-3 space-y-2 group"
                  >
                    <div className="aspect-square rounded-lg bg-surface-800 flex items-center justify-center overflow-hidden">
                      {track.artworkPath ? (
                        <img src={`file://${track.artworkPath}`} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Music2 size={24} className="text-surface-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-surface-100 truncate">{track.title}</p>
                      <p className="text-xs text-surface-500 truncate">{track.artist}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-surface-600">{formatDuration(track.duration)}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-surface-700 uppercase">{track.format}</span>
                        <TrackContextMenu track={track} onDelete={(del) => handleDelete(track.id, del)} />
                      </div>
                    </div>
                  </motion.div>
                )
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
