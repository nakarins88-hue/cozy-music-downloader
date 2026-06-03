import React from 'react'
import { clsx } from 'clsx'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: React.ReactNode
  rightElement?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightElement, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-medium text-surface-400">{label}</label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-surface-500 pointer-events-none">{leftIcon}</div>
          )}
          <input
            ref={ref}
            className={clsx(
              'w-full rounded-lg bg-surface-800 border border-surface-700 py-2 text-sm text-surface-100',
              'placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50',
              'transition-all duration-150',
              leftIcon ? 'pl-9' : 'pl-3',
              rightElement ? 'pr-10' : 'pr-3',
              error && 'border-red-500/50 focus:ring-red-500/30',
              className
            )}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-2">{rightElement}</div>
          )}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
