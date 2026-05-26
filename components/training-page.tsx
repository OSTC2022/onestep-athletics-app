"use client"

import { useMemo, useState } from "react"
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Activity,
  AlertCircle,
  Thermometer,
  Plus,
  Check
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { WorkoutRecordForm } from "@/components/workout-record-form"
import { saveTodayCheckin } from "@/lib/daily-checkin"
import { setChecklistItemCompleted } from "@/lib/daily-checklist"
import { bodyParts, conditionOptions } from "@/lib/checkin-options"
import { FORM_TEXTAREA_CLASS } from "@/lib/form-styles"
import { RaceMonthCalendarDialog } from "@/components/race-month-calendar-dialog"
import { ScheduleLocationDialog } from "@/components/schedule-location-dialog"
import {
  getWeekCalendarMonth,
  getWeekOffsetForDate,
  getWeekRangeLabel,
  getWeekSchedule,
  type WeeklyScheduleDay,
} from "@/lib/weekly-schedule"
import { parseRaceDate } from "@/lib/race-schedule"
import { formatKoreanDateWithWeekday } from "@/lib/date-format"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { TrainingSessionDetailView } from "@/components/training-session-detail-view"
import { useCanManageTraining } from "@/hooks/useCurrentUser"
import { useTodayTrainingSession } from "@/hooks/use-training-session"
import { createEmptyTrainingSession, loadAllTrainingSessions } from "@/lib/training-session"
import { useEffect } from "react"
import { cn } from "@/lib/utils"

export function TrainingPage() {
  const router = useRouter()
  const todaySession = useTodayTrainingSession()
  const canManage = useCanManageTraining()

  useEffect(() => {
    loadAllTrainingSessions()
  }, [])

  const [condition, setCondition] = useState<number | null>(null)
  const [painAreas, setPainAreas] = useState<string[]>([])
  const [painDetail, setPainDetail] = useState("")
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedScheduleDay, setSelectedScheduleDay] =
    useState<WeeklyScheduleDay | null>(null)
  const [locationDialogOpen, setLocationDialogOpen] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [calendarOpen, setCalendarOpen] = useState(false)

  const weekSchedule = useMemo(
    () => getWeekSchedule(weekOffset),
    [weekOffset]
  )
  const weekRangeLabel = useMemo(
    () => getWeekRangeLabel(weekOffset),
    [weekOffset]
  )
  const weekCalendarMonth = useMemo(
    () => getWeekCalendarMonth(weekOffset),
    [weekOffset]
  )

  const toggleCondition = (value: number) => {
    setCondition((prev) => {
      const next = prev === value ? null : value
      saveTodayCheckin({
        condition: next,
        painAreas,
        painDetail,
      })
      setChecklistItemCompleted(2, next !== null)
      return next
    })
    setSavedAt(null)
  }

  const togglePainArea = (area: string) => {
    setPainAreas((prev) => {
      const next = prev.includes(area)
        ? prev.filter((a) => a !== area)
        : [...prev, area]
      const nextDetail = next.length === 0 ? "" : painDetail
      if (next.length === 0) setPainDetail("")
      saveTodayCheckin({
        condition,
        painAreas: next,
        painDetail: nextDetail,
      })
      setChecklistItemCompleted(3, next.length > 0)
      return next
    })
    setSavedAt(null)
  }

  const handleSaveCheckin = () => {
    setIsSaving(true)
    const checkin = saveTodayCheckin({
      condition,
      painAreas,
      painDetail,
    })
    setChecklistItemCompleted(2, condition !== null)
    setChecklistItemCompleted(3, painAreas.length > 0)
    setSavedAt(checkin.updatedAt)
    setIsSaving(false)
  }

  const savedTimeLabel = savedAt
    ? new Date(savedAt).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null

  const openScheduleLocation = (day: WeeklyScheduleDay) => {
    setSelectedScheduleDay(day)
    setLocationDialogOpen(true)
  }

  return (
    <div className="px-4 py-6 space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">훈련</h1>
        <div className="flex items-center gap-2 shrink-0">
          {canManage && (
            <Button
              type="button"
              size="sm"
              className="h-8 px-2.5 text-[12px] bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => {
                const created = createEmptyTrainingSession()
                router.push(`/training/edit/${created.id}`)
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              훈련 추가
            </Button>
          )}
          <Badge variant="outline" className="text-accent border-accent">
            <Calendar className="h-3 w-3 mr-1" />
            {formatKoreanDateWithWeekday()}
          </Badge>
        </div>
      </header>

      {/* Weekly Schedule */}
      <Card className="bg-card border-border -mx-1 py-4 gap-4">
        <CardHeader className="pb-2 px-4">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base shrink-0 pt-1.5">주간 훈련표</CardTitle>
            <div className="flex flex-col items-center gap-1 shrink-0 min-w-0">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setWeekOffset((v) => v - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <button
                  type="button"
                  onClick={() => setCalendarOpen(true)}
                  className="text-sm text-muted-foreground tabular-nums hover:text-foreground transition-colors underline-offset-2 hover:underline truncate max-w-[120px]"
                >
                  {weekRangeLabel}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setWeekOffset((v) => v + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              {weekOffset !== 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekOffset(0)}
                  className="h-6 px-2.5 text-[10px] border-accent/40 text-accent hover:bg-accent/10"
                >
                  오늘
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3">
          <div className="grid grid-cols-7 gap-1">
            {weekSchedule.map((day) => (
              <button
                key={day.date}
                type="button"
                onClick={() => openScheduleLocation(day)}
                className={cn(
                  "flex flex-col items-center justify-start px-1.5 py-2.5 rounded-lg text-center transition-opacity active:opacity-70 min-h-[96px] min-w-0",
                  day.status === "today"
                    ? "bg-accent text-accent-foreground"
                    : day.status === "completed"
                      ? "bg-secondary"
                      : "bg-transparent hover:bg-secondary/40"
                )}
              >
                <span className="text-xs font-medium leading-none break-keep">{day.day}</span>
                <span
                  className={cn(
                    "text-[10px] tabular-nums mt-0.5 break-keep",
                    day.status === "today"
                      ? "text-accent-foreground/90"
                      : "text-muted-foreground"
                  )}
                >
                  {day.dateLabel}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-medium leading-tight mt-1 break-keep",
                    day.status === "today" ? "" : "text-foreground"
                  )}
                >
                  {day.type}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-mono leading-tight break-keep",
                    day.status === "today"
                      ? "text-accent-foreground/90"
                      : "text-muted-foreground"
                  )}
                >
                  {day.distance}
                </span>
                {day.location ? (
                  <span
                    className={cn(
                      "text-[9px] leading-tight mt-1 line-clamp-2 w-full break-keep",
                      day.status === "today"
                        ? "text-accent-foreground/85"
                        : "text-muted-foreground"
                    )}
                    title={day.location.name}
                  >
                    {day.location.name}
                  </span>
                ) : (
                  <span
                    className={cn(
                      "text-[9px] mt-1 break-keep",
                      day.status === "today"
                        ? "text-accent-foreground/70"
                        : "text-muted-foreground/70"
                    )}
                  >
                    —
                  </span>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <RaceMonthCalendarDialog
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        initialYear={weekCalendarMonth.year}
        initialMonth={weekCalendarMonth.month}
        onNavigateToDate={(dateKey) => {
          setWeekOffset(getWeekOffsetForDate(parseRaceDate(dateKey)))
        }}
      />

      <ScheduleLocationDialog
        open={locationDialogOpen}
        onOpenChange={setLocationDialogOpen}
        day={selectedScheduleDay}
      />

      {/* Condition Input */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-accent" />
            <CardTitle className="text-base">컨디션 입력</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between gap-2">
            {conditionOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleCondition(option.value)}
                className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
                  condition === option.value
                    ? `${option.color} text-background`
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {condition !== null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">현재 컨디션</span>
              <span className="font-medium">
                {conditionOptions.find((o) => o.value === condition)?.label}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pain Check */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <CardTitle className="text-base">통증 체크</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">통증이 있는 부위를 선택하세요</p>
          <div className="flex flex-wrap gap-2">
            {bodyParts.map((part) => (
              <button
                key={part}
                type="button"
                onClick={() => togglePainArea(part)}
                className={`px-3 py-2 rounded-lg text-sm transition-all ${
                  painAreas.includes(part)
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {part}
              </button>
            ))}
          </div>
          {painAreas.length > 0 && (
            <div className="space-y-3">
              <div className="p-3 bg-destructive/10 rounded-lg">
                <p className="text-sm text-destructive">
                  선택된 부위: {painAreas.join(", ")}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pain-detail" className="text-xs">
                  상세 내용
                  <span className="text-muted-foreground font-normal ml-1">
                    (선택)
                  </span>
                </Label>
                <Textarea
                  id="pain-detail"
                  placeholder="통증 강도, 언제부터, 운동 중·후 여부 등 (예: 오른쪽 무릎 앞쪽, 계단 내려갈 때 3/10)"
                  value={painDetail}
                  onChange={(e) => {
                    setPainDetail(e.target.value)
                    setSavedAt(null)
                  }}
                  rows={3}
                  className={FORM_TEXTAREA_CLASS}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              onClick={handleSaveCheckin}
              disabled={isSaving || (condition === null && painAreas.length === 0)}
              className={cn(
                "flex-1",
                painAreas.length > 0
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-accent text-accent-foreground hover:bg-accent/90"
              )}
            >
              {savedAt ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  저장됨 {savedTimeLabel && `· ${savedTimeLabel}`}
                </>
              ) : (
                "컨디션 · 통증 저장"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Workout Record Input */}
      <Dialog>
        <DialogTrigger asChild>
          <Card className="bg-card border-border cursor-pointer hover:bg-card/80 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium">운동 기록 입력</p>
                    <p className="text-sm text-muted-foreground">
                      러닝·웨이트·보강 등 카테고리별 세션 기록
                    </p>
                  </div>
                </div>
                <Plus className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent
          closeOnOutsideClick={false}
          className="bg-card border-border flex max-h-[min(90dvh,720px)] w-[calc(100vw-2rem)] max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        >
          <DialogHeader className="shrink-0 border-b border-border/60 px-5 pt-5 pb-3">
            <DialogTitle>운동 기록 입력</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-4">
            <WorkoutRecordForm />
          </div>
        </DialogContent>
      </Dialog>

      {/* Today's Detail */}
      {todaySession ? (
        <div className="space-y-2">
          <TrainingSessionDetailView
            session={todaySession}
            showEditLink={false}
            embedded
          />
          <div className="flex gap-2">
            <Button
              asChild
              variant="outline"
              className={cn(
                "border-accent/40 text-accent hover:bg-accent/10",
                canManage ? "flex-1" : "w-full"
              )}
            >
              <Link href={`/training/${todaySession.id}`}>상세 보기</Link>
            </Button>
            {canManage && (
              <Button
                asChild
                className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Link href={`/training/edit/${todaySession.id}`}>수정</Link>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center space-y-3">
            <p className="text-sm text-muted-foreground">오늘 등록된 훈련이 없습니다</p>
            {canManage && (
              <Button
                type="button"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => {
                  const created = createEmptyTrainingSession()
                  router.push(`/training/edit/${created.id}`)
                }}
              >
                훈련 추가
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
