import React from 'react'
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
import { clsx } from 'clsx'

interface ScrollAreaProps {
  children: React.ReactNode
  className?: string
  viewportClassName?: string
}

export function ScrollArea({ children, className, viewportClassName }: ScrollAreaProps) {
  return (
    <ScrollAreaPrimitive.Root className={clsx('overflow-hidden', className)}>
      <ScrollAreaPrimitive.Viewport className={clsx('h-full w-full', viewportClassName)}>
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar
        orientation="vertical"
        className="flex w-1.5 p-0.5 transition-opacity duration-150 hover:w-2"
      >
        <ScrollAreaPrimitive.Thumb className="flex-1 rounded-full bg-surface-600 hover:bg-surface-500" />
      </ScrollAreaPrimitive.Scrollbar>
    </ScrollAreaPrimitive.Root>
  )
}
