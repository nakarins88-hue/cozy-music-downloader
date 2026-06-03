import React from 'react'
import { Minus, Square, X } from 'lucide-react'

export function TitleBar() {
  return (
    <div className="h-8 flex items-center justify-between px-4 bg-surface-950 border-b border-surface-800 titlebar-drag shrink-0">
      <div className="w-24" />
      <span className="text-xs text-surface-600 select-none">Cozy Music Downloader</span>
      <div className="flex items-center gap-1 no-drag">
        <button
          onClick={() => window.api.app.minimize()}
          className="w-8 h-6 flex items-center justify-center rounded text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-colors"
        >
          <Minus size={12} />
        </button>
        <button
          onClick={() => window.api.app.maximize()}
          className="w-8 h-6 flex items-center justify-center rounded text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-colors"
        >
          <Square size={11} />
        </button>
        <button
          onClick={() => window.api.app.close()}
          className="w-8 h-6 flex items-center justify-center rounded text-surface-500 hover:text-white hover:bg-red-600 transition-colors"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}
