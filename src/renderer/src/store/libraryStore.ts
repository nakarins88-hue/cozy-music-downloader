import { create } from 'zustand'
import type { Track, Playlist, LibraryStats, SearchQuery } from '../../../shared/types'
import { IPC_EVENTS } from '../../../shared/constants'

interface LibraryState {
  tracks: Track[]
  playlists: Playlist[]
  stats: LibraryStats | null
  isLoading: boolean
  isScanning: boolean
  scanProgress: { total: number; processed: number; current: string } | null
  searchQuery: string
  sortField: string
  sortOrder: 'ASC' | 'DESC'
  loadTracks: () => Promise<void>
  loadPlaylists: () => Promise<void>
  loadStats: () => Promise<void>
  search: (query: SearchQuery) => Promise<{ tracks: Track[]; total: number }>
  deleteTrack: (id: string, deleteFile?: boolean) => Promise<void>
  updateTrack: (id: string, updates: Partial<Track>) => Promise<void>
  scanLibrary: () => Promise<void>
  createPlaylist: (data: Partial<Playlist>) => Promise<Playlist>
  updatePlaylist: (id: string, updates: Partial<Playlist>) => Promise<void>
  deletePlaylist: (id: string) => Promise<void>
  setSearchQuery: (q: string) => void
  setSortField: (f: string) => void
  setSortOrder: (o: 'ASC' | 'DESC') => void
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  tracks: [],
  playlists: [],
  stats: null,
  isLoading: false,
  isScanning: false,
  scanProgress: null,
  searchQuery: '',
  sortField: 'date_added',
  sortOrder: 'DESC',

  loadTracks: async () => {
    set({ isLoading: true })
    try {
      const { sortField, sortOrder } = get()
      const tracks = await window.api.library.getTracks(sortField, sortOrder)
      set({ tracks })
    } finally {
      set({ isLoading: false })
    }
  },

  loadPlaylists: async () => {
    const playlists = await window.api.playlist.getAll()
    set({ playlists })
  },

  loadStats: async () => {
    const stats = await window.api.library.getStats()
    set({ stats: stats as unknown as LibraryStats })
  },

  search: async (query) => {
    return window.api.library.search(query)
  },

  deleteTrack: async (id, deleteFile) => {
    await window.api.library.deleteTrack(id, deleteFile)
    set((state) => ({ tracks: state.tracks.filter((t) => t.id !== id) }))
  },

  updateTrack: async (id, updates) => {
    const updated = await window.api.library.updateTrack(id, updates)
    if (updated) {
      set((state) => ({
        tracks: state.tracks.map((t) => (t.id === id ? updated : t))
      }))
    }
  },

  scanLibrary: async () => {
    set({ isScanning: true, scanProgress: null })
    try {
      await window.api.library.scan()
      await get().loadTracks()
      await get().loadStats()
    } finally {
      set({ isScanning: false, scanProgress: null })
    }
  },

  createPlaylist: async (data) => {
    const playlist = await window.api.playlist.create(data)
    set((state) => ({ playlists: [playlist, ...state.playlists] }))
    return playlist
  },

  updatePlaylist: async (id, updates) => {
    const updated = await window.api.playlist.update(id, updates)
    if (updated) {
      set((state) => ({
        playlists: state.playlists.map((p) => (p.id === id ? updated : p))
      }))
    }
  },

  deletePlaylist: async (id) => {
    await window.api.playlist.delete(id)
    set((state) => ({ playlists: state.playlists.filter((p) => p.id !== id) }))
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSortField: (sortField) => set({ sortField }),
  setSortOrder: (sortOrder) => set({ sortOrder })
}))

export function subscribeToLibraryEvents(): () => void {
  const store = useLibraryStore.getState()

  const unsubUpdated = window.api.on(IPC_EVENTS.LIBRARY_UPDATED, () => {
    store.loadTracks()
    store.loadStats()
  })

  const unsubScan = window.api.on(IPC_EVENTS.LIBRARY_SCAN_PROGRESS, (data: unknown) => {
    const progress = data as { total: number; processed: number; current: string }
    useLibraryStore.setState({ scanProgress: progress })
  })

  return () => {
    unsubUpdated()
    unsubScan()
  }
}
