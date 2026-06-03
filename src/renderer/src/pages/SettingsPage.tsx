import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FolderOpen, RefreshCw, CheckCircle, XCircle, AlertCircle, Download } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import { useUiStore } from '../store/uiStore'
import { Button, Input, Select, Switch, Separator } from '../components/ui'
import { AUDIO_FORMATS, AUDIO_QUALITIES, FILE_ORGANIZATION_VARS } from '../../../shared/constants'
import type { AppSettings } from '../../../shared/types'

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-surface-200">{title}</h3>
        {description && <p className="text-xs text-surface-500 mt-0.5">{description}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

export function SettingsPage() {
  const { settings, load, update, reset, browseFolder } = useSettingsStore()
  const { addToast } = useUiStore()
  const [ytdlpStatus, setYtdlpStatus] = useState<string | null | 'checking'>('checking')
  const [ffmpegStatus, setFfmpegStatus] = useState<string | null | 'checking'>('checking')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    checkDeps()
  }, [settings.ytdlpPath])

  const checkDeps = async () => {
    setYtdlpStatus('checking')
    setFfmpegStatus('checking')
    const [yt, ff] = await Promise.all([
      window.api.settings.checkYtdlp(settings.ytdlpPath).catch(() => null),
      window.api.settings.checkFfmpeg().catch(() => null)
    ])
    setYtdlpStatus(yt)
    setFfmpegStatus(ff)
  }

  const handleUpdate = async (partial: Partial<AppSettings>) => {
    setIsSaving(true)
    try {
      await update(partial)
      addToast({ type: 'success', title: 'Settings saved' })
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to save settings', message: String(err) })
    } finally {
      setIsSaving(false)
    }
  }

  const handleBrowse = async (key: keyof AppSettings) => {
    const path = await browseFolder()
    if (path) handleUpdate({ [key]: path } as Partial<AppSettings>)
  }

  const handleReset = async () => {
    await reset()
    addToast({ type: 'info', title: 'Settings reset to defaults' })
  }

  const handleUpdateYtdlp = async () => {
    try {
      await window.api.settings.updateYtdlp()
      addToast({ type: 'success', title: 'yt-dlp updated' })
      checkDeps()
    } catch (err) {
      addToast({ type: 'error', title: 'Update failed', message: String(err) })
    }
  }

  function DepStatus({ status, label }: { status: string | null | 'checking'; label: string }) {
    if (status === 'checking') return (
      <div className="flex items-center gap-2 text-xs text-surface-500">
        <RefreshCw size={12} className="animate-spin" /> Checking {label}...
      </div>
    )
    if (status) return (
      <div className="flex items-center gap-2 text-xs text-emerald-400">
        <CheckCircle size={12} /> {label}: {status}
      </div>
    )
    return (
      <div className="flex items-center gap-2 text-xs text-red-400">
        <XCircle size={12} /> {label} not found
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4 border-b border-surface-800">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-surface-100">Settings</h1>
          <Button size="sm" variant="ghost" onClick={handleReset}>Reset to Defaults</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-8">

          {/* Download Location */}
          <Section title="Download Location" description="Where your music files are saved">
            <div className="flex items-center gap-2">
              <Input
                value={settings.downloadPath}
                onChange={(e) => useSettingsStore.setState((s) => ({ settings: { ...s.settings, downloadPath: e.target.value } }))}
                placeholder="~/Music/Cozy Downloads"
                className="flex-1"
              />
              <Button size="md" variant="secondary" onClick={() => handleBrowse('downloadPath')}>
                <FolderOpen size={14} /> Browse
              </Button>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleUpdate({ downloadPath: settings.downloadPath })}
              loading={isSaving}
            >
              Save
            </Button>
          </Section>

          <Separator />

          {/* Audio Quality */}
          <Section title="Audio Quality" description="Default format and quality for downloads">
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Format"
                value={settings.audioFormat}
                onChange={(v) => handleUpdate({ audioFormat: v as AppSettings['audioFormat'] })}
                options={AUDIO_FORMATS as unknown as Array<{ value: string; label: string; description: string }>}
              />
              <Select
                label="Quality"
                value={settings.audioQuality}
                onChange={(v) => handleUpdate({ audioQuality: v as AppSettings['audioQuality'] })}
                options={AUDIO_QUALITIES as unknown as Array<{ value: string; label: string }>}
              />
            </div>
            <div className="space-y-3">
              <Switch
                checked={settings.embedArtwork}
                onChange={(v) => handleUpdate({ embedArtwork: v })}
                label="Embed Album Artwork"
                description="Download and embed artwork into audio files"
              />
              <Switch
                checked={settings.embedMetadata}
                onChange={(v) => handleUpdate({ embedMetadata: v })}
                label="Embed Metadata"
                description="Write title, artist, album tags to audio files"
              />
            </div>
          </Section>

          <Separator />

          {/* File Organization */}
          <Section title="File Organization" description="How files are organized after downloading">
            <Switch
              checked={settings.fileOrganization.enabled}
              onChange={(v) => handleUpdate({ fileOrganization: { ...settings.fileOrganization, enabled: v } })}
              label="Organize Files"
              description="Automatically sort files into Artist/Album folders"
            />
            {settings.fileOrganization.enabled && (
              <div className="space-y-3 pl-4 border-l-2 border-surface-800">
                <Input
                  label="Folder Pattern"
                  value={settings.fileOrganization.pattern}
                  onChange={(e) => useSettingsStore.setState((s) => ({
                    settings: { ...s.settings, fileOrganization: { ...s.settings.fileOrganization, pattern: e.target.value } }
                  }))}
                  placeholder="{artist}/{album}/{title}"
                />
                <div className="flex flex-wrap gap-1.5">
                  {FILE_ORGANIZATION_VARS.map((v) => (
                    <code key={v.variable} className="px-2 py-0.5 rounded bg-surface-800 text-xs text-primary-300 cursor-pointer hover:bg-surface-700"
                      onClick={() => useSettingsStore.setState((s) => ({
                        settings: { ...s.settings, fileOrganization: { ...s.settings.fileOrganization, pattern: s.settings.fileOrganization.pattern + v.variable } }
                      }))}>
                      {v.variable}
                    </code>
                  ))}
                </div>
                <Switch
                  checked={settings.fileOrganization.sanitizeNames}
                  onChange={(v) => handleUpdate({ fileOrganization: { ...settings.fileOrganization, sanitizeNames: v } })}
                  label="Sanitize File Names"
                  description="Remove invalid characters from file names"
                />
                <Button size="sm" variant="primary" onClick={() => handleUpdate({ fileOrganization: settings.fileOrganization })}>
                  Save Pattern
                </Button>
              </div>
            )}
          </Section>

          <Separator />

          {/* Duplicate Detection */}
          <Section title="Duplicate Detection">
            <Switch
              checked={settings.deduplicationEnabled}
              onChange={(v) => handleUpdate({ deduplicationEnabled: v })}
              label="Detect Duplicates"
              description="Prevent downloading songs already in your library"
            />
            {settings.deduplicationEnabled && (
              <Select
                label="When Duplicate Found"
                value={settings.deduplicationStrategy}
                onChange={(v) => handleUpdate({ deduplicationStrategy: v as AppSettings['deduplicationStrategy'] })}
                options={[
                  { value: 'skip', label: 'Skip download' },
                  { value: 'replace', label: 'Replace existing' },
                  { value: 'rename', label: 'Rename new file' }
                ]}
              />
            )}
          </Section>

          <Separator />

          {/* Download Queue */}
          <Section title="Download Queue" description="Control parallel download behavior">
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <label className="text-xs text-surface-400 w-40 shrink-0">Concurrent Downloads</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={settings.maxConcurrentDownloads}
                    onChange={(e) => useSettingsStore.setState((s) => ({
                      settings: { ...s.settings, maxConcurrentDownloads: parseInt(e.target.value) }
                    }))}
                    className="flex-1 accent-primary-500"
                    style={{ width: 120 }}
                  />
                  <span className="text-sm text-surface-200 w-6">{settings.maxConcurrentDownloads}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="text-xs text-surface-400 w-40 shrink-0">Max Retries</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={settings.maxRetries}
                    onChange={(e) => useSettingsStore.setState((s) => ({
                      settings: { ...s.settings, maxRetries: parseInt(e.target.value) }
                    }))}
                    className="flex-1 accent-primary-500"
                    style={{ width: 120 }}
                  />
                  <span className="text-sm text-surface-200 w-6">{settings.maxRetries}</span>
                </div>
              </div>
            </div>
            <Button size="sm" variant="primary" onClick={() => handleUpdate({ maxConcurrentDownloads: settings.maxConcurrentDownloads, maxRetries: settings.maxRetries })}>
              Save
            </Button>
          </Section>

          <Separator />

          {/* Dependencies */}
          <Section title="Dependencies" description="External tools required for downloading">
            <div className="space-y-3">
              <DepStatus status={ytdlpStatus} label="yt-dlp" />
              <DepStatus status={ffmpegStatus} label="ffmpeg" />
            </div>
            <div className="space-y-3">
              <Input
                label="yt-dlp Path"
                value={settings.ytdlpPath}
                onChange={(e) => useSettingsStore.setState((s) => ({ settings: { ...s.settings, ytdlpPath: e.target.value } }))}
                placeholder="yt-dlp"
              />
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => handleUpdate({ ytdlpPath: settings.ytdlpPath })}>
                  Save Path
                </Button>
                <Button size="sm" variant="secondary" onClick={handleUpdateYtdlp}>
                  <Download size={13} /> Update yt-dlp
                </Button>
                <Button size="sm" variant="ghost" onClick={checkDeps}>
                  <RefreshCw size={13} /> Recheck
                </Button>
              </div>
            </div>
          </Section>

          <Separator />

          {/* Advanced */}
          <Section title="Advanced" description="Proxy, rate limiting, and cookies">
            <Input
              label="Proxy URL"
              value={settings.proxyUrl || ''}
              onChange={(e) => useSettingsStore.setState((s) => ({ settings: { ...s.settings, proxyUrl: e.target.value || null } }))}
              placeholder="http://proxy:port"
            />
            <Input
              label="Rate Limit"
              value={settings.rateLimit || ''}
              onChange={(e) => useSettingsStore.setState((s) => ({ settings: { ...s.settings, rateLimit: e.target.value || null } }))}
              placeholder="e.g. 1M (1 MB/s)"
            />
            <Input
              label="Cookies File"
              value={settings.cookiesPath || ''}
              onChange={(e) => useSettingsStore.setState((s) => ({ settings: { ...s.settings, cookiesPath: e.target.value || null } }))}
              placeholder="Path to cookies.txt"
            />
            <Button size="sm" variant="primary" onClick={() => handleUpdate({ proxyUrl: settings.proxyUrl, rateLimit: settings.rateLimit, cookiesPath: settings.cookiesPath })}>
              Save Advanced
            </Button>
          </Section>

          <Separator />

          {/* Maintenance */}
          <Section title="Maintenance">
            <Switch
              checked={settings.cleanupEnabled}
              onChange={(v) => handleUpdate({ cleanupEnabled: v })}
              label="Auto Cleanup"
              description="Automatically remove old download history"
            />
            {settings.cleanupEnabled && (
              <Input
                label="Keep History (days)"
                type="number"
                value={String(settings.cleanupDays)}
                onChange={(e) => useSettingsStore.setState((s) => ({ settings: { ...s.settings, cleanupDays: parseInt(e.target.value) || 30 } }))}
                className="w-32"
              />
            )}
          </Section>

        </div>
      </div>
    </div>
  )
}
