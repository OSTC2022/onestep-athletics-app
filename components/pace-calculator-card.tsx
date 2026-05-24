"use client"

import { useMemo, useState } from "react"
import { ChevronDown, Timer } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  calculateLaneLapSplits,
  calculateTime,
  DISTANCE_PRESETS,
  formatDistance,
  formatDuration,
  formatLaneDistance,
  formatPacePerKm,
  getLaneDistance,
  LAP_INTERVAL_PRESETS,
  parsePacePerKm,
  type LapSplit,
} from "@/lib/pace-calculator"

const C = {
  lime: "#64b869",
  cardSection: "#0a0a0a",
  cardInner: "#060606",
  divider: "#1a1a1a",
  text: "#ffffff",
  textSub: "#888888",
  border: "#141414",
} as const

const LANES = [1, 2, 3, 4, 5, 6, 7, 8] as const

function LapTimesList({
  splits,
  compact = false,
}: {
  splits: LapSplit[]
  compact?: boolean
}) {
  if (splits.length === 0) {
    return (
      <p className="text-[10px]" style={{ color: C.textSub }}>
        Lap 구간을 설정하세요
      </p>
    )
  }

  return (
    <div className="space-y-0.5">
      <div
        className={cn(
          "grid grid-cols-[1.4fr_1fr_1fr] gap-1 text-[9px] uppercase tracking-wide pb-1 border-b",
          compact ? "text-[8px]" : "text-[9px]"
        )}
        style={{ color: C.textSub, borderColor: C.border }}
      >
        <span>구간</span>
        <span className="text-right">누적</span>
        <span className="text-right">Lap</span>
      </div>
      {splits.map((split) => (
        <div
          key={split.lapIndex}
          className={cn(
            "grid grid-cols-[1.4fr_1fr_1fr] gap-1 tabular-nums",
            compact ? "text-[9px] py-0.5" : "text-[10px] py-0.5"
          )}
        >
          <span style={{ color: C.textSub }}>
            {split.lapIndex}. {formatLaneDistance(split.laneCheckpointM)}
          </span>
          <span className="text-right font-medium" style={{ color: C.text }}>
            {formatDuration(split.cumulativeTimeSec)}
          </span>
          <span className="text-right" style={{ color: C.lime }}>
            {formatDuration(split.segmentTimeSec)}
            {!compact && (
              <span className="block text-[8px]" style={{ color: C.textSub }}>
                {formatPacePerKm(split.segmentPaceSecPerKm)}/km
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  )
}

function LaneLapPopover({
  lane,
  baseDistanceM,
  laneDistanceM,
  timeSec,
  lapIntervalM,
  paceSecPerKm,
}: {
  lane: number
  baseDistanceM: number
  laneDistanceM: number
  timeSec: number
  lapIntervalM: number
  paceSecPerKm: number
}) {
  const splits = useMemo(
    () =>
      calculateLaneLapSplits(baseDistanceM, lane, lapIntervalM, paceSecPerKm),
    [baseDistanceM, lane, lapIntervalM, paceSecPerKm]
  )

  const previewSplits = splits.slice(0, 3)

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-white/[0.04] active:scale-[0.98]"
              style={{
                backgroundColor: C.cardInner,
                border: `1px solid ${C.border}`,
              }}
            >
              <span className="text-[11px] font-medium" style={{ color: C.textSub }}>
                {lane}레인
              </span>
              <div className="text-right">
                <p
                  className="text-[12px] font-semibold tabular-nums leading-tight"
                  style={{ color: C.lime }}
                >
                  {formatDuration(timeSec)}
                </p>
                <p className="text-[9px] tabular-nums" style={{ color: C.textSub }}>
                  {formatLaneDistance(laneDistanceM)}
                </p>
              </div>
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="w-52 p-2 bg-[#111] text-white border-[#333]"
        >
          <p className="text-[10px] font-semibold mb-1.5">
            {lane}레인 · {formatDistance(baseDistanceM)} ·{" "}
            {formatDuration(timeSec)}
          </p>
          {splits.length > 0 ? (
            <>
              <LapTimesList splits={previewSplits} compact />
              {splits.length > 3 && (
                <p className="text-[9px] mt-1 opacity-70">탭하면 전체 Lap</p>
              )}
            </>
          ) : (
            <p className="text-[10px] opacity-80">Lap 구간을 입력하세요</p>
          )}
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        align="center"
        className="w-56 p-2.5 bg-[#0a0a0a] text-white border-[#222] max-h-56 overflow-y-auto"
      >
        <p className="text-[11px] font-semibold mb-2">
          {lane}레인 Lap · {formatDistance(lapIntervalM)} 구간
        </p>
        <p className="text-[10px] mb-2 tabular-nums" style={{ color: C.textSub }}>
          총 {formatDuration(timeSec)} · {formatLaneDistance(laneDistanceM)}
        </p>
        <LapTimesList splits={splits} />
      </PopoverContent>
    </Popover>
  )
}

export function PaceCalculatorCard() {
  const [open, setOpen] = useState(false)
  const [distanceM, setDistanceM] = useState(400)
  const [distanceInput, setDistanceInput] = useState("400")
  const [lapIntervalM, setLapIntervalM] = useState(100)
  const [lapIntervalInput, setLapIntervalInput] = useState("100")
  const [paceInput, setPaceInput] = useState("5:00")

  const paceSecPerKm = useMemo(() => parsePacePerKm(paceInput), [paceInput])

  const laneResults = useMemo(() => {
    if (!paceSecPerKm || distanceM <= 0) return null

    return LANES.map((lane) => {
      const laneDist = getLaneDistance(distanceM, lane)
      const timeSec = calculateTime(laneDist, paceSecPerKm)
      return { lane, distance: laneDist, timeSec }
    })
  }, [distanceM, paceSecPerKm])

  const applyDistance = (meters: number) => {
    setDistanceM(meters)
    setDistanceInput(String(Math.round(meters)))
  }

  const applyLapInterval = (meters: number) => {
    setLapIntervalM(meters)
    setLapIntervalInput(String(Math.round(meters)))
  }

  const handleDistanceChange = (value: string) => {
    setDistanceInput(value)
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed > 0) {
      setDistanceM(parsed)
    }
  }

  const handleLapIntervalChange = (value: string) => {
    setLapIntervalInput(value)
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed > 0) {
      setLapIntervalM(parsed)
    }
  }

  const mainTime =
    laneResults && paceSecPerKm
      ? formatDuration(calculateTime(distanceM, paceSecPerKm))
      : "—"

  return (
    <div
      className="rounded-2xl mb-3 overflow-hidden"
      style={{
        backgroundColor: C.cardSection,
        border: `1px solid ${C.divider}`,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-[18px] py-[14px] active:opacity-80"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Timer className="h-4 w-4 shrink-0" style={{ color: C.lime }} />
          <span className="font-semibold text-[15px] tracking-[-0.01em]">
            페이스 계산기
          </span>
          {!open && paceSecPerKm && distanceM > 0 && (
            <span
              className="text-[11px] tabular-nums truncate"
              style={{ color: C.textSub }}
            >
              {formatDistance(distanceM)} · {paceInput}/km → {mainTime}
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform",
            open && "rotate-180"
          )}
          style={{ color: C.textSub }}
        />
      </button>

      {open && (
        <div
          className="px-[18px] pb-[16px] pt-0 space-y-3 border-t"
          style={{ borderColor: C.border }}
        >
          <div className="space-y-2 pt-3">
            <div className="flex items-center gap-2">
              <label
                htmlFor="pace-distance"
                className="text-[11px] shrink-0 w-8"
                style={{ color: C.textSub }}
              >
                거리
              </label>
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <Input
                  id="pace-distance"
                  type="number"
                  min={1}
                  value={distanceInput}
                  onChange={(e) => handleDistanceChange(e.target.value)}
                  className="h-8 text-[13px] tabular-nums bg-[#111] border-[#222] px-2"
                />
                <span className="text-[11px] shrink-0" style={{ color: C.textSub }}>
                  m
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1">
              {DISTANCE_PRESETS.map((preset) => {
                const active = distanceM === preset.meters
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyDistance(preset.meters)}
                    className={cn(
                      "shrink-0 rounded-md px-2 py-1 text-[10px] font-medium border transition-colors",
                      active
                        ? "border-accent/50 bg-accent/15 text-accent"
                        : "border-[#222] bg-[#111] text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label
                htmlFor="lap-interval"
                className="text-[11px] shrink-0 w-8"
                style={{ color: C.textSub }}
              >
                Lap
              </label>
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <Input
                  id="lap-interval"
                  type="number"
                  min={1}
                  value={lapIntervalInput}
                  onChange={(e) => handleLapIntervalChange(e.target.value)}
                  className="h-8 text-[13px] tabular-nums bg-[#111] border-[#222] px-2"
                />
                <span className="text-[11px] shrink-0" style={{ color: C.textSub }}>
                  m
                </span>
              </div>
            </div>

            <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
              {LAP_INTERVAL_PRESETS.map((preset) => {
                const active = lapIntervalM === preset.meters
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyLapInterval(preset.meters)}
                    className={cn(
                      "shrink-0 rounded-md px-2 py-1 text-[10px] font-medium border transition-colors",
                      active
                        ? "border-accent/50 bg-accent/15 text-accent"
                        : "border-[#222] bg-[#111] text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="pace-per-km"
              className="text-[11px] shrink-0 w-8"
              style={{ color: C.textSub }}
            >
              페이스
            </label>
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <Input
                id="pace-per-km"
                value={paceInput}
                onChange={(e) => setPaceInput(e.target.value)}
                placeholder="5:00"
                className="h-8 text-[13px] tabular-nums bg-[#111] border-[#222] px-2"
              />
              <span className="text-[11px] shrink-0" style={{ color: C.textSub }}>
                /km
              </span>
            </div>
          </div>

          <div
            className="rounded-xl px-3 py-2.5 flex items-center justify-between"
            style={{
              backgroundColor: C.cardInner,
              border: `1px solid ${C.border}`,
            }}
          >
            <span className="text-[12px]" style={{ color: C.textSub }}>
              {formatDistance(distanceM)} 예상
            </span>
            <span
              className="text-[18px] font-bold tabular-nums"
              style={{ color: C.lime }}
            >
              {mainTime}
            </span>
          </div>

          {laneResults && lapIntervalM > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[10px]" style={{ color: C.textSub }}>
                레인 · 마우스 올리거나 탭 → Lap 타임
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {laneResults.map(({ lane, distance, timeSec }) => (
                  <LaneLapPopover
                    key={lane}
                    lane={lane}
                    baseDistanceM={distanceM}
                    laneDistanceM={distance}
                    timeSec={timeSec}
                    lapIntervalM={lapIntervalM}
                    paceSecPerKm={paceSecPerKm!}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-center py-1" style={{ color: C.textSub }}>
              페이스를 M:SS 형식으로 입력하세요 (예: 5:00)
            </p>
          )}
        </div>
      )}
    </div>
  )
}
