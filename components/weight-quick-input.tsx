"use client"

import { useEffect, useState } from "react"
import { Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { saveCurrentWeight } from "@/lib/nutrition"
import { cn } from "@/lib/utils"

const C = {
  lime: "#64b869",
  cardBtn: "#1a1a1a",
  textSub: "#888888",
  divider: "#1a1a1a",
} as const

export function WeightQuickInput({
  currentWeightKg,
  onSaved,
  compact = false,
  className,
}: {
  currentWeightKg: number
  onSaved?: (weightKg: number) => void
  compact?: boolean
  className?: string
}) {
  const [value, setValue] = useState(String(currentWeightKg))
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setValue(String(currentWeightKg))
  }, [currentWeightKg])

  const handleSave = () => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed <= 0) return
    const next = saveCurrentWeight(parsed)
    setValue(String(next))
    setSaved(true)
    onSaved?.(next)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("relative flex-1", compact ? "max-w-[120px]" : "")}>
        <Input
          type="number"
          inputMode="decimal"
          step="0.1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave()
          }}
          className={cn(
            "h-9 rounded-xl bg-black/40 border-border/60 text-white tabular-nums pr-8",
            compact ? "text-[13px]" : "text-sm"
          )}
          aria-label="현재 체중"
        />
        <span
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] pointer-events-none"
          style={{ color: C.textSub }}
        >
          kg
        </span>
      </div>
      <button
        type="button"
        onClick={handleSave}
        className={cn(
          "h-9 px-3 rounded-xl text-[12px] font-semibold shrink-0 flex items-center gap-1 transition-colors active:opacity-80",
          saved ? "bg-accent/20 text-accent" : "text-white"
        )}
        style={saved ? undefined : { backgroundColor: C.cardBtn }}
      >
        {saved ? (
          <>
            <Check className="h-3.5 w-3.5" />
            반영됨
          </>
        ) : (
          "저장"
        )}
      </button>
    </div>
  )
}

export function WeightSummaryLine({
  currentWeightKg,
  targetWeightKg,
  weightChangeKg,
}: {
  currentWeightKg: number
  targetWeightKg: number
  weightChangeKg: number
}) {
  return (
    <span className="text-[12px] leading-relaxed" style={{ color: C.textSub }}>
      현재{" "}
      <span className="text-white font-semibold tabular-nums">
        {currentWeightKg}kg
      </span>
      <span className="mx-1.5">·</span>
      목표{" "}
      <span className="tabular-nums">{targetWeightKg}kg</span>
      {weightChangeKg !== 0 && (
        <>
          <span className="mx-1.5">·</span>
          <span
            className="tabular-nums"
            style={{ color: weightChangeKg < 0 ? C.lime : undefined }}
          >
            {weightChangeKg > 0 ? "+" : ""}
            {weightChangeKg}kg
          </span>
          <span className="ml-0.5">(7일)</span>
        </>
      )}
    </span>
  )
}
