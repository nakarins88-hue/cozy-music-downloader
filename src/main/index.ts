import { app, BrowserWindow, nativeTheme, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { is } from '@electron-toolkit/utils'
import { getDatabase, closeDatabase } from './database/Database'
import { TrackRepository } from './database/repositories/TrackRepository'
import { DownloadRepository } from './database/repositories/DownloadRepository'
import { PlaylistRepository } from './database/repositories/PlaylistRepository'
import { SettingsRepository } from './database/repositories/SettingsRepository'
import { DownloadManager } from './downloader/DownloadManager'
import { MetadataService } from './library/MetadataService'
import { DuplicateDetector } from './library/DuplicateDetector'
import { FileOrganizer } from './library/FileOrganizer'
import { LibraryManager } from './library/LibraryManager'
import { PlaylistSync } from './sync/PlaylistSync'
import { registerIpcHandlers } from './ipc/handlers'
import { logger } from './utils/logger'
import { ensureAppDirs } from './utils/paths'

const isDev = is.dev

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.on('ready-to-show', () => {
    win.show()
    if (isDev) win.webContents.openDevTools()
  })

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

function initServices() {
  ensureAppDirs()
  const db = getDatabase()

  const trackRepo = new TrackRepository(db)
  const downloadRepo = new DownloadRepository(db)
  const playlistRepo = new PlaylistRepository(db)
  const settingsRepo = new SettingsRepository(db)

  const metadataService = new MetadataService()
  const duplicateDetector = new DuplicateDetector(trackRepo)
  const fileOrganizer = new FileOrganizer()

  const downloadManager = new DownloadManager(
    downloadRepo,
    trackRepo,
    settingsRepo,
    metadataService,
    duplicateDetector,
    fileOrganizer
  )

  const libraryManager = new LibraryManager(
    trackRepo,
    playlistRepo,
    settingsRepo,
    metadataService,
    duplicateDetector
  )

  const playlistSync = new PlaylistSync(playlistRepo, settingsRepo)

  return {
    trackRepo,
    downloadRepo,
    playlistRepo,
    settingsRepo,
    downloadManager,
    libraryManager,
    playlistSync
  }
}

app.whenReady().then(() => {
  logger.info('App starting', 'Main', { version: app.getVersion() })

  const services = initServices()

  mainWindow = createWindow()

  registerIpcHandlers(
    mainWindow,
    services.downloadManager,
    services.libraryManager,
    services.playlistRepo,
    services.settingsRepo,
    services.downloadRepo,
    services.playlistSync
  )

  services.downloadManager.initialize()
  services.playlistSync.startAutoSync()

  // System tray
  const iconCandidates = [
    join(app.isPackaged ? process.resourcesPath : app.getAppPath(), 'resources', 'icon.ico'),
    join(app.isPackaged ? process.resourcesPath : app.getAppPath(), 'resources', 'icon.png'),
  ]
  const iconPath = iconCandidates.find(existsSync)
  if (iconPath) {
    try {
      tray = new Tray(nativeImage.createFromPath(iconPath))
      tray.setToolTip('Cozy Music Downloader')
      tray.setContextMenu(Menu.buildFromTemplate([
        { label: 'Show', click: () => { mainWindow?.show(); mainWindow?.focus() } },
        { type: 'separator' },
        { label: 'Quit', click: () => { isQuitting = true; app.quit() } }
      ]))
      tray.on('double-click', () => {
        if (mainWindow?.isVisible()) mainWindow.hide()
        else { mainWindow?.show(); mainWindow?.focus() }
      })

      mainWindow.on('minimize', (event) => {
        if (services.settingsRepo.getAll().minimizeToTray) {
          event.preventDefault()
          mainWindow?.hide()
        }
      })

      mainWindow.on('close', (event) => {
        if (!isQuitting && services.settingsRepo.getAll().minimizeToTray) {
          event.preventDefault()
          mainWindow?.hide()
        }
      })
    } catch (err) {
      logger.warn('Failed to create system tray', 'Main', { error: String(err) })
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow()
    }
  })

  nativeTheme.on('updated', () => {
    mainWindow?.webContents.send('theme:changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light')
  })

  logger.info('App ready', 'Main')
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  isQuitting = true
  closeDatabase()
  logger.info('App shutting down', 'Main')
})

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${err.message}`, 'Main', { stack: err.stack })
})

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled rejection: ${String(reason)}`, 'Main')
})
