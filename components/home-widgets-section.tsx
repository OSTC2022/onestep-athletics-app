"use client"

import type { ReactNode } from "react"
import {
  Check,
  ClipboardList,
  Clock,
  MessageSquare,
  ChevronRight,
  TrendingUp,
  CalendarCheck,
  Users,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PaceCalculatorCard } from "@/components/pace-calculator-card"
import { TodayTrainingWidget } from "@/components/today-training-widget"
import { NutritionWeightMotivationCompact } from "@/components/nutrition-weight-motivation"
import { HomeSortableWidgetsEditor } from "@/components/home-sortable-widgets"
import {
  HomeWidgetContentWrap,
  HomeWidgetGrid,
  HomeWidgetGridCell,
} from "@/components/home-widget-grid"
import {
  sizePaddingClass,
  sizeStatClass,
  sizeTitleClass,
  type HomeLayout,
  type HomeWidgetId,
  type HomeWidgetItem,
  type HomeWidgetSize,
} from "@/lib/home-layout"
import { cn } from "@/lib/utils"
import type { WeeklyScheduleDay } from "@/lib/weekly-schedule"

const C = {
  lime: "#64b869",
  limeGlow: "#70cb75",
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

const coachNote =
  "오늘은 인터벌 훈련 날입니다. 페이스보다 폼 유지에 집중하세요. 무릎에 통증이 있는 선수는 강도를 낮추어 진행하세요."

export interface HomeWidgetsContext {
  todaySchedule: WeeklyScheduleDay | null
  locationDialogOpen: boolean
  setLocationDialogOpen: (open: boolean) => void
  canCheckAttendanceToday: boolean
  isAttendanceChecked: boolean
  handleAttendance: () => void
  weeklyDistanceLabel: string
  weeklyDistanceSubLabel: string
  setGarminDialogOpen: (open: boolean) => void
  monthlyAttendanceRate: number
  monthlyAttendanceSummary: string
  monthlyAttendanceDetail: string
  attendanceDayLabels: string
  checklistItems: { id: number; label: string; completed: boolean }[]
  completedCount: number
  toggleChecklist: (id: number) => void
  handleChecklistCircleClick: (
    e: React.MouseEvent,
    id: number,
    completed: boolean
  ) => void
}

function WidgetShell({
  item,
  children,
}: {
  item: HomeWidgetItem
  children: ReactNode
}) {
  if (!item.visible) return null

  return (
    <HomeWidgetGridCell item={item}>
      <HomeWidgetContentWrap>{children}</HomeWidgetContentWrap>
    </HomeWidgetGridCell>
  )
}

function renderWidgetContent(
  id: HomeWidgetId,
  size: HomeWidgetSize,
  ctx: HomeWidgetsContext
) {
  const pad = sizePaddingClass(size)
  const titleCls = sizeTitleClass(size)
  const statCls = sizeStatClass(size)
  const compact = size === "compact"

  switch (id) {
    case "training":
      return <TodayTrainingWidget size={size} />

    case "pace-calculator":
      return (
        <div className={cn(compact && "scale-[0.97] origin-top mb-3")}>
          <PaceCalculatorCard />
        </div>
      )

    case "weight-progress":
      return (
        <NutritionWeightMotivationCompact
          className={cn("mb-3", compact && "p-3", size === "large" && "p-5")}
        />
      )

    case "quick-actions":
      return (
        <div className={cn("grid grid-cols-2 gap-3 mb-3", compact && "gap-2")}>
          <Button
            onClick={ctx.handleAttendance}
            disabled={!ctx.canCheckAttendanceToday}
            className={cn(
              "rounded-2xl font-semibold gap-2 shadow-none tracking-[-0.01em]",
              compact ? "h-[44px] text-[14px]" : "h-[50px] text-[15px]",
              !ctx.canCheckAttendanceToday
                ? "bg-secondary/40 text-muted-foreground border border-border/40 cursor-not-allowed opacity-70"
                : ctx.isAttendanceChecked
                  ? "bg-accent/15 text-accent border border-accent/30 hover:bg-accent/20"
                  : "border-0 text-white hover:opacity-90"
            )}
            style={
              ctx.canCheckAttendanceToday && !ctx.isAttendanceChecked
                ? { backgroundColor: C.cardBtn }
                : undefined
            }
          >
            <Clock className="h-[17px] w-[17px] shrink-0" />
            {!ctx.canCheckAttendanceToday
              ? "출석일 아님"
              : ctx.isAttendanceChecked
                ? "출석 취소"
                : "출석 체크"}
          </Button>
          <Button
            variant="secondary"
            className={cn(
              "rounded-2xl font-semibold gap-2 border-0 shadow-none tracking-[-0.01em] text-white hover:opacity-90",
              compact ? "h-[44px] text-[14px]" : "h-[50px] text-[15px]"
            )}
            style={{ backgroundColor: C.cardBtn }}
          >
            <ClipboardList className="h-[17px] w-[17px] shrink-0" />
            기록 입력
          </Button>
        </div>
      )

    case "garmin-stats":
      return (
        <button
          type="button"
          onClick={() => ctx.setGarminDialogOpen(true)}
          className={cn(
            "rounded-2xl text-left transition-opacity active:opacity-80 h-full w-full",
            pad
          )}
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
          <p className={cn("font-bold tabular-nums leading-[30px] tracking-[-0.02em]", statCls)}>
            {ctx.weeklyDistanceLabel}
            <span className="text-[15px] font-normal ml-[3px]" style={{ color: C.textSub }}>
              km
            </span>
          </p>
          <p className="text-[13px] leading-[18px] mt-[6px]" style={{ color: C.textSub }}>
            주간 누적 · {ctx.weeklyDistanceSubLabel}
          </p>
        </button>
      )

    case "attendance-stats":
      return (
        <div
          className={cn("rounded-2xl h-full w-full", pad)}
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
          <p className={cn("font-bold tabular-nums leading-[30px] tracking-[-0.02em]", statCls)}>
            {ctx.monthlyAttendanceRate}
            <span className="text-[15px] font-normal ml-[3px]" style={{ color: C.textSub }}>
              %
            </span>
          </p>
          <p className="text-[13px] leading-[18px] mt-[6px]" style={{ color: C.textSub }}>
            월간 출석 · {ctx.monthlyAttendanceSummary}
            {ctx.monthlyAttendanceDetail && (
              <span className="block text-[11px] mt-0.5">
                {ctx.monthlyAttendanceDetail}
              </span>
            )}
            {!ctx.canCheckAttendanceToday && (
              <span className="block text-[11px] mt-0.5">
                출석 가능 {ctx.attendanceDayLabels} · 수·토 제외
              </span>
            )}
          </p>
        </div>
      )

    case "checklist":
      return (
        <Card
          className="rounded-2xl shadow-none mb-3"
          style={{
            backgroundColor: C.cardSection,
            border: `1px solid ${C.divider}`,
          }}
        >
          <CardContent className={pad}>
            <div
              className="flex items-center justify-between pb-[12px] border-b"
              style={{ borderColor: "#141414" }}
            >
              <div className="flex items-center gap-[8px]">
                <CalendarCheck className="h-4 w-4" style={{ color: C.lime }} />
                <h3 className={cn("font-semibold leading-[20px] tracking-[-0.01em]", compact ? "text-[14px]" : "text-[15px]")}>
                  오늘 체크리스트
                </h3>
              </div>
              <span className="text-[13px] tabular-nums" style={{ color: C.textSub }}>
                {ctx.completedCount}/{ctx.checklistItems.length}
              </span>
            </div>
            <div>
              {ctx.checklistItems.map((item) => {
                const isAttendanceItem = item.id === 1
                const isDisabled = isAttendanceItem && !ctx.canCheckAttendanceToday
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => ctx.toggleChecklist(item.id)}
                    disabled={isDisabled}
                    className={cn(
                      "w-full flex items-center gap-[12px] border-b last:border-0",
                      compact ? "py-[10px]" : "py-[14px]",
                      isDisabled ? "opacity-50 cursor-not-allowed" : "active:opacity-70"
                    )}
                    style={{ borderColor: "#141414" }}
                  >
                    <div
                      role="presentation"
                      onClick={(e) => {
                        if (isDisabled) return
                        ctx.handleChecklistCircleClick(e, item.id, item.completed)
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
                      className={cn(
                        "text-left tracking-[-0.01em]",
                        compact ? "text-[14px]" : "text-[15px]"
                      )}
                      style={{ color: item.completed ? C.textDim : C.text }}
                    >
                      {item.label}
                      {isDisabled && (
                        <span
                          className="block text-[11px] mt-0.5"
                          style={{ color: C.textSub }}
                        >
                          오늘은 출석일이 아닙니다 ({ctx.attendanceDayLabels})
                        </span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )

    case "coach-memo":
      return (
        <Card
          className="rounded-2xl shadow-none mb-3"
          style={{
            backgroundColor: C.cardSection,
            border: `1px solid ${C.divider}`,
          }}
        >
          <CardContent className={pad}>
            <div className="flex items-center gap-[8px] mb-[12px]">
              <MessageSquare className="h-4 w-4" style={{ color: C.lime }} />
              <h3 className={cn("font-semibold leading-[20px]", compact ? "text-[14px]" : "text-[15px]")}>
                코치 메모
              </h3>
            </div>
            <div
              className="rounded-xl px-[14px] py-[12px]"
              style={{ backgroundColor: C.cardInner, border: "1px solid #141414" }}
            >
              <p className="text-[14px] leading-[22px]" style={{ color: "#d4d4d4" }}>
                {coachNote}
              </p>
            </div>
          </CardContent>
        </Card>
      )
  }
}

export function HomeWidgetsSection({
  layout,
  editMode,
  ctx,
  onUpdateWidget,
  onReorder,
}: {
  layout: HomeLayout
  editMode: boolean
  ctx: HomeWidgetsContext
  onUpdateWidget: (id: HomeWidgetId, patch: Partial<HomeWidgetItem>) => void
  onReorder: (orderedIds: HomeWidgetId[]) => void
}) {
  const sorted = [...layout.widgets].sort((a, b) => a.order - b.order)

  if (editMode) {
    return (
      <HomeSortableWidgetsEditor
        sorted={sorted}
        onReorder={onReorder}
        onUpdateWidget={onUpdateWidget}
        renderWidget={(item) => renderWidgetContent(item.id, item.size, ctx)}
      />
    )
  }

  const displayList = sorted.filter((w) => w.visible)

  return (
    <HomeWidgetGrid>
      {displayList.map((item) => (
        <WidgetShell key={item.id} item={item}>
          {renderWidgetContent(item.id, item.size, ctx)}
        </WidgetShell>
      ))}
    </HomeWidgetGrid>
  )
}
