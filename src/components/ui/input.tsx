import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "glass-input h-12 w-full min-w-0 rounded-xl px-4 py-3 text-[15px] text-[#F8FAFF] placeholder:text-[#8493B3] border border-white/10 shadow-xs transition-all outline-none disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:border-[#4169E1] focus-visible:ring-2 focus-visible:ring-[#4169E1]/25 focus-visible:bg-white/[0.07]",
        "aria-invalid:ring-destructive/30 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
