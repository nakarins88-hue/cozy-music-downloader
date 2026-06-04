# Cozy Music Downloader

A production-ready desktop app for downloading music and managing your local library. Built with Electron, React, and TypeScript.

![Downloads page](screenshots/01-downloads.png)

## Features

- **Download anything** — YouTube, SoundCloud, Bandcamp, and [1000+ other sites](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md) via yt-dlp
- **Batch downloads** — paste multiple URLs at once
- **Format & quality control** — MP3, FLAC, M4A, Opus, OGG, WAV; quality 0–9
- **Auto-retry** — exponential backoff on failures, resumes interrupted downloads on restart
- **Library management** — full-text search, sort, list/grid views, artwork display
- **File organization** — auto-sorts into `{artist}/{album}/{title}` (configurable)
- **Duplicate detection** — skips or replaces tracks already in your library
- **Playlist sync** — link a YouTube playlist and auto-download new tracks on a schedule
- **Metadata embedding** — writes title, artist, album, artwork into audio files via ffmpeg
- **System tray** — minimize to tray, restore with a double-click
- **Logs viewer** — filterable in-app log viewer backed by SQLite

## Screenshots

| Downloads | Library | Settings |
|-----------|---------|----------|
| ![](screenshots/01-downloads.png) | ![](screenshots/02-library.png) | ![](screenshots/04-settings.png) |

## Prerequisites

| Tool | Purpose | Install |
|------|---------|---------|
| [Node.js](https://nodejs.org) 18+ | Runtime | nodejs.org |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | Download engine | `winget install yt-dlp` |
| [ffmpeg](https://ffmpeg.org) | Audio conversion & artwork embedding | `winget install ffmpeg` |

## Installation

```bash
git clone https://github.com/nakarins88-hue/cozy-music-downloader.git
cd cozy-music-downloader
npm install
```

### Native module (better-sqlite3)

better-sqlite3 is a native module that must match your Node.js ABI. Pre-built binaries for the two targets are included in `node_modules/better-sqlite3/lib/binding/`:

| Binary | Used by |
|--------|---------|
| `node-v137-win32-x64` | Node 24 (tests) |
| `node-v121-win32-x64` | Electron 29 (app) |

If `npm install` overwrites these, re-download them:

```bash
# Node 24 (ABI 137)
curl -L https://github.com/WiseLibs/better-sqlite3/releases/download/v12.10.0/better-sqlite3-v12.10.0-node-v137-win32-x64.tar.gz | tar -xz
cp build/Release/better_sqlite3.node node_modules/better-sqlite3/lib/binding/node-v137-win32-x64/

# Electron 29 (ABI 121)
curl -L https://github.com/WiseLibs/better-sqlite3/releases/download/v12.10.0/better-sqlite3-v12.10.0-electron-v121-win32-x64.tar.gz | tar -xz
cp build/Release/better_sqlite3.node node_modules/better-sqlite3/lib/binding/node-v121-win32-x64/
```

> **Note:** `build/Release/better_sqlite3.node` must be absent (or renamed) so `bindings` falls through to the ABI-tagged paths above.

## Running

**Double-click** `launch-dev.bat` in the project root, or from a terminal:

```bash
npm run dev
```

## Building

```bash
npm run build          # compile to out/
npm run dist:win       # build Windows installer (requires Python 3.9+ and MSVC for native rebuild)
```

## Testing

```bash
npm test               # run all 38 tests
npm run test:watch     # watch mode
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Shell | Electron 29 |
| Build | electron-vite 2, Vite 7 |
| Frontend | React 18, TypeScript, Tailwind CSS |
| UI primitives | Radix UI, Framer Motion, Lucide icons |
| State | Zustand |
| Database | SQLite via better-sqlite3, FTS5 full-text search |
| Downloader | yt-dlp-wrap |
| Metadata | node-id3 |
| Logging | Winston + winston-daily-rotate-file |
| Tests | Vitest |

## Project Structure

```
src/
  main/           Electron main process
    database/     AppDatabase + repositories (Track, Download, Playlist, Settings)
    downloader/   YtDlpWrapper, DownloadManager (p-queue based)
    library/      MetadataService, DuplicateDetector, FileOrganizer, LibraryManager
    sync/         PlaylistSync (yt-dlp archive based)
    ipc/          All IPC channel handlers
    utils/        logger, paths, helpers
  preload/        Context bridge (window.api)
  renderer/       React app
    pages/        Downloads, Library, Playlists, Settings, Logs
    components/   UI primitives + layout (Sidebar, TitleBar)
    store/        Zustand stores (download, library, settings, ui)
  shared/         types.ts, constants.ts
tests/
  main/           database.test.ts, library.test.ts, downloader.test.ts
```

## License

MIT
