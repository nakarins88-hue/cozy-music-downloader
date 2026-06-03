import { create } from 'zustand'

export type ActivePage = 'downloads' | 'library' | 'playlists' | 'settings' | 'logs'
export type ViewMode = 'list' | 'grid'

interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

interface UiState {
  activePage: ActivePage
  viewMode: ViewMode
  sidebarCollapsed: boolean
  theme: 'dark' | 'light'
  toasts: Toast[]
  setActivePage: (page: ActivePage) => void
  setViewMode: (mode: ViewMode) => void
  toggleSidebar: () => void
  setTheme: (theme: 'dark' | 'light') => void
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
}

export const useUiStore = create<UiState>((set) => ({
  activePage: 'downloads',
  viewMode: 'list',
  sidebarCollapsed: false,
  theme: 'dark',
  toasts: [],

  setActivePage: (activePage) => set({ activePage }),
  setViewMode: (viewMode) => set({ viewMode }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setTheme: (theme) => set({ theme }),

  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2)
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    const duration = toast.duration ?? 4000
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      }, duration)
    }
    return id
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
}))
