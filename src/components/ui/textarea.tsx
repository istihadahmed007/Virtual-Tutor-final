import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "glass-input field-sizing-content min-h-20 w-full rounded-2xl p-3.5 text-sm text-white placeholder:text-slate-400/70 border border-white/12 shadow-xs transition-all outline-none disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:border-[#6D5DFB] focus-visible:ring-2 focus-visible:ring-[#6D5DFB]/25 focus-visible:bg-white/[0.08]",
        "aria-invalid:ring-destructive/30 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
