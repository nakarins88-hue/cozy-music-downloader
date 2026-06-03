import React from 'react'
import { clsx } from 'clsx'

interface ProgressProps {
  value: number
  className?: string
  barClassName?: string
  showLabel?: boolean
  animated?: boolean
  color?: 'primary' | 'success' | 'warning' | 'danger'
}

export function Progress({ value, className, barClassName, showLabel, animated, color = 'primary' }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, value))

  return (
    <div className={clsx('progress-bar', className)}>
      <div
        className={clsx(
          'progress-fill',
          {
            'bg-primary-500': color === 'primary',
            'bg-emerald-500': color === 'success',
            'bg-amber-500': color === 'warning',
            'bg-red-500': color === 'danger',
            'animate-pulse': animated && pct > 0 && pct < 100
          },
          barClassName
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
