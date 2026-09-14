import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 backdrop-blur-md transition-all overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-white/20 bg-white/10 text-white [a&]:hover:bg-white/15",
        secondary:
          "border-[#6D5DFB]/35 bg-[#6D5DFB]/15 text-[#C7D2FE] [a&]:hover:bg-[#6D5DFB]/25",
        destructive:
          "border-rose-500/35 bg-rose-500/15 text-rose-200 [a&]:hover:bg-rose-500/25",
        outline:
          "border-white/15 text-slate-200 hover:border-white/30 [a&]:hover:bg-white/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
