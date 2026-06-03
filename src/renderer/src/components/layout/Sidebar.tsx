import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download, Library, ListMusic, Settings, ScrollText,
  ChevronLeft, ChevronRight, Music2
} from 'lucide-react'
import { clsx } from 'clsx'
import { useUiStore, type ActivePage } from '../../store/uiStore'
import { useDownloadStore } from '../../store/downloadStore'
import { Tooltip } from '../ui/Tooltip'

interface NavItem {
  id: ActivePage
  icon: React.ElementType
  label: string
  badge?: number
}

const NAV_ITEMS: NavItem[] = [
  { id: 'downloads', icon: Download, label: 'Downloads' },
  { id: 'library', icon: Library, label: 'Library' },
  { id: 'playlists', icon: ListMusic, label: 'Playlists' },
  { id: 'settings', icon: Settings, label: 'Settings' },
  { id: 'logs', icon: ScrollText, label: 'Logs' }
]

export function Sidebar() {
  const { activePage, setActivePage, sidebarCollapsed, toggleSidebar } = useUiStore()
  const items = useDownloadStore((s) => s.items)
  const activeDownloads = items.filter((i) => ['downloading', 'pending', 'queued'].includes(i.status)).length

  const navItems = NAV_ITEMS.map((item) => ({
    ...item,
    badge: item.id === 'downloads' && activeDownloads > 0 ? activeDownloads : undefined
  }))

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 64 : 200 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="relative flex flex-col shrink-0 bg-surface-950 border-r border-surface-800 z-10"
    >
      {/* Logo */}
      <div className={clsx(
        'flex items-center gap-3 px-4 py-5 border-b border-surface-800 titlebar-drag',
        sidebarCollapsed && 'justify-center px-0'
      )}>
        <div className="shrink-0 w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
          <Music2 size={16} className="text-white" />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-semibold text-sm text-surface-100 whitespace-nowrap"
            >
              Cozy Music
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activePage === item.id

          const button = (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={clsx(
                'relative w-full flex items-center gap-3 rounded-lg transition-all duration-150 no-drag',
                sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2',
                isActive
                  ? 'bg-primary-600/20 text-primary-300'
                  : 'text-surface-400 hover:bg-surface-800 hover:text-surface-200'
              )}
            >
              <Icon size={18} className="shrink-0" />
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm font-medium whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {item.badge !== undefined && (
                <AnimatePresence>
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className={clsx(
                      'absolute flex items-center justify-center rounded-full text-xs font-bold bg-primary-600 text-white',
                      sidebarCollapsed
                        ? 'top-0.5 right-0.5 w-4 h-4 text-[9px]'
                        : 'right-2 w-5 h-5 text-xs'
                    )}
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </motion.span>
                </AnimatePresence>
              )}
            </button>
          )

          return sidebarCollapsed ? (
            <Tooltip key={item.id} content={item.label} side="right">
              {button}
            </Tooltip>
          ) : button
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-surface-800">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center p-2 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-800 transition-colors no-drag"
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </motion.aside>
  )
}
