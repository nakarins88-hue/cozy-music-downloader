import React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { ChevronDown, Check } from 'lucide-react'
import { clsx } from 'clsx'

interface SelectOption {
  value: string
  label: string
  description?: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  label?: string
  className?: string
  disabled?: boolean
}

export function Select({ value, onChange, options, placeholder = 'Select...', label, className, disabled }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-surface-400">{label}</label>}
      <SelectPrimitive.Root value={value} onValueChange={onChange} disabled={disabled}>
        <SelectPrimitive.Trigger
          className={clsx(
            'flex h-9 w-full items-center justify-between rounded-lg bg-surface-800 border border-surface-700',
            'px-3 text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40',
            'disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150',
            'data-[placeholder]:text-surface-500',
            className
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon>
            <ChevronDown size={14} className="text-surface-400" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="z-[200] overflow-hidden bg-surface-800 border border-surface-700 rounded-xl shadow-2xl"
            position="popper"
            sideOffset={4}
          >
            <SelectPrimitive.Viewport className="p-1">
              {options.map((opt) => (
                <SelectPrimitive.Item
                  key={opt.value}
                  value={opt.value}
                  className={clsx(
                    'relative flex items-center gap-3 px-3 py-2 text-sm rounded-lg cursor-default',
                    'text-surface-200 focus:bg-surface-700 focus:outline-none',
                    'data-[state=checked]:text-primary-300'
                  )}
                >
                  <SelectPrimitive.ItemText>
                    <div>
                      <div>{opt.label}</div>
                      {opt.description && (
                        <div className="text-xs text-surface-500">{opt.description}</div>
                      )}
                    </div>
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="ml-auto">
                    <Check size={14} className="text-primary-400" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  )
}
