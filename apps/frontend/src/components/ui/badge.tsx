import * as React from "react"
import { cn } from "../../lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "danger" | "outline" | "secondary"
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const baseStyles = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-border-focus"
  
  const variants = {
    default: "border-transparent bg-primary text-white hover:bg-primary-hover",
    secondary: "border-transparent bg-surface-hover text-text-secondary",
    success: "border-transparent bg-success-bg text-success",
    warning: "border-transparent bg-warning-bg text-warning",
    danger: "border-transparent bg-danger-bg text-danger",
    outline: "text-text-primary border border-border",
  }

  return (
    <div className={cn(baseStyles, variants[variant], className)} {...props} />
  )
}
