import React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { clsx } from 'clsx'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Modal({ open, onClose, title, description, children, size = 'md', className }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content
          className={clsx(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
            'bg-surface-900 border border-surface-700 rounded-xl shadow-2xl',
            'animate-slide-up focus:outline-none',
            {
              'w-full max-w-sm': size === 'sm',
              'w-full max-w-md': size === 'md',
              'w-full max-w-lg': size === 'lg',
              'w-full max-w-2xl': size === 'xl'
            },
            className
          )}
        >
          {(title || description) && (
            <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-surface-800">
              <div>
                {title && (
                  <Dialog.Title className="text-base font-semibold text-surface-100">{title}</Dialog.Title>
                )}
                {description && (
                  <Dialog.Description className="mt-1 text-sm text-surface-400">{description}</Dialog.Description>
                )}
              </div>
              <Dialog.Close asChild>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-800 transition-colors"
                >
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>
          )}
          <div className="p-6">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
