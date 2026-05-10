import * as React from 'react'
import { cn } from '@/lib/utils'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'muted' | 'info'

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-200',
  danger: 'bg-rose-100 text-rose-800 border-rose-200',
  muted: 'bg-slate-100 text-slate-700 border-slate-200',
  info: 'bg-sky-100 text-sky-800 border-sky-200',
}

export function Badge({
  variant = 'default',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    />
  )
}
