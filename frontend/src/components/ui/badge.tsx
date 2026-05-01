import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:     "bg-brand-50 text-brand-700",
        secondary:   "bg-surface-subtle text-ink-soft",
        accent:      "bg-accent-50 text-accent-700",
        destructive: "bg-danger-soft text-red-700",
        outline:     "border border-surface-border text-ink-soft",
        success:     "bg-success-soft text-emerald-700",
        warning:     "bg-warning-soft text-amber-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
