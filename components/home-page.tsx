"use client"

import { useState, useEffect, useMemo } from "react"
import { ProfileMenu } from "@/components/profile-menu-sheet"
import {
  ConditionQuickDialog,
  PainQuickDialog,
  WorkoutQuickDialog,
} from "@/components/checkin-quick-dialogs"
import { HomeWeather } from "@/components/home-weather"
import { HomeWidgetsSection } from "@/components/home-widgets-section"
import {
  HomeEditToggleButton,
  HomeLayoutEditBar,
} from "@/components/home-layout-controls"
import {
  DEFAULT_HOME_LAYOUT,
  HOME_LAYOUT_EVENT,
  applyWidgetOrder,
  loadHomeLayout,
  resetHomeLayout,
  saveHomeLayout,
  updateHomeWidget,
  type HomeLayout,
  type HomeWidgetId,
  type HomeWidgetItem,
} from "@/lib/home-layout"
import { useHydrated } from "@/hooks/use-hydrated"
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

export function HomePage() {
  const hydrated = useHydrated()
  const [homeLayout, setHomeLayout] = useState<HomeLayout>(DEFAULT_HOME_LAYOUT)
  const [editMode, setEditMode] = useState(false)
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
    if (!hydrated) return
    setHomeLayout(loadHomeLayout())
    const syncLayout = () => setHomeLayout(loadHomeLayout())
    window.addEventListener(HOME_LAYOUT_EVENT, syncLayout)
    return () => window.removeEventListener(HOME_LAYOUT_EVENT, syncLayout)
  }, [hydrated])

  const persistLayout = (next: HomeLayout) => {
    setHomeLayout(saveHomeLayout(next))
  }

  const handleUpdateWidget = (
    id: HomeWidgetId,
    patch: Partial<Omit<HomeWidgetItem, "id">>
  ) => {
    persistLayout(updateHomeWidget(homeLayout, id, patch))
  }

  const handleReorderWidgets = (orderedIds: HomeWidgetId[]) => {
    persistLayout(applyWidgetOrder(homeLayout, orderedIds))
  }

  const handleResetLayout = () => {
    persistLayout(resetHomeLayout())
  }

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
        <div className="flex items-center gap-2 shrink-0">
          <HomeEditToggleButton
            editing={editMode}
            onClick={() => setEditMode((v) => !v)}
          />
          <ProfileMenu triggerStyle={{ backgroundColor: C.cardBtn }} />
        </div>
      </header>

      <HomeWidgetsSection
        layout={homeLayout}
        editMode={editMode}
        ctx={{
          todaySchedule,
          locationDialogOpen,
          setLocationDialogOpen,
          canCheckAttendanceToday,
          isAttendanceChecked,
          handleAttendance,
          weeklyDistanceLabel,
          weeklyDistanceSubLabel,
          setGarminDialogOpen,
          monthlyAttendanceRate,
          monthlyAttendanceSummary,
          monthlyAttendanceDetail,
          attendanceDayLabels: ATTENDANCE_DAY_LABELS,
          checklistItems,
          completedCount,
          toggleChecklist,
          handleChecklistCircleClick,
        }}
        onUpdateWidget={handleUpdateWidget}
        onReorder={handleReorderWidgets}
      />

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

      {editMode && (
        <HomeLayoutEditBar
          onDone={() => setEditMode(false)}
          onReset={handleResetLayout}
        />
      )}

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
