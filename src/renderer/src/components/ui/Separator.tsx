import React from 'react'
import * as SeparatorPrimitive from '@radix-ui/react-separator'
import { clsx } from 'clsx'

interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function Separator({ orientation = 'horizontal', className }: SeparatorProps) {
  return (
    <SeparatorPrimitive.Root
      orientation={orientation}
      className={clsx(
        'bg-surface-800',
        orientation === 'horizontal' ? 'h-px w-full' : 'w-px h-full',
        className
      )}
    />
  )
}
