import React from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import { clsx } from 'clsx'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
}

export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      {(label || description) && (
        <div className="flex-1">
          {label && <p className="text-sm font-medium text-surface-200">{label}</p>}
          {description && <p className="text-xs text-surface-500 mt-0.5">{description}</p>}
        </div>
      )}
      <SwitchPrimitive.Root
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className={clsx(
          'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus:outline-none',
          'focus-visible:ring-2 focus-visible:ring-primary-500/50',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          checked ? 'bg-primary-600' : 'bg-surface-700'
        )}
      >
        <SwitchPrimitive.Thumb
          className={clsx(
            'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm',
            'transition-transform duration-200 mt-0.5',
            checked ? 'translate-x-4' : 'translate-x-0.5'
          )}
        />
      </SwitchPrimitive.Root>
    </div>
  )
}
