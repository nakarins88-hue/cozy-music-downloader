import React, { useState, useEffect } from 'react'
import { ScrollText, Trash2, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'
import { Button, Select, Badge } from '../components/ui'
import { useUiStore } from '../store/uiStore'

interface LogEntry {
  id: string
  level: string
  message: string
  context: string | null
  metadata: string | null
  timestamp: string
}

const LEVEL_COLORS: Record<string, string> = {
  error: 'text-red-400',
  warn: 'text-amber-400',
  info: 'text-blue-400',
  debug: 'text-surface-500'
}

const LEVEL_BADGES: Record<string, string> = {
  error: 'bg-red-500/20 text-red-300',
  warn: 'bg-amber-500/20 text-amber-300',
  info: 'bg-blue-500/20 text-blue-300',
  debug: 'bg-surface-700 text-surface-400'
}

export function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const { addToast } = useUiStore()

  const loadLogs = async () => {
    setLoading(true)
    try {
      const data = await window.api.logs.get(500, 0)
      setLogs(data as unknown as LogEntry[])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const handleClear = async () => {
    await window.api.logs.clear()
    setLogs([])
    addToast({ type: 'success', title: 'Logs cleared' })
  }

  const filtered = filter === 'all' ? logs : logs.filter((l) => l.level === filter)

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4 border-b border-surface-800">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-surface-100">Logs</h1>
          <div className="flex items-center gap-2">
            <Select
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All Levels' },
                { value: 'error', label: 'Errors' },
                { value: 'warn', label: 'Warnings' },
                { value: 'info', label: 'Info' },
                { value: 'debug', label: 'Debug' }
              ]}
              className="w-36"
            />
            <Button size="sm" variant="ghost" onClick={loadLogs} loading={loading}>
              <RefreshCw size={13} />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleClear}>
              <Trash2 size={13} /> Clear
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto font-mono text-xs">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20">
            <ScrollText size={40} className="text-surface-700 mb-3" />
            <p className="text-surface-500">No log entries</p>
          </div>
        ) : (
          <div className="p-2 space-y-px">
            {filtered.map((log) => (
              <div key={log.id} className="flex items-start gap-2 px-3 py-1.5 rounded hover:bg-surface-900/50">
                <span className="text-surface-700 shrink-0 w-36">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={clsx('w-12 shrink-0 font-semibold uppercase text-[10px]', LEVEL_COLORS[log.level])}>
                  {log.level}
                </span>
                {log.context && (
                  <span className="text-primary-600 shrink-0">[{log.context}]</span>
                )}
                <span className={clsx('flex-1 break-all', LEVEL_COLORS[log.level] || 'text-surface-400')}>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
