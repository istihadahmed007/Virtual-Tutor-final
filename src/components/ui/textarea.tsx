import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "glass-input field-sizing-content min-h-24 w-full rounded-xl p-4 text-[15px] text-[#F8FAFF] placeholder:text-[#8493B3] border border-white/10 shadow-xs transition-all outline-none disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:border-[#4169E1] focus-visible:ring-2 focus-visible:ring-[#4169E1]/25 focus-visible:bg-white/[0.07]",
        "aria-invalid:ring-destructive/30 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
