import React from 'react'
import { clsx } from 'clsx'
import type { DownloadStatus } from '../../../../shared/types'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({ children, variant = 'default', size = 'md', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium',
        {
          'bg-surface-700 text-surface-300': variant === 'default',
          'bg-primary-600/20 text-primary-300': variant === 'primary',
          'bg-emerald-600/20 text-emerald-300': variant === 'success',
          'bg-amber-600/20 text-amber-300': variant === 'warning',
          'bg-red-600/20 text-red-300': variant === 'danger',
          'bg-blue-600/20 text-blue-300': variant === 'info',
          'px-2 py-0.5 text-xs': size === 'sm',
          'px-2.5 py-1 text-xs': size === 'md'
        },
        className
      )}
    >
      {children}
    </span>
  )
}

const STATUS_MAP: Record<DownloadStatus, { label: string; variant: BadgeProps['variant'] }> = {
  queued: { label: 'Queued', variant: 'default' },
  pending: { label: 'Pending', variant: 'info' },
  downloading: { label: 'Downloading', variant: 'primary' },
  processing: { label: 'Processing', variant: 'info' },
  completed: { label: 'Complete', variant: 'success' },
  failed: { label: 'Failed', variant: 'danger' },
  paused: { label: 'Paused', variant: 'warning' },
  cancelled: { label: 'Cancelled', variant: 'default' }
}

export function StatusBadge({ status }: { status: DownloadStatus }) {
  const { label, variant } = STATUS_MAP[status] || { label: status, variant: 'default' }
  return <Badge variant={variant} size="sm">{label}</Badge>
}
