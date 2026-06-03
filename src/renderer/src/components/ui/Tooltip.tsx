import React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

interface TooltipProps {
  content: string
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  delayDuration?: number
}

export function Tooltip({ content, children, side = 'top', delayDuration = 500 }: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            className="z-[300] px-2.5 py-1.5 text-xs rounded-lg bg-surface-700 border border-surface-600 text-surface-200 shadow-lg animate-fade-in"
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-surface-700" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
