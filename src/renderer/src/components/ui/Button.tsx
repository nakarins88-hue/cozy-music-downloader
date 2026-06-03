import React from 'react'
import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
  children?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', loading, disabled, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          'inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-primary-600 text-white hover:bg-primary-500 active:bg-primary-700': variant === 'primary',
            'bg-surface-800 text-surface-200 hover:bg-surface-700 border border-surface-700': variant === 'secondary',
            'text-surface-400 hover:bg-surface-800 hover:text-surface-200': variant === 'ghost',
            'bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/30': variant === 'danger',
            'h-7 px-3 text-xs rounded-md': size === 'sm',
            'h-9 px-4 text-sm rounded-lg': size === 'md',
            'h-11 px-6 text-base rounded-lg': size === 'lg',
            'h-9 w-9 rounded-lg': size === 'icon'
          },
          className
        )}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin" size={14} /> : null}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
