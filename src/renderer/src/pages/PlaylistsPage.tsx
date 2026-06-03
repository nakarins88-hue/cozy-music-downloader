import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, ListMusic, RefreshCw, Trash2, MoreVertical, Link } from 'lucide-react'
import { clsx } from 'clsx'
import { useLibraryStore } from '../store/libraryStore'
import { useUiStore } from '../store/uiStore'
import { Button, Input, Modal, Switch } from '../components/ui'
import type { Playlist } from '../../../shared/types'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function PlaylistCard({ playlist, onDelete, onSync }: {
  playlist: Playlist
  onDelete: (id: string) => void
  onSync: (id: string) => void
}) {
  const [syncing, setSyncing] = useState(false)

  const handleSync = async () => {
    setSyncing(true)
    try {
      await onSync(playlist.id)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="card-hover p-4 group">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-lg bg-surface-800 flex items-center justify-center overflow-hidden shrink-0">
          {playlist.artworkPath ? (
            <img src={`file://${playlist.artworkPath}`} alt="" className="w-full h-full object-cover" />
          ) : (
            <ListMusic size={20} className="text-surface-600" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-surface-100 truncate">{playlist.name}</p>
          {playlist.description && (
            <p className="text-xs text-surface-500 mt-0.5 truncate">{playlist.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1 text-xs text-surface-600">
            <span>{playlist.trackCount} tracks</span>
            {playlist.totalDuration > 0 && <span>{formatDuration(playlist.totalDuration)}</span>}
            {playlist.lastSynced && (
              <span>Synced {new Date(playlist.lastSynced).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {playlist.sourceUrl && (
            <Button size="icon" variant="ghost" onClick={handleSync} loading={syncing}>
              <RefreshCw size={13} />
            </Button>
          )}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button size="icon" variant="ghost">
                <MoreVertical size={14} />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="z-[200] min-w-[160px] bg-surface-800 border border-surface-700 rounded-xl shadow-2xl p-1"
                sideOffset={4}
              >
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 rounded-lg cursor-default hover:bg-red-500/10 focus:outline-none"
                  onSelect={() => onDelete(playlist.id)}
                >
                  <Trash2 size={14} /> Delete Playlist
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      {playlist.syncEnabled && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-primary-400">
          <RefreshCw size={10} />
          <span>Auto-sync enabled</span>
        </div>
      )}
    </div>
  )
}

interface CreatePlaylistForm {
  name: string
  description: string
  sourceUrl: string
  syncEnabled: boolean
}

export function PlaylistsPage() {
  const { playlists, loadPlaylists, createPlaylist, deletePlaylist } = useLibraryStore()
  const { addToast } = useUiStore()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreatePlaylistForm>({
    name: '',
    description: '',
    sourceUrl: '',
    syncEnabled: false
  })
  const [creating, setCreating] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setCreating(true)
    try {
      await createPlaylist({
        name: form.name.trim(),
        description: form.description.trim() || null,
        sourceUrl: form.sourceUrl.trim() || null,
        syncEnabled: form.syncEnabled,
        syncInterval: 86400
      })
      setShowCreate(false)
      setForm({ name: '', description: '', sourceUrl: '', syncEnabled: false })
      addToast({ type: 'success', title: 'Playlist created' })
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to create playlist', message: String(err) })
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deletePlaylist(id)
      addToast({ type: 'success', title: 'Playlist deleted' })
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to delete', message: String(err) })
    }
  }

  const handleSync = async (id: string) => {
    try {
      const result = await window.api.playlist.sync(id)
      await loadPlaylists()
      addToast({ type: 'success', title: 'Playlist synced', message: `Added ${result.added} new tracks` })
    } catch (err) {
      addToast({ type: 'error', title: 'Sync failed', message: String(err) })
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4 border-b border-surface-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-surface-100">Playlists</h1>
            <p className="text-xs text-surface-500 mt-0.5">{playlists.length} playlists</p>
          </div>
          <Button size="sm" variant="primary" onClick={() => setShowCreate(true)}>
            <Plus size={13} /> New Playlist
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {playlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20">
            <ListMusic size={40} className="text-surface-700 mb-3" />
            <p className="text-surface-500 text-sm">No playlists yet</p>
            <p className="text-surface-700 text-xs mt-1">Create a playlist to organize your music</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            <AnimatePresence>
              {playlists.map((playlist) => (
                <motion.div
                  key={playlist.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <PlaylistCard
                    playlist={playlist}
                    onDelete={handleDelete}
                    onSync={handleSync}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Playlist"
        size="sm"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="My Playlist"
            required
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Optional description"
          />
          <Input
            label="Source URL"
            value={form.sourceUrl}
            onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))}
            placeholder="YouTube playlist URL (optional)"
            leftIcon={<Link size={13} />}
          />
          {form.sourceUrl && (
            <Switch
              checked={form.syncEnabled}
              onChange={(v) => setForm((f) => ({ ...f, syncEnabled: v }))}
              label="Enable Auto-Sync"
              description="Automatically download new tracks from this playlist"
            />
          )}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={creating} className="flex-1">
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
