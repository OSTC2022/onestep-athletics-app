"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Pencil } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { formatMacroG } from "@/lib/food-nutrition-utils"
import { cn } from "@/lib/utils"

const C = {
  textSub: "#888888",
  water: "#5eb8ff",
} as const

const QUICK_ADD = [
  { label: "120ml", ml: 120 },
  { label: "500ml", ml: 500 },
  { label: "1L", ml: 1000 },
] as const

export function WaterIntakeRow({
  consumedL,
  targetL,
  guideNote,
  onChange,
  onAddMl,
  className,
}: {
  consumedL: number
  targetL: number
  guideNote?: string
  onChange: (waterL: number) => void
  onAddMl: (ml: number) => void
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(consumedL))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) {
      setValue(String(consumedL))
    }
  }, [consumedL, editing])

  const openEdit = () => {
    setValue(String(consumedL))
    setEditing(true)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const cancel = () => {
    setValue(String(consumedL))
    setEditing(false)
  }

  const commit = () => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed < 0) {
      cancel()
      return
    }
    const rounded = Math.round(parsed * 10) / 10
    onChange(rounded)
    setValue(String(rounded))
    setEditing(false)
  }

  const waterProgress = Math.min(
    100,
    Math.round((consumedL / Math.max(0.1, targetL)) * 100)
  )

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-2 text-[13px] min-h-7">
      <span className="shrink-0" style={{ color: C.textSub }}>
        수분
      </span>

      {!editing ? (
        <div className="flex items-center gap-1 flex-1 min-w-0 flex-wrap">
          {QUICK_ADD.map(({ label, ml }) => (
            <button
              key={label}
              type="button"
              onClick={() => onAddMl(ml)}
              className="h-6 px-2 rounded-md text-[10px] font-semibold shrink-0 border border-border/60 bg-[#1a1a1a] hover:bg-[#242424] hover:border-accent/40 text-foreground transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex-1 min-w-0" />
      )}

      {editing ? (
        <span className="inline-flex items-center gap-1 shrink-0 tabular-nums font-medium text-foreground">
          <Input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            step="0.1"
            min={0}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                commit()
              }
              if (e.key === "Escape") {
                e.preventDefault()
                cancel()
              }
            }}
            className="h-7 w-[3.5rem] px-1.5 py-0 text-[13px] font-medium tabular-nums bg-white/[0.06] border-accent/50 rounded-md"
            aria-label="수분 섭취량"
          />
          <button
            type="button"
            onClick={commit}
            className="h-7 px-2 rounded-md text-[11px] font-semibold shrink-0 flex items-center gap-0.5 text-accent bg-accent/15 hover:bg-accent/25 transition-colors"
          >
            <Check className="h-3 w-3" />
            저장
          </button>
          <span>/{formatMacroG(targetL)}L</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-0.5 shrink-0 tabular-nums font-medium text-foreground ml-auto">
          <button
            type="button"
            onClick={openEdit}
            className="tabular-nums hover:text-accent transition-colors"
            aria-label="수분 섭취량 수정"
          >
            {formatMacroG(consumedL)}
          </button>
          <button
            type="button"
            onClick={openEdit}
            className="h-6 w-6 flex items-center justify-center shrink-0 rounded-md border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
            aria-label="수분 섭취량 수정"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <span>/{formatMacroG(targetL)}L</span>
        </span>
      )}
      </div>

      <div>
        <div className="flex items-center justify-between text-[10px] mb-0.5 gap-2">
          <span style={{ color: C.textSub }}>수분 섭취량</span>
          <span
            className="tabular-nums font-medium shrink-0"
            style={{ color: C.water }}
          >
            {waterProgress}%
          </span>
        </div>
        <Progress
          value={waterProgress}
          className="h-1 bg-[#142030] [&_[data-slot=progress-indicator]]:bg-[#5eb8ff]"
        />
        {guideNote ? (
          <p className="text-[10px] mt-1 leading-relaxed" style={{ color: C.textSub }}>
            {guideNote}
          </p>
        ) : null}
      </div>
    </div>
  )
}
