"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Heart, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  buildMonthCalendarGrid,
  formatDDay,
  formatMonthTitle,
  getRaceDDay,
  getRacesInMonth,
  getTodayMonth,
  groupRacesByDateKey,
  isCurrentMonth,
  shortenRaceName,
  type CalendarDayCell,
} from "@/lib/race-calendar"
import { getRaceParticipants } from "@/lib/race-participation"
import type { RaceEvent } from "@/lib/race-schedule"
import { cn } from "@/lib/utils"

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"] as const
const CALENDAR_ROWS = 6
const CELL_HEIGHT = 48

export function RaceMonthCalendarDialog({
  open,
  onOpenChange,
  initialYear,
  initialMonth,
  onNavigateToDate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialYear: number
  initialMonth: number
  onNavigateToDate?: (dateKey: string) => void
}) {
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)
  const [selectedRace, setSelectedRace] = useState<RaceEvent | null>(null)
  const [participationVersion, setParticipationVersion] = useState(0)
  const detailRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setYear(initialYear)
    setMonth(initialMonth)
    setSelectedDateKey(null)
    setSelectedRace(null)
  }, [open, initialYear, initialMonth])

  useEffect(() => {
    if (!open) return
    const refresh = () => setParticipationVersion((v) => v + 1)
    window.addEventListener("storage", refresh)
    return () => window.removeEventListener("storage", refresh)
  }, [open])

  useEffect(() => {
    if (!selectedRace) return
    detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [selectedRace])

  const monthRaces = useMemo(
    () => getRacesInMonth(year, month),
    [year, month]
  )
  const racesByDate = useMemo(
    () => groupRacesByDateKey(monthRaces),
    [monthRaces]
  )
  const grid = useMemo(
    () => buildMonthCalendarGrid(year, month),
    [year, month]
  )

  void participationVersion

  const shiftMonth = (delta: number) => {
    const next = new Date(year, month - 1 + delta, 1)
    setYear(next.getFullYear())
    setMonth(next.getMonth() + 1)
    setSelectedDateKey(null)
    setSelectedRace(null)
  }

  const goToToday = () => {
    const today = getTodayMonth()
    setYear(today.year)
    setMonth(today.month)
    setSelectedDateKey(null)
    setSelectedRace(null)
  }

  const isViewingToday = isCurrentMonth(year, month)

  const handleDayClick = (cell: CalendarDayCell) => {
    if (!cell.dateKey || !cell.isCurrentMonth) return
    setSelectedDateKey(cell.dateKey)
    setSelectedRace(null)
    onNavigateToDate?.(cell.dateKey)
  }

  const handleRaceClick = (
    e: React.MouseEvent,
    race: RaceEvent,
    dateKey: string
  ) => {
    e.stopPropagation()
    setSelectedDateKey(dateKey)
    setSelectedRace(race)
  }

  const selectedParticipants = selectedRace
    ? getRaceParticipants(selectedRace.id)
    : []
  const selectedDDay = selectedRace ? getRaceDDay(selectedRace) : null

  const selectedDayRaces = selectedDateKey
    ? (racesByDate.get(selectedDateKey) ?? [])
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border w-[calc(100vw-2rem)] max-w-md gap-0 p-0 overflow-hidden flex flex-col h-[min(90dvh,560px)]">
        <DialogHeader className="shrink-0 px-5 pt-5 pb-3 border-b border-border/60">
          <div className="flex items-start justify-between gap-2">
            <DialogTitle className="text-base leading-none pt-1.5">
              대회 달력
            </DialogTitle>
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => shiftMonth(-1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium tabular-nums w-[96px] text-center">
                  {formatMonthTitle(year, month)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => shiftMonth(1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              {!isViewingToday && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                  className="h-6 px-2.5 text-[10px] border-accent/40 text-accent hover:bg-accent/10"
                >
                  오늘
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3">
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="text-center text-[10px] font-medium text-muted-foreground py-1"
              >
                {label}
              </div>
            ))}
          </div>

          <div
            className="grid grid-cols-7 gap-1 mt-1"
            style={{ height: CALENDAR_ROWS * CELL_HEIGHT + (CALENDAR_ROWS - 1) * 4 }}
          >
            {grid.map((cell, index) => {
              if (!cell.isCurrentMonth || cell.dateKey === null) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="rounded-md bg-transparent"
                    style={{ height: CELL_HEIGHT }}
                  />
                )
              }

              const dayRaces = racesByDate.get(cell.dateKey) ?? []
              const isSelected = selectedDateKey === cell.dateKey

              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  onClick={() => handleDayClick(cell)}
                  style={{ height: CELL_HEIGHT }}
                  className={cn(
                    "rounded-md border p-1 flex flex-col text-left transition-colors active:opacity-80",
                    cell.isToday
                      ? "border-accent/50 bg-accent/10"
                      : "border-border/50 bg-secondary/20",
                    isSelected && "ring-2 ring-accent ring-offset-1 ring-offset-background"
                  )}
                >
                  <span
                    className={cn(
                      "text-[10px] font-semibold tabular-nums leading-none",
                      cell.isToday ? "text-accent" : "text-foreground"
                    )}
                  >
                    {cell.day}
                  </span>
                  <div className="mt-0.5 space-y-0.5 flex-1 min-h-0 overflow-hidden">
                    {dayRaces.slice(0, 2).map((race) => (
                      <span
                        key={race.id}
                        role="button"
                        tabIndex={0}
                        onClick={(e) => handleRaceClick(e, race, cell.dateKey!)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            e.stopPropagation()
                            setSelectedDateKey(cell.dateKey!)
                            setSelectedRace(race)
                          }
                        }}
                        className={cn(
                          "block w-full rounded px-0.5 py-0.5 text-[8px] leading-tight truncate transition-colors cursor-pointer",
                          selectedRace?.id === race.id
                            ? "bg-accent text-accent-foreground"
                            : race.category === "trail"
                              ? "bg-orange-500/15 text-orange-400 hover:bg-orange-500/25"
                              : "bg-accent/15 text-accent hover:bg-accent/25"
                        )}
                        title={race.name}
                      >
                        {shortenRaceName(race.name, 7)}
                      </span>
                    ))}
                    {dayRaces.length > 2 && (
                      <span className="text-[8px] text-muted-foreground px-0.5">
                        +{dayRaces.length - 2}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          <div
            ref={detailRef}
            className="mt-3 min-h-[132px] rounded-lg border border-border bg-secondary/20 p-3"
          >
            {selectedRace && selectedDDay !== null ? (
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug">
                      {selectedRace.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {selectedRace.dateLabel} · {selectedRace.location}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-accent/15 text-accent px-2 py-0.5 text-xs font-bold tabular-nums">
                    {formatDDay(selectedDDay)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Trophy className="h-3 w-3 text-accent shrink-0" />
                  <span className="text-muted-foreground">
                    {selectedRace.category === "trail" ? "트레일" : "마라톤"}
                  </span>
                </div>
                <div className="border-t border-border/60 pt-2">
                  <p className="text-[11px] font-medium flex items-center gap-1 mb-1.5">
                    <Heart className="h-3 w-3 text-accent fill-accent" />
                    참가 멤버
                  </p>
                  {selectedParticipants.length > 0 ? (
                    <ul className="space-y-0.5">
                      {selectedParticipants.map((p) => (
                        <li
                          key={p.userId}
                          className="text-[11px] text-foreground"
                        >
                          • {p.displayName}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      아직 참가 표시한 멤버가 없습니다
                    </p>
                  )}
                </div>
              </div>
            ) : selectedDateKey ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-foreground">
                  {selectedDateKey.replace(/-/g, ".")} 선택됨
                </p>
                <p className="text-[11px] text-muted-foreground">
                  주간 훈련표가 이 날짜가 포함된 주로 이동했습니다.
                </p>
                {selectedDayRaces.length > 0 ? (
                  <p className="text-[11px] text-muted-foreground">
                    대회 {selectedDayRaces.length}개 · 이름을 탭하면 상세
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    이 날 예정된 대회가 없습니다
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground text-center py-6">
                날짜를 탭하면 해당 주로 이동합니다
                <br />
                대회 이름을 탭하면 D-Day·참가 멤버를 볼 수 있어요
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
