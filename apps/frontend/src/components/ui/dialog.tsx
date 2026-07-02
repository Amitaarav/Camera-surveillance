import * as React from "react"
import { cn } from "../../lib/utils"
import { X } from "lucide-react"

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={() => onOpenChange(false)}
      />
      <div className="z-50 w-full max-w-lg animate-scale-in p-4 sm:p-0">
        {children}
      </div>
    </div>
  )
}

export function DialogContent({ className, children, onClose }: { className?: string, children: React.ReactNode, onClose: () => void }) {
  return (
    <div className={cn("relative rounded-card border border-border bg-card p-6 shadow-card", className)}>
      <button 
        onClick={onClose}
        className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-border-focus"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </button>
      {children}
    </div>
  )
}

export function DialogHeader({ className, children }: { className?: string, children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left mb-4", className)}>
      {children}
    </div>
  )
}

export function DialogTitle({ className, children }: { className?: string, children: React.ReactNode }) {
  return (
    <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>
      {children}
    </h2>
  )
}

export function DialogDescription({ className, children }: { className?: string, children: React.ReactNode }) {
  return (
    <p className={cn("text-sm text-text-secondary", className)}>
      {children}
    </p>
  )
}

export function DialogFooter({ className, children }: { className?: string, children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6", className)}>
      {children}
    </div>
  )
}
