"use client"

import { Lock, Undo2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function MealSlotConfirmButtons({
  hasItems,
  undoAvailable = false,
  isConfirmed = false,
  onClearOrUndo,
  onConfirm,
  onUnlock,
  compact = false,
}: {
  hasItems: boolean
  undoAvailable?: boolean
  isConfirmed?: boolean
  onClearOrUndo: () => void
  onConfirm: () => void
  onUnlock?: () => void
  compact?: boolean
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={isConfirmed || (!undoAvailable && !hasItems)}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onClearOrUndo()
        }}
        className={cn(
          "flex-1 rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-1",
          compact ? "h-8 text-[10px]" : "h-9 text-[11px] font-semibold",
          undoAvailable
            ? "border border-accent/35 bg-accent/10 text-accent hover:bg-accent/20"
            : "border border-border/60 bg-background/30 text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5",
          "disabled:opacity-40 disabled:pointer-events-none"
        )}
      >
        {undoAvailable ? (
          <>
            <Undo2 className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
            되돌리기
          </>
        ) : (
          "메뉴 비우기"
        )}
      </button>
      <button
        type="button"
        disabled={!hasItems}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (isConfirmed) onUnlock?.()
          else onConfirm()
        }}
        className={cn(
          "flex-1 rounded-lg font-semibold transition-colors inline-flex items-center justify-center gap-1",
          compact ? "h-8 text-[10px]" : "h-9 text-[11px]",
          isConfirmed
            ? "border border-amber-500/35 bg-amber-500/10 text-amber-400 hover:bg-amber-500/15"
            : "border border-accent/35 bg-accent/10 text-accent hover:bg-accent/20",
          "disabled:opacity-40 disabled:pointer-events-none"
        )}
      >
        {isConfirmed ? (
          <>
            <Lock className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
            수정
          </>
        ) : (
          "결정"
        )}
      </button>
    </div>
  )
}
