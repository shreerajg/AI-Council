import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-xl border border-border/60 bg-background/50 px-4 py-3 text-sm transition-all outline-none placeholder:text-muted-foreground/50 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
        "focus:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:shadow-md focus:shadow-primary/10",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
