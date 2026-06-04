import { create } from 'zustand'
import type { DownloadItem } from '../../../shared/types'
import { IPC_EVENTS } from '../../../shared/constants'

interface DownloadState {
  items: DownloadItem[]
  isLoading: boolean
  setItems: (items: DownloadItem[]) => void
  upsertItem: (item: DownloadItem) => void
  removeItem: (id: string) => void
  loadQueue: () => Promise<void>
  addDownload: (url: string, format?: string, quality?: string) => Promise<void>
  addBatch: (urls: string[], format?: string, quality?: string) => Promise<void>
  pause: (id: string) => Promise<void>
  resume: (id: string) => Promise<void>
  cancel: (id: string) => Promise<void>
  retry: (id: string) => Promise<void>
  clearCompleted: () => Promise<void>
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  items: [],
  isLoading: false,

  setItems: (items) => set({ items }),

  upsertItem: (item) =>
    set((state) => {
      const idx = state.items.findIndex((i) => i.id === item.id)
      if (idx >= 0) {
        const items = [...state.items]
        items[idx] = item
        return { items }
      }
      return { items: [item, ...state.items] }
    }),

  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  loadQueue: async () => {
    set({ isLoading: true })
    try {
      const items = await window.api.download.getQueue()
      set({ items })
    } finally {
      set({ isLoading: false })
    }
  },

  addDownload: async (url, format, quality) => {
    const options = format || quality ? { format, quality } : undefined
    const item = await window.api.download.start(url, options)
    get().upsertItem(item)
  },

  addBatch: async (urls, format, quality) => {
    const items = await window.api.download.batch({
      urls,
      ...(format && { format: format as import('../../../shared/types').AudioFormat }),
      ...(quality && { quality: quality as import('../../../shared/types').AudioQuality })
    })
    for (const item of items) get().upsertItem(item)
  },

  pause: async (id) => {
    await window.api.download.pause(id)
  },

  resume: async (id) => {
    await window.api.download.resume(id)
  },

  cancel: async (id) => {
    await window.api.download.cancel(id)
  },

  retry: async (id) => {
    await window.api.download.retry(id)
  },

  clearCompleted: async () => {
    await window.api.download.clearCompleted()
    set((state) => ({
      items: state.items.filter((i) => !['completed', 'cancelled'].includes(i.status))
    }))
  }
}))

export function subscribeToDownloadEvents(): () => void {
  const store = useDownloadStore.getState()

  const unsubProgress = window.api.on(IPC_EVENTS.DOWNLOAD_PROGRESS, (item: unknown) => {
    store.upsertItem(item as DownloadItem)
  })

  const unsubCompleted = window.api.on(IPC_EVENTS.DOWNLOAD_COMPLETED, (item: unknown) => {
    store.upsertItem(item as DownloadItem)
  })

  const unsubError = window.api.on(IPC_EVENTS.DOWNLOAD_ERROR, (data: unknown) => {
    const { id, error } = data as { id: string; error: string }
    store.upsertItem({ ...store.items.find((i) => i.id === id)!, status: 'failed', error })
  })

  return () => {
    unsubProgress()
    unsubCompleted()
    unsubError()
  }
}
