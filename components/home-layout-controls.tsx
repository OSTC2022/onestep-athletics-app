"use client"

import { LayoutGrid, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function HomeLayoutEditBar({
  onDone,
  onReset,
}: {
  onDone: () => void
  onReset: () => void
}) {
  return (
    <div className="sticky bottom-[72px] z-30 mx-4 mb-2 rounded-2xl border border-accent/40 bg-black/95 backdrop-blur-md px-3 py-2.5 flex items-center justify-between gap-2 shadow-lg">
      <div className="flex items-center gap-1.5 text-[12px] text-accent min-w-0">
        <LayoutGrid className="h-4 w-4 shrink-0" />
        <span className="font-medium truncate">드래그로 순서 · 탭으로 너비·숨기기</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-[11px] text-muted-foreground"
          onClick={onReset}
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          초기화
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-8 px-3 text-[12px] bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={onDone}
        >
          완료
        </Button>
      </div>
    </div>
  )
}

export function HomeEditToggleButton({
  editing,
  onClick,
}: {
  editing: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 px-2.5 rounded-xl text-[12px] font-medium flex items-center gap-1.5 transition-colors",
        editing
          ? "bg-accent/20 text-accent"
          : "text-muted-foreground hover:text-foreground"
      )}
      style={{ backgroundColor: editing ? undefined : "#1a1a1a" }}
    >
      <LayoutGrid className="h-3.5 w-3.5" />
      {editing ? "편집 중" : "편집"}
    </button>
  )
}
