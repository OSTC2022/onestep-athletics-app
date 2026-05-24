import { cn } from "@/lib/utils"

/** Dark input — placeholder visible on black background */
export const FORM_INPUT_CLASS =
  "h-10 bg-black/90 border-border/50 text-foreground placeholder:text-foreground/70 focus-visible:border-accent/40"

export const FORM_INPUT_MONO_CLASS = cn(FORM_INPUT_CLASS, "font-mono")

export const FORM_SELECT_CLASS =
  "flex h-10 w-full min-w-0 rounded-md border border-border/50 bg-black/90 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export const FORM_TEXTAREA_CLASS =
  "resize-none text-sm bg-black/90 border-border/50 text-foreground placeholder:text-foreground/70 focus-visible:border-accent/40"
