import * as React from "react"
import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-surface-border bg-white px-3.5 py-2.5 text-sm text-ink",
          "placeholder:text-ink-faint",
          "focus:border-accent-400 focus:ring-2 focus:ring-accent-100 focus:outline-none",
          "transition-shadow disabled:bg-surface-subtle disabled:text-ink-muted",
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
