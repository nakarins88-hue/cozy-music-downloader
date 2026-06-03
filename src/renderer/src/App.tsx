import React, { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from './components/layout/Sidebar'
import { TitleBar } from './components/layout/TitleBar'
import { ToastContainer } from './components/ui/Toast'
import { DownloadsPage } from './pages/DownloadsPage'
import { LibraryPage } from './pages/LibraryPage'
import { PlaylistsPage } from './pages/PlaylistsPage'
import { SettingsPage } from './pages/SettingsPage'
import { LogsPage } from './pages/LogsPage'
import { useUiStore } from './store/uiStore'
import { useSettingsStore } from './store/settingsStore'
import { useDownloadStore, subscribeToDownloadEvents } from './store/downloadStore'
import { useLibraryStore, subscribeToLibraryEvents } from './store/libraryStore'
import { subscribeToSettingsEvents } from './store/settingsStore'

const PAGES = {
  downloads: DownloadsPage,
  library: LibraryPage,
  playlists: PlaylistsPage,
  settings: SettingsPage,
  logs: LogsPage
}

export default function App() {
  const { activePage, theme } = useUiStore()
  const { load: loadSettings, settings } = useSettingsStore()
  const { loadQueue } = useDownloadStore()
  const { loadTracks, loadPlaylists, loadStats } = useLibraryStore()

  useEffect(() => {
    const init = async () => {
      await loadSettings()
      await Promise.all([
        loadQueue(),
        loadTracks(),
        loadPlaylists(),
        loadStats()
      ])
    }
    init()

    const unsubs = [
      subscribeToDownloadEvents(),
      subscribeToLibraryEvents(),
      subscribeToSettingsEvents()
    ]

    const unsubTheme = window.api.on('theme:changed', (t: unknown) => {
      useUiStore.getState().setTheme(t as 'dark' | 'light')
    })

    return () => {
      unsubs.forEach((u) => u())
      unsubTheme()
    }
  }, [])

  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark')
      useUiStore.getState().setTheme('dark')
    } else if (settings.theme === 'light') {
      document.documentElement.classList.remove('dark')
      useUiStore.getState().setTheme('light')
    }
  }, [settings.theme])

  const ActivePage = PAGES[activePage]

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${theme}`}>
      {/* Window chrome */}
      <TitleBar />

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Page content */}
        <main className="flex-1 overflow-hidden bg-surface-950">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              <ActivePage />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <ToastContainer />
    </div>
  )
}
