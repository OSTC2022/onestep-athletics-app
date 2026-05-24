"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Check,
  ClipboardList,
  Clock,
  MessageSquare,
  ChevronRight,
  TrendingUp,
  Zap,
  CalendarCheck,
  Users,
  MapPin,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  ConditionQuickDialog,
  PainQuickDialog,
  WorkoutQuickDialog,
} from "@/components/checkin-quick-dialogs"
import { PaceCalculatorCard } from "@/components/pace-calculator-card"
import { HomeWeather } from "@/components/home-weather"
import { GarminConnectDialog } from "@/components/garmin-connect-dialog"
import { ScheduleLocationDialog } from "@/components/schedule-location-dialog"
import {
  DAILY_CHECKLIST_EVENT,
  loadTodayChecklistItems,
  setChecklistItemCompleted,
} from "@/lib/daily-checklist"
import { loadTodayCheckin, saveTodayCheckin } from "@/lib/daily-checkin"
import {
  ATTENDANCE_EVENT,
  ATTENDANCE_DAY_LABELS,
  getMonthlyAttendanceRate,
  getMonthlyAttendanceSummary,
  isTodayAttendanceDay,
  setAttendanceForDate,
  syncTodayAttendanceFromChecklist,
} from "@/lib/attendance"
import {
  fetchGarminStatus,
  GARMIN_UPDATED_EVENT,
  getCachedGarminWeekly,
  syncGarminWeeklyDistance,
  type GarminWeeklyCache,
} from "@/lib/garmin/client"
import { getCurrentWeekRange } from "@/lib/garmin/week"
import { getTodayScheduleDay } from "@/lib/weekly-schedule"
import { formatKoreanDateWithWeekday } from "@/lib/date-format"

/** Reference palette from mock */
const C = {
  lime: "#64b869",
  limeGlow: "#70cb75",
  bg: "#000000",
  card: "#111811",
  cardSection: "#0a0a0a",
  cardInner: "#060606",
  cardBtn: "#1a1a1a",
  border: "#1c2a1c",
  text: "#ffffff",
  textSub: "#888888",
  textDim: "#666666",
  divider: "#1a1a1a",
} as const

const todayTraining = {
  title: "인터벌 훈련",
  type: "INTERVAL",
  description: "400m x 8 (rest 90초)",
  phases: [
    { label: "웜업", text: "조깅 2km + 동적 스트레칭" },
    { label: "메인", text: "400m 인터벌 8회", active: true },
    { label: "쿨다운", text: "조깅 1km + 정적 스트레칭" },
  ],
  targetPace: "75초/400m",
  totalDistance: "5.2km",
}

const checklist = [
  { id: 1, label: "출석 체크", completed: false },
  { id: 2, label: "컨디션 입력", completed: false },
  { id: 3, label: "통증 체크", completed: false },
  { id: 4, label: "운동 기록", completed: false },
] as const

function getInitialChecklist() {
  if (typeof window === "undefined") {
    return checklist.map((item) => ({ ...item }))
  }
  return loadTodayChecklistItems()
}

const coachNote =
  "오늘은 인터벌 훈련 날입니다. 페이스보다 폼 유지에 집중하세요. 무릎에 통증이 있는 선수는 강도를 낮추어 진행하세요."

function PhaseLine({
  label,
  text,
  highlight,
  active = false,
}: {
  label: string
  text: string
  highlight?: string
  active?: boolean
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
    <li className="flex items-start gap-[10px] text-[15px] leading-[22px]">
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
          className="whitespace-nowrap text-[14px] font-medium leading-[22px]"
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

export function HomePage() {
  const [checklistItems, setChecklistItems] = useState(getInitialChecklist)
  const [isAttendanceChecked, setIsAttendanceChecked] = useState(
    () => getInitialChecklist().find((item) => item.id === 1)?.completed ?? false
  )
  const [dateLabel, setDateLabel] = useState("")
  const [checklistDialog, setChecklistDialog] = useState<2 | 3 | 4 | null>(null)
  const [monthlyAttendanceRate, setMonthlyAttendanceRate] = useState(0)
  const [monthlyAttendanceSummary, setMonthlyAttendanceSummary] = useState("0/0회")
  const [monthlyAttendanceDetail, setMonthlyAttendanceDetail] = useState("")
  const [garminDialogOpen, setGarminDialogOpen] = useState(false)
  const [garminConfigured, setGarminConfigured] = useState(false)
  const [garminConnected, setGarminConnected] = useState(false)
  const [garminWeekly, setGarminWeekly] = useState<GarminWeeklyCache | null>(null)
  const [garminSyncing, setGarminSyncing] = useState(false)
  const [weeklyDistanceLabel, setWeeklyDistanceLabel] = useState("—")
  const [weeklyDistanceSubLabel, setWeeklyDistanceSubLabel] = useState("Garmin 연동")
  const canCheckAttendanceToday = isTodayAttendanceDay()
  const todaySchedule = useMemo(() => getTodayScheduleDay(), [])
  const [locationDialogOpen, setLocationDialogOpen] = useState(false)

  useEffect(() => {
    setDateLabel(formatKoreanDateWithWeekday())
  }, [])

  useEffect(() => {
    const syncChecklist = () => {
      const items = loadTodayChecklistItems()
      setChecklistItems(items)
      setIsAttendanceChecked(items.find((item) => item.id === 1)?.completed ?? false)
    }

    const syncAttendance = () => {
      const summary = getMonthlyAttendanceSummary()
      setMonthlyAttendanceRate(getMonthlyAttendanceRate())
      setMonthlyAttendanceSummary(summary.label)
      setMonthlyAttendanceDetail(summary.detailLabel)
    }

    const applyGarminWeekly = (weekly: GarminWeeklyCache | null) => {
      setGarminWeekly(weekly)
      if (weekly?.connected && weekly.weekKey === getCurrentWeekRange().weekKey) {
        setWeeklyDistanceLabel(weekly.distanceLabel)
        setWeeklyDistanceSubLabel(`Garmin · ${weekly.weekLabel}`)
      } else if (!weekly?.connected) {
        setWeeklyDistanceLabel("—")
        setWeeklyDistanceSubLabel("Garmin 연동")
      }
    }

    const syncGarmin = async () => {
      const cached = getCachedGarminWeekly()
      if (cached) applyGarminWeekly(cached)

      try {
        const status = await fetchGarminStatus()
        setGarminConfigured(status.configured)
        setGarminConnected(status.connected)
        if (status.weekly) {
          applyGarminWeekly(status.weekly)
        } else if (!status.connected) {
          applyGarminWeekly(null)
        }
      } catch {
        setGarminConfigured(false)
      }
    }

    syncTodayAttendanceFromChecklist()
    syncChecklist()
    syncAttendance()
    void syncGarmin()

    window.addEventListener(DAILY_CHECKLIST_EVENT, syncChecklist)
    window.addEventListener(DAILY_CHECKLIST_EVENT, syncAttendance)
    window.addEventListener(ATTENDANCE_EVENT, syncAttendance)
    window.addEventListener(GARMIN_UPDATED_EVENT, () => {
      applyGarminWeekly(getCachedGarminWeekly())
    })

    const params = new URLSearchParams(window.location.search)
    const garminParam = params.get("garmin")
    if (garminParam === "connected") {
      setGarminDialogOpen(true)
      void (async () => {
        setGarminSyncing(true)
        try {
          const weekly = await syncGarminWeeklyDistance()
          applyGarminWeekly(weekly)
          setGarminConnected(true)
        } finally {
          setGarminSyncing(false)
        }
      })()
      params.delete("garmin")
      const nextUrl = params.toString()
        ? `${window.location.pathname}?${params}`
        : window.location.pathname
      window.history.replaceState({}, "", nextUrl)
    }

    return () => {
      window.removeEventListener(DAILY_CHECKLIST_EVENT, syncChecklist)
      window.removeEventListener(DAILY_CHECKLIST_EVENT, syncAttendance)
      window.removeEventListener(ATTENDANCE_EVENT, syncAttendance)
    }
  }, [])

  const toggleChecklist = (id: number) => {
    if (id === 1) {
      if (!canCheckAttendanceToday) return
      handleAttendance()
      return
    }
    if (id === 2 || id === 3 || id === 4) {
      setChecklistDialog(id)
    }
  }

  const handleChecklistCircleClick = (
    e: React.MouseEvent,
    id: number,
    completed: boolean
  ) => {
    e.stopPropagation()
    if (id === 1) {
      if (!canCheckAttendanceToday) return
      handleAttendance()
      return
    }
    if (!completed) return

    if (id === 2) {
      const existing = loadTodayCheckin()
      saveTodayCheckin({
        condition: null,
        painAreas: existing?.painAreas ?? [],
        painDetail: existing?.painDetail ?? "",
      })
      setChecklistItemCompleted(2, false)
    } else if (id === 3) {
      const existing = loadTodayCheckin()
      saveTodayCheckin({
        condition: existing?.condition ?? null,
        painAreas: [],
        painDetail: "",
      })
      setChecklistItemCompleted(3, false)
    } else if (id === 4) {
      setChecklistItemCompleted(4, false)
    }
    setChecklistItems(loadTodayChecklistItems())
  }

  const handleAttendance = () => {
    if (!canCheckAttendanceToday) return
    const nextChecked = !isAttendanceChecked
    const next = setChecklistItemCompleted(1, nextChecked)
    const today = new Date()
    const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    setAttendanceForDate(dateKey, nextChecked)
    setChecklistItems(next)
    setIsAttendanceChecked(nextChecked)
    setMonthlyAttendanceRate(getMonthlyAttendanceRate())
    const summary = getMonthlyAttendanceSummary()
    setMonthlyAttendanceSummary(summary.label)
    setMonthlyAttendanceDetail(summary.detailLabel)
  }

  const handleGarminSyncComplete = (weekly: GarminWeeklyCache | null) => {
    setGarminWeekly(weekly)
    setGarminConnected(Boolean(weekly?.connected))
    if (weekly?.connected && weekly.weekKey === getCurrentWeekRange().weekKey) {
      setWeeklyDistanceLabel(weekly.distanceLabel)
      setWeeklyDistanceSubLabel(`Garmin · ${weekly.weekLabel}`)
    } else {
      setWeeklyDistanceLabel("—")
      setWeeklyDistanceSubLabel("Garmin 연동")
    }
  }

  const completedCount = checklistItems.filter((i) => i.completed).length

  return (
    <div
      className="min-h-full px-4 pt-[22px] pb-5"
      style={{ backgroundColor: C.bg, color: C.text }}
    >
      {/* Date + weather */}
      <div
        className="flex items-center gap-2 text-[13px] leading-none mb-[14px] flex-wrap"
        style={{ color: C.textSub }}
      >
        <span>{dateLabel || "\u00A0"}</span>
        <span style={{ color: "#333333" }}>·</span>
        <HomeWeather />
      </div>

      {/* Header */}
      <header className="flex items-center justify-between gap-3 mb-[18px]">
        <h1 className="text-[26px] font-bold tracking-[-0.02em] leading-[32px]">
          OneStep{" "}
          <span style={{ color: C.lime }}>Athletics</span>
        </h1>
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: C.cardBtn }}
          >
            <span className="text-[12px] font-semibold">KJ</span>
          </div>
        </div>
      </header>

      {/* Training card */}
      <div
        className="rounded-2xl p-[18px] mb-3"
        style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
      >
        <div className="flex items-start justify-between mb-[14px]">
          <div
            className="inline-flex items-center gap-1 rounded-full px-2 py-[3px]"
            style={{
              backgroundColor: "#1a2a14",
              border: "1px solid #2d4a22",
            }}
          >
            <Zap className="h-3 w-3" style={{ color: C.lime }} />
            <span
              className="text-[10px] font-bold uppercase tracking-[0.06em]"
              style={{ color: C.lime }}
            >
              {todayTraining.type}
            </span>
          </div>
          <div className="text-right">
            <p
              className="text-[26px] font-bold tabular-nums leading-[30px]"
              style={{ color: C.lime }}
            >
              {todayTraining.totalDistance}
            </p>
            <p
              className="text-[10px] uppercase tracking-[0.06em] mt-[2px] leading-none"
              style={{ color: C.textSub }}
            >
              TOTAL
            </p>
          </div>
        </div>

        <h2 className="text-[22px] font-bold tracking-[-0.02em] leading-[28px] mb-[4px]">
          {todayTraining.title}
        </h2>
        <p
          className="text-[14px] leading-[20px] mb-[10px]"
          style={{ color: C.textSub }}
        >
          {todayTraining.description}
        </p>

        {todaySchedule?.location ? (
          <button
            type="button"
            onClick={() => setLocationDialogOpen(true)}
            className="flex items-start gap-2 mb-[16px] text-left w-full active:opacity-80"
          >
            <MapPin
              className="h-4 w-4 shrink-0 mt-[2px]"
              style={{ color: C.lime }}
            />
            <span
              className="text-[14px] leading-[20px] underline-offset-2 hover:underline"
              style={{ color: C.textSub }}
            >
              {todaySchedule.location.name}
            </span>
          </button>
        ) : (
          <p
            className="text-[13px] leading-[20px] mb-[16px]"
            style={{ color: C.textDim }}
          >
            오늘은 집합 장소가 없습니다
          </p>
        )}

        <ul className="space-y-[12px] mb-[16px]">
          {todayTraining.phases.map((phase) => (
            <PhaseLine
              key={phase.label}
              label={phase.label}
              text={phase.text}
              highlight={phase.highlight}
              active={"active" in phase && phase.active}
            />
          ))}
        </ul>

        <div
          className="pt-[14px] border-t text-[14px] leading-[20px]"
          style={{ borderColor: C.border }}
        >
          <span style={{ color: C.textSub }}>목표 페이스 </span>
          <span className="font-medium tabular-nums" style={{ color: C.lime }}>
            {todayTraining.targetPace}
          </span>
        </div>
      </div>

      <PaceCalculatorCard />

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Button
          onClick={handleAttendance}
          disabled={!canCheckAttendanceToday}
          className={cn(
            "h-[50px] rounded-2xl text-[15px] font-semibold gap-2 shadow-none tracking-[-0.01em]",
            !canCheckAttendanceToday
              ? "bg-secondary/40 text-muted-foreground border border-border/40 cursor-not-allowed opacity-70"
              : isAttendanceChecked
                ? "bg-accent/15 text-accent border border-accent/30 hover:bg-accent/20"
                : "bg-white text-black hover:bg-white/90"
          )}
        >
          <Clock className="h-[17px] w-[17px] shrink-0" />
          {!canCheckAttendanceToday
            ? "출석일 아님"
            : isAttendanceChecked
              ? "출석 취소"
              : "출석 체크"}
        </Button>
        <Button
          variant="secondary"
          className="h-[50px] rounded-2xl text-[15px] font-semibold gap-2 border-0 shadow-none tracking-[-0.01em] text-white hover:opacity-90"
          style={{ backgroundColor: C.cardBtn }}
        >
          <ClipboardList className="h-[17px] w-[17px] shrink-0" />
          기록 입력
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <button
          type="button"
          onClick={() => setGarminDialogOpen(true)}
          className="rounded-2xl p-[18px] text-left transition-opacity active:opacity-80"
          style={{
            backgroundColor: C.cardSection,
            border: `1px solid ${C.divider}`,
          }}
        >
          <div className="flex items-start justify-between mb-[14px]">
            <div
              className="h-8 w-8 rounded-[9px] flex items-center justify-center"
              style={{ backgroundColor: "rgba(85, 153, 97, 0.14)" }}
            >
              <TrendingUp className="h-4 w-4" style={{ color: C.lime }} />
            </div>
            <ChevronRight className="h-4 w-4" style={{ color: "#555" }} />
          </div>
          <p className="text-[26px] font-bold tabular-nums leading-[30px] tracking-[-0.02em]">
            {weeklyDistanceLabel}
            <span
              className="text-[15px] font-normal ml-[3px]"
              style={{ color: C.textSub }}
            >
              km
            </span>
          </p>
          <p
            className="text-[13px] leading-[18px] mt-[6px]"
            style={{ color: C.textSub }}
          >
            주간 누적 거리 · {weeklyDistanceSubLabel}
          </p>
        </button>
        <div
          className="rounded-2xl p-[18px]"
          style={{
            backgroundColor: C.cardSection,
            border: `1px solid ${C.divider}`,
          }}
        >
          <div className="flex items-start justify-between mb-[14px]">
            <div
              className="h-8 w-8 rounded-[9px] flex items-center justify-center"
              style={{ backgroundColor: "rgba(85, 153, 97, 0.14)" }}
            >
              <Users className="h-4 w-4" style={{ color: C.lime }} />
            </div>
            <ChevronRight className="h-4 w-4" style={{ color: "#555" }} />
          </div>
          <p className="text-[26px] font-bold tabular-nums leading-[30px] tracking-[-0.02em]">
            {monthlyAttendanceRate}
            <span
              className="text-[15px] font-normal ml-[3px]"
              style={{ color: C.textSub }}
            >
              %
            </span>
          </p>
          <p
            className="text-[13px] leading-[18px] mt-[6px]"
            style={{ color: C.textSub }}
          >
            월간 출석률 · {monthlyAttendanceSummary}
            {monthlyAttendanceDetail && (
              <span className="block text-[11px] mt-0.5">{monthlyAttendanceDetail}</span>
            )}
            {!canCheckAttendanceToday && (
              <span className="block text-[11px] mt-0.5">
                출석 가능 {ATTENDANCE_DAY_LABELS} · 수·토 제외
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Checklist */}
      <Card
        className="rounded-2xl shadow-none mb-3"
        style={{
          backgroundColor: C.cardSection,
          border: `1px solid ${C.divider}`,
        }}
      >
        <CardContent className="p-[18px]">
          <div
            className="flex items-center justify-between pb-[12px] border-b"
            style={{ borderColor: "#141414" }}
          >
            <div className="flex items-center gap-[8px]">
              <CalendarCheck className="h-4 w-4" style={{ color: C.lime }} />
              <h3 className="font-semibold text-[15px] leading-[20px] tracking-[-0.01em]">
                오늘 체크리스트
              </h3>
            </div>
            <span
              className="text-[13px] tabular-nums leading-none"
              style={{ color: C.textSub }}
            >
              {completedCount}/{checklistItems.length}
            </span>
          </div>
          <div>
            {checklistItems.map((item) => {
              const isAttendanceItem = item.id === 1
              const isDisabled = isAttendanceItem && !canCheckAttendanceToday

              return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleChecklist(item.id)}
                disabled={isDisabled}
                className={cn(
                  "w-full flex items-center gap-[12px] py-[14px] border-b last:border-0",
                  isDisabled ? "opacity-50 cursor-not-allowed" : "active:opacity-70"
                )}
                style={{ borderColor: "#141414" }}
              >
                <div
                  role="presentation"
                  onClick={(e) => {
                    if (isDisabled) return
                    handleChecklistCircleClick(e, item.id, item.completed)
                  }}
                  className={cn(
                    "h-[18px] w-[18px] rounded-full border flex items-center justify-center shrink-0",
                    item.completed
                      ? "border-accent bg-accent"
                      : "border-white/35 bg-transparent"
                  )}
                >
                  {item.completed && (
                    <Check className="h-2.5 w-2.5 text-black stroke-[3]" />
                  )}
                </div>
                <span
                  className="text-[15px] leading-[20px] text-left tracking-[-0.01em]"
                  style={{
                    color: item.completed ? C.textDim : C.text,
                  }}
                >
                  {item.label}
                  {isDisabled && (
                    <span className="block text-[11px] mt-0.5" style={{ color: C.textSub }}>
                      오늘은 출석일이 아닙니다 ({ATTENDANCE_DAY_LABELS})
                    </span>
                  )}
                </span>
              </button>
            )})}
          </div>
        </CardContent>
      </Card>

      <ConditionQuickDialog
        open={checklistDialog === 2}
        onOpenChange={(open) => setChecklistDialog(open ? 2 : null)}
      />
      <PainQuickDialog
        open={checklistDialog === 3}
        onOpenChange={(open) => setChecklistDialog(open ? 3 : null)}
      />
      <WorkoutQuickDialog
        open={checklistDialog === 4}
        onOpenChange={(open) => setChecklistDialog(open ? 4 : null)}
      />

      {/* Coach memo */}
      <Card
        className="rounded-2xl shadow-none"
        style={{
          backgroundColor: C.cardSection,
          border: `1px solid ${C.divider}`,
        }}
      >
        <CardContent className="p-[18px]">
          <div className="flex items-center gap-[8px] mb-[12px]">
            <MessageSquare className="h-4 w-4" style={{ color: C.lime }} />
            <h3 className="font-semibold text-[15px] leading-[20px] tracking-[-0.01em]">
              코치 메모
            </h3>
          </div>
          <div
            className="rounded-xl px-[14px] py-[12px]"
            style={{
              backgroundColor: C.cardInner,
              border: "1px solid #141414",
            }}
          >
            <p
              className="text-[14px] leading-[22px] tracking-[-0.01em]"
              style={{ color: "#d4d4d4" }}
            >
              {coachNote}
            </p>
          </div>
        </CardContent>
      </Card>

      <GarminConnectDialog
        open={garminDialogOpen}
        onOpenChange={setGarminDialogOpen}
        configured={garminConfigured}
        connected={garminConnected}
        weekly={garminWeekly}
        syncing={garminSyncing}
        onSyncComplete={handleGarminSyncComplete}
      />

      <ScheduleLocationDialog
        open={locationDialogOpen}
        onOpenChange={setLocationDialogOpen}
        day={todaySchedule}
      />
    </div>
  )
}
