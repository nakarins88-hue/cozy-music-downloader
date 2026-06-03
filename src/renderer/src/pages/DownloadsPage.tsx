import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Link, Plus, Trash2, Pause, Play, X, RotateCcw,
  ChevronDown, ChevronUp, Download, Clipboard, CheckCircle
} from 'lucide-react'
import { clsx } from 'clsx'
import { useDownloadStore } from '../store/downloadStore'
import { useSettingsStore } from '../store/settingsStore'
import { useUiStore } from '../store/uiStore'
import { Button, Input, Progress, StatusBadge, Select, Badge } from '../components/ui'
import type { DownloadItem } from '../../../shared/types'
import { AUDIO_FORMATS, AUDIO_QUALITIES } from '../../../shared/constants'

function DownloadCard({ item }: { item: DownloadItem }) {
  const { pause, resume, cancel, retry } = useDownloadStore()
  const { addToast } = useUiStore()
  const [expanded, setExpanded] = useState(false)

  const isActive = ['downloading', 'pending', 'queued', 'processing'].includes(item.status)

  const handleReveal = async () => {
    if (item.filePath) {
      await window.api.app.revealFile(item.filePath)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="card overflow-visible"
    >
      <div className="p-3">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Thumbnail */}
          <div className="w-12 h-12 rounded-lg bg-surface-800 shrink-0 overflow-hidden flex items-center justify-center">
            {item.thumbnail ? (
              <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
            ) : (
              <Download size={18} className="text-surface-600" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-surface-100 truncate max-w-xs">
                {item.title || item.url}
              </p>
              <StatusBadge status={item.status} />
            </div>
            {item.artist && (
              <p className="text-xs text-surface-500 mt-0.5 truncate">{item.artist}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {item.status === 'downloading' && (
              <Button size="icon" variant="ghost" onClick={() => pause(item.id)}>
                <Pause size={14} />
              </Button>
            )}
            {item.status === 'paused' && (
              <Button size="icon" variant="ghost" onClick={() => resume(item.id)}>
                <Play size={14} />
              </Button>
            )}
            {item.status === 'failed' && (
              <Button size="icon" variant="ghost" onClick={() => retry(item.id)}>
                <RotateCcw size={14} />
              </Button>
            )}
            {item.status === 'completed' && item.filePath && (
              <Button size="icon" variant="ghost" onClick={handleReveal}>
                <CheckCircle size={14} className="text-emerald-400" />
              </Button>
            )}
            {isActive && (
              <Button size="icon" variant="ghost" onClick={() => cancel(item.id)}>
                <X size={14} />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setExpanded((e) => !e)}
              className="text-surface-600"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>
          </div>
        </div>

        {/* Progress */}
        {(item.status === 'downloading' || item.status === 'processing') && (
          <div className="mt-2.5 space-y-1">
            <Progress value={item.progress} />
            <div className="flex items-center justify-between text-xs text-surface-500">
              <span>{item.progress.toFixed(1)}%</span>
              <div className="flex gap-3">
                {item.speed && <span>{item.speed}</span>}
                {item.eta && <span>ETA {item.eta}</span>}
              </div>
            </div>
          </div>
        )}

        {/* Expanded details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-surface-800 space-y-1.5">
                <InfoRow label="URL" value={item.url} truncate />
                <InfoRow label="Format" value={`${item.format.toUpperCase()} · Quality ${item.quality}`} />
                {item.duration && <InfoRow label="Duration" value={formatDuration(item.duration)} />}
                {item.filePath && <InfoRow label="Path" value={item.filePath} truncate />}
                {item.error && <InfoRow label="Error" value={item.error} className="text-red-400" />}
                {item.retryCount > 0 && <InfoRow label="Retries" value={`${item.retryCount}/${item.maxRetries}`} />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function InfoRow({ label, value, truncate, className }: { label: string; value: string; truncate?: boolean; className?: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="text-surface-600 w-16 shrink-0">{label}</span>
      <span className={clsx('text-surface-400 flex-1', truncate && 'truncate', className)}>{value}</span>
    </div>
  )
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

type TabId = 'active' | 'completed' | 'failed' | 'all'

export function DownloadsPage() {
  const [url, setUrl] = useState('')
  const [batchMode, setBatchMode] = useState(false)
  const [batchText, setBatchText] = useState('')
  const [format, setFormat] = useState('mp3')
  const [quality, setQuality] = useState('0')
  const [activeTab, setActiveTab] = useState<TabId>('active')
  const [isAdding, setIsAdding] = useState(false)

  const { items, addDownload, addBatch, clearCompleted } = useDownloadStore()
  const { addToast } = useUiStore()

  const filteredItems = items.filter((item) => {
    if (activeTab === 'active') return ['queued', 'pending', 'downloading', 'processing', 'paused'].includes(item.status)
    if (activeTab === 'completed') return item.status === 'completed'
    if (activeTab === 'failed') return item.status === 'failed'
    return true
  })

  const activeCount = items.filter((i) => ['queued', 'pending', 'downloading', 'processing', 'paused'].includes(i.status)).length
  const completedCount = items.filter((i) => i.status === 'completed').length
  const failedCount = items.filter((i) => i.status === 'failed').length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (batchMode) {
      const urls = batchText.split('\n').map((u) => u.trim()).filter(Boolean)
      if (!urls.length) return
      setIsAdding(true)
      try {
        await addBatch(urls)
        setBatchText('')
        addToast({ type: 'success', title: `Added ${urls.length} downloads` })
      } catch (err) {
        addToast({ type: 'error', title: 'Failed to add downloads', message: String(err) })
      } finally {
        setIsAdding(false)
      }
    } else {
      if (!url.trim()) return
      setIsAdding(true)
      try {
        await addDownload(url.trim())
        setUrl('')
        addToast({ type: 'success', title: 'Download added to queue' })
      } catch (err) {
        addToast({ type: 'error', title: 'Failed to add download', message: String(err) })
      } finally {
        setIsAdding(false)
      }
    }
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (batchMode) setBatchText((prev) => prev + (prev ? '\n' : '') + text.trim())
      else setUrl(text.trim())
    } catch {}
  }

  const TABS: Array<{ id: TabId; label: string; count?: number }> = [
    { id: 'active', label: 'Active', count: activeCount || undefined },
    { id: 'completed', label: 'Completed', count: completedCount || undefined },
    { id: 'failed', label: 'Failed', count: failedCount || undefined },
    { id: 'all', label: 'All' }
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-surface-800 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-surface-100">Downloads</h1>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setBatchMode((b) => !b)}>
              {batchMode ? 'Single' : 'Batch'}
            </Button>
            {completedCount > 0 && (
              <Button size="sm" variant="ghost" onClick={clearCompleted}>
                <Trash2 size={13} /> Clear Completed
              </Button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {batchMode ? (
            <textarea
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              placeholder="Paste URLs, one per line..."
              rows={4}
              className="w-full rounded-lg bg-surface-800 border border-surface-700 p-3 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none user-select-text"
            />
          ) : (
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste URL (YouTube, SoundCloud, Bandcamp...)"
              leftIcon={<Link size={14} />}
              rightElement={
                <button type="button" onClick={handlePaste} className="p-1 text-surface-500 hover:text-surface-300 transition-colors">
                  <Clipboard size={13} />
                </button>
              }
            />
          )}

          <div className="flex items-center gap-3">
            <Select
              value={format}
              onChange={setFormat}
              options={AUDIO_FORMATS as unknown as Array<{ value: string; label: string; description: string }>}
              className="flex-1"
            />
            <Select
              value={quality}
              onChange={setQuality}
              options={AUDIO_QUALITIES as unknown as Array<{ value: string; label: string }>}
              className="flex-1"
            />
            <Button type="submit" variant="primary" loading={isAdding} className="shrink-0">
              <Plus size={14} />
              {batchMode ? 'Add All' : 'Download'}
            </Button>
          </div>
        </form>

        {/* Tabs */}
        <div className="flex items-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                activeTab === tab.id
                  ? 'bg-surface-800 text-surface-100'
                  : 'text-surface-500 hover:text-surface-300'
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={clsx(
                  'inline-flex items-center justify-center w-5 h-5 rounded-full text-xs',
                  activeTab === tab.id ? 'bg-primary-600 text-white' : 'bg-surface-700 text-surface-400'
                )}>
                  {tab.count > 99 ? '99+' : tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Queue */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <AnimatePresence mode="popLayout">
          {filteredItems.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full text-center py-20"
            >
              <Download size={40} className="text-surface-700 mb-3" />
              <p className="text-surface-500 text-sm">
                {activeTab === 'active' ? 'No active downloads' :
                  activeTab === 'completed' ? 'No completed downloads' :
                  activeTab === 'failed' ? 'No failed downloads' : 'Queue is empty'}
              </p>
              <p className="text-surface-700 text-xs mt-1">Paste a URL above to start downloading</p>
            </motion.div>
          ) : (
            filteredItems.map((item) => (
              <DownloadCard key={item.id} item={item} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
