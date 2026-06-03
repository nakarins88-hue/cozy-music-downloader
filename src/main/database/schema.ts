export const SCHEMA_VERSION = 1

export const CREATE_TABLES_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -32000;
PRAGMA temp_store = MEMORY;

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  artist TEXT NOT NULL DEFAULT '',
  album TEXT NOT NULL DEFAULT '',
  album_artist TEXT NOT NULL DEFAULT '',
  year INTEGER,
  genre TEXT NOT NULL DEFAULT '',
  duration REAL NOT NULL DEFAULT 0,
  file_path TEXT NOT NULL UNIQUE,
  file_size INTEGER NOT NULL DEFAULT 0,
  format TEXT NOT NULL DEFAULT '',
  bitrate INTEGER NOT NULL DEFAULT 0,
  sample_rate INTEGER NOT NULL DEFAULT 0,
  channels INTEGER NOT NULL DEFAULT 2,
  artwork_path TEXT,
  artwork_url TEXT,
  source_url TEXT,
  source_id TEXT,
  source_platform TEXT,
  play_count INTEGER NOT NULL DEFAULT 0,
  last_played TEXT,
  date_added TEXT NOT NULL DEFAULT (datetime('now')),
  date_modified TEXT NOT NULL DEFAULT (datetime('now')),
  fingerprint TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  lyrics TEXT,
  comment TEXT
);

CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album);
CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks(title);
CREATE INDEX IF NOT EXISTS idx_tracks_date_added ON tracks(date_added DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_source_id ON tracks(source_id);
CREATE INDEX IF NOT EXISTS idx_tracks_fingerprint ON tracks(fingerprint);

CREATE TABLE IF NOT EXISTS downloads (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT,
  artist TEXT,
  album TEXT,
  thumbnail TEXT,
  duration REAL,
  status TEXT NOT NULL DEFAULT 'queued',
  progress REAL NOT NULL DEFAULT 0,
  speed TEXT,
  eta TEXT,
  file_size INTEGER,
  file_path TEXT,
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  format TEXT NOT NULL DEFAULT 'mp3',
  quality TEXT NOT NULL DEFAULT '0',
  playlist_id TEXT,
  playlist_index INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status);
CREATE INDEX IF NOT EXISTS idx_downloads_created_at ON downloads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_downloads_playlist_id ON downloads(playlist_id);

CREATE TABLE IF NOT EXISTS playlists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  source_url TEXT,
  source_platform TEXT,
  artwork_path TEXT,
  artwork_url TEXT,
  track_count INTEGER NOT NULL DEFAULT 0,
  total_duration REAL NOT NULL DEFAULT 0,
  last_synced TEXT,
  sync_enabled INTEGER NOT NULL DEFAULT 0,
  sync_interval INTEGER NOT NULL DEFAULT 86400,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS playlist_tracks (
  playlist_id TEXT NOT NULL,
  track_id TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (playlist_id, track_id),
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track ON playlist_tracks(track_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  context TEXT,
  metadata TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_context ON logs(context);

CREATE VIRTUAL TABLE IF NOT EXISTS tracks_fts USING fts5(
  id UNINDEXED,
  title,
  artist,
  album,
  genre,
  comment,
  content=tracks,
  content_rowid=rowid
);

CREATE TRIGGER IF NOT EXISTS tracks_fts_insert AFTER INSERT ON tracks BEGIN
  INSERT INTO tracks_fts(rowid, id, title, artist, album, genre, comment)
  VALUES (new.rowid, new.id, new.title, new.artist, new.album, new.genre, new.comment);
END;

CREATE TRIGGER IF NOT EXISTS tracks_fts_update AFTER UPDATE ON tracks BEGIN
  UPDATE tracks_fts SET
    title = new.title,
    artist = new.artist,
    album = new.album,
    genre = new.genre,
    comment = new.comment
  WHERE id = new.id;
END;

CREATE TRIGGER IF NOT EXISTS tracks_fts_delete AFTER DELETE ON tracks BEGIN
  DELETE FROM tracks_fts WHERE id = old.id;
END;
`

export const MIGRATIONS: Record<number, string> = {
  1: CREATE_TABLES_SQL
}
