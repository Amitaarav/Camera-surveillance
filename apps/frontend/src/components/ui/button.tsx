import * as React from "react"
import { cn } from "../../lib/utils"
import { Loader2 } from "lucide-react"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
  isLoading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {

    const baseStyles = "inline-flex mt-6 items-center justify-center whitespace-nowrap rounded-global font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
    const variants = {
      primary: "bg-primary text-white shadow-sm hover:bg-primary-hover",
      secondary: "bg-card text-text-primary shadow-sm border border-border hover:bg-surface-hover",
      outline: "border border-border bg-transparent shadow-sm hover:bg-surface-hover text-text-primary",
      ghost: "hover:bg-surface-hover text-text-secondary hover:text-text-primary",
      danger: "bg-danger text-white shadow-sm hover:bg-danger/90",
    }
    
    const sizes = {
      sm: "h-8 px-[calc(var(--spacing-btn-x)*0.75)] py-[calc(var(--spacing-btn-y)*0.5)] text-xs",
      md: "h-9 px-btn-x py-btn-y text-sm",
      lg: "h-10 px-[calc(var(--spacing-btn-x)*1.5)] py-[calc(var(--spacing-btn-y)*1.5)] text-base",
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spinner" />}
        {children}
      </button>
    )
  }
)

Button.displayName = "Button"
