import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-[14.5px] font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-[#4169E1] focus-visible:ring-2 focus-visible:ring-[#4169E1]/25 aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-[#4169E1] text-white hover:bg-[#5B7CFF] shadow-[0_4px_16px_rgba(65,105,225,0.28)] hover:shadow-[0_6px_22px_rgba(91,124,255,0.36)] hover:-translate-y-0.5",
        destructive:
          "bg-[#EF4444] text-white hover:bg-[#DC2626] shadow-xs hover:-translate-y-0.5",
        outline:
          "border border-white/12 bg-white/[0.04] text-[#F8FAFF] hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-0.5",
        secondary:
          "bg-white/[0.06] text-[#F8FAFF] border border-white/12 hover:bg-white/[0.10] hover:border-white/20 shadow-xs hover:-translate-y-0.5",
        ghost:
          "text-[#B8C5E0] hover:bg-white/[0.08] hover:text-[#F8FAFF]",
        link: "text-[#8EA7FF] underline-offset-4 hover:underline hover:text-[#5B7CFF]",
      },
      size: {
        default: "h-11 px-5 py-2.5 has-[>svg]:px-3.5",
        sm: "h-9 rounded-lg gap-1.5 px-3.5 text-xs has-[>svg]:px-2.5",
        lg: "h-12 rounded-xl px-6 text-base has-[>svg]:px-4.5",
        icon: "size-10 rounded-xl",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-12 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
