import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { clsx } from 'clsx'
import { useUiStore } from '../../store/uiStore'

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info
}

const COLORS = {
  success: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  error: 'text-red-400 bg-red-400/10 border-red-400/20',
  warning: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  info: 'text-blue-400 bg-blue-400/10 border-blue-400/20'
}

export function ToastContainer() {
  const { toasts, removeToast } = useUiStore()

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type]
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={clsx(
                'pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg',
                'bg-surface-900 max-w-sm w-full',
                COLORS[toast.type]
              )}
            >
              <Icon size={18} className="mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-100">{toast.title}</p>
                {toast.message && (
                  <p className="mt-0.5 text-xs text-surface-400">{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-0.5 rounded text-surface-500 hover:text-surface-300 shrink-0"
              >
                <X size={14} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
