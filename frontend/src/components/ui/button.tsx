import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap gap-2 rounded-xl text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default:     "bg-brand-700 text-white shadow-brand-glow hover:bg-brand-800 active:bg-brand-900",
        accent:      "bg-accent-500 text-white shadow-accent-glow hover:bg-accent-600 active:bg-accent-700",
        destructive: "bg-danger text-white hover:bg-red-600",
        outline:     "border border-surface-border bg-white text-ink hover:bg-surface-subtle",
        secondary:   "bg-brand-50 text-brand-700 hover:bg-brand-100",
        ghost:       "text-ink-soft hover:bg-surface-subtle hover:text-ink",
        link:        "text-accent-600 underline-offset-4 hover:underline",
        success:     "bg-emerald-600 text-white hover:bg-emerald-700",
      },
      size: {
        default: "h-10 px-4",
        sm:      "h-9 px-3 text-sm",
        lg:      "h-11 px-6 text-base",
        icon:    "h-9 w-9 rounded-lg",
        "icon-sm": "h-8 w-8 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
