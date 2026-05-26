"use client"

import { cn } from "@/lib/utils"

const C = {
  lime: "#64b869",
  limeGlow: "#70cb75",
  text: "#ffffff",
} as const

export function TrainingPhaseLine({
  label,
  text,
  highlight,
  active = false,
  compact = false,
}: {
  label: string
  text: string
  highlight?: string
  active?: boolean
  compact?: boolean
}) {
  const renderText = () => {
    if (!highlight || !text.includes(highlight)) return text
    const [before, after] = text.split(highlight)
    return (
      <>
        {before}
        <span style={{ color: C.lime }}>{highlight}</span>
        {after}
      </>
    )
  }

  return (
    <li
      className={cn(
        "flex items-start gap-[10px] leading-[22px]",
        compact ? "text-[13px]" : "text-[15px]"
      )}
    >
      <span
        className={cn(
          "mt-[7px] shrink-0 rounded-full",
          active ? "h-[6px] w-[6px]" : "h-[5px] w-[5px]"
        )}
        style={
          active
            ? {
                backgroundColor: C.limeGlow,
                boxShadow:
                  "0 0 3px 1px rgba(102, 184, 106, 0.7), 0 0 8px 2px rgba(85, 153, 97, 0.35)",
              }
            : { backgroundColor: C.lime }
        }
      />
      <div className="grid flex-1 min-w-0 grid-cols-[3.5rem_1fr] gap-x-3 items-start">
        <span
          className="whitespace-nowrap font-medium leading-[22px] text-[14px]"
          style={{ color: C.lime }}
        >
          {label}
        </span>
        <span className="min-w-0 leading-[22px]" style={{ color: C.text }}>
          {renderText()}
        </span>
      </div>
    </li>
  )
}
