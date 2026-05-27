"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Sparkles,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
  AlertCircle,
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NutritionStatusEditDialog } from "@/components/nutrition-status-edit-dialog"
import { InlineWeightEdit } from "@/components/weight-quick-input"
import { applyRecommendedTargetPeriod } from "@/lib/nutrition"
import { cn } from "@/lib/utils"
import { useCollapsibleOpen } from "@/components/collapsible-section-context"

import {
  useWeightMotivation,
} from "@/hooks/use-weight-motivation"

const NUTRITION_C = {
  lime: "#64b869",
  card: "#111811",
  border: "#1c2a1c",
  pillBg: "#1a2a14",
  pillBorder: "#2d4a22",
  textSub: "#888888",
} as const

function ForestPillBadge({
  icon: Icon,
  label,
  className,
}: {
  icon: LucideIcon
  label: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-[3px]",
        className
      )}
      style={{
        backgroundColor: NUTRITION_C.pillBg,
        border: `1px solid ${NUTRITION_C.pillBorder}`,
      }}
    >
      <Icon className="h-3 w-3 shrink-0" style={{ color: NUTRITION_C.lime }} />
      <span
        className="text-[10px] font-bold tracking-[0.06em]"
        style={{ color: NUTRITION_C.lime }}
      >
        {label}
      </span>
    </div>
  )
}

function MyChangeBadge({ className }: { className?: string }) {
  return (
    <ForestPillBadge icon={Sparkles} label="나의 변화" className={className} />
  )
}

function GoalTypeBadge({
  goalLabel,
  goalDirection,
  className,
}: {
  goalLabel: string
  goalDirection: "loss" | "gain" | "maintain"
  className?: string
}) {
  const Icon =
    goalDirection === "gain"
      ? TrendingUp
      : goalDirection === "loss"
        ? TrendingDown
        : Sparkles
  return (
    <ForestPillBadge icon={Icon} label={goalLabel} className={className} />
  )
}

export function NutritionWeightMotivation({
  sectionId,
  onUpdated,
}: {
  sectionId?: string
  onUpdated?: () => void
}) {
  const { progress, profile, copy } = useWeightMotivation()
  const [open, setOpen] = useCollapsibleOpen(sectionId, true)
  const [editOpen, setEditOpen] = useState(false)
  const [appliedWeeks, setAppliedWeeks] = useState<number | null>(null)

  useEffect(() => {
    if (profile.targetPeriodAdvice) setAppliedWeeks(null)
  }, [profile.targetPeriodAdvice, profile.targetWeeks])
  const showProgressBar =
    progress.hasHistory &&
    (progress.goalDirection === "loss" || progress.goalDirection === "gain")

  const summary = progress.hasHistory
    ? `${progress.currentWeightKg}kg · 목표 ${progress.targetWeightKg}kg${
        showProgressBar ? ` · ${Math.round(progress.goalProgressPercent)}%` : ""
      }`
    : copy.subline

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: NUTRITION_C.card,
            border: `1px solid ${NUTRITION_C.border}`,
          }}
        >
          <div className="flex items-start gap-1 pr-1 pt-3 pb-1">
            <div className="flex-1 min-w-0 px-4 py-0">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <MyChangeBadge />
                  {showProgressBar ? (
                    <span
                      className="text-[13px] font-semibold tabular-nums shrink-0"
                      style={{ color: NUTRITION_C.lime }}
                    >
                      {Math.round(progress.goalProgressPercent)}%
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold tracking-tight text-foreground leading-tight">
                    {copy.headline}
                  </p>
                  {!open ? (
                    <p
                      className="text-[12px] truncate leading-tight mt-1"
                      style={{ color: NUTRITION_C.textSub }}
                    >
                      {summary}
                    </p>
                  ) : (
                    <p
                      className="text-[13px] mt-1 leading-relaxed"
                      style={{ color: NUTRITION_C.textSub }}
                    >
                      {copy.subline}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex w-6 shrink-0 flex-col items-center gap-0.5 pt-0.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="h-6 w-6 flex items-center justify-center shrink-0 rounded-md transition-colors hover:bg-white/[0.06]"
                    style={{ color: NUTRITION_C.textSub }}
                    aria-label="나의 변화 메뉴"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 bg-card border-border">
                  <DropdownMenuItem
                    onSelect={() => {
                      setEditOpen(true)
                      setOpen(true)
                    }}
                  >
                    현재 상태 수정
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="h-6 w-6 flex items-center justify-center shrink-0 rounded-md hover:bg-white/[0.06] transition-colors"
                  aria-label={open ? "접기" : "펼치기"}
                >
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      open && "rotate-180"
                    )}
                    style={{ color: NUTRITION_C.textSub }}
                  />
                </button>
              </CollapsibleTrigger>
            </div>
          </div>
          <CollapsibleContent>
            <div
              className="px-4 pb-4 space-y-3 pt-3"
              style={{ borderTop: `1px solid ${NUTRITION_C.border}` }}
            >
      {progress.hasHistory ? (
        <div className="grid grid-cols-[1fr_auto_1fr_1fr] items-center gap-x-2 gap-y-1.5 text-[13px] tabular-nums px-1">
          <div className="flex items-baseline gap-1 min-w-0">
            <span className="text-muted-foreground shrink-0 w-8">시작</span>
            <span className="text-foreground font-semibold">
              {progress.startWeightKg}kg
            </span>
          </div>
          <span className="text-muted-foreground text-center shrink-0 w-4">→</span>
          <div className="flex justify-center min-w-0">
            <div className="flex items-baseline gap-1 min-w-[6rem]">
              <span className="text-muted-foreground shrink-0 w-8">현재</span>
              <InlineWeightEdit
                currentWeightKg={progress.currentWeightKg}
                onSaved={() => onUpdated?.()}
              />
            </div>
          </div>
          <div className="flex justify-end min-w-0">
            <div className="flex items-baseline gap-1 w-[5.25rem]">
              <span className="text-muted-foreground shrink-0 w-8">목표</span>
              <span className="text-foreground font-semibold">
                {progress.targetWeightKg}kg
              </span>
            </div>
          </div>

          {progress.currentBmi > 0 ? (
            <>
              <div className="flex items-baseline gap-1 min-w-0">
                <span className="text-muted-foreground shrink-0 w-8">BMI</span>
                <span className="text-foreground font-semibold">
                  {progress.startBmi}
                </span>
              </div>
              <span className="text-muted-foreground text-center shrink-0 w-4">→</span>
              <div className="flex justify-center min-w-0">
                <div className="flex items-baseline gap-1 w-[5.25rem]">
                  <span className="text-muted-foreground shrink-0 w-8">현재</span>
                  <span
                    className="font-bold"
                    style={{ color: NUTRITION_C.lime }}
                  >
                    {progress.currentBmi}
                  </span>
                </div>
              </div>
              <div className="flex justify-end min-w-0">
                <div className="flex items-baseline gap-1 w-[5.25rem]">
                  <span className="text-muted-foreground shrink-0 w-8">목표</span>
                  <span className="text-foreground font-semibold">
                    {progress.targetBmi}
                  </span>
                </div>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {showProgressBar ? (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground">목표 진행률</span>
            <span
              className="font-semibold tabular-nums"
              style={{ color: NUTRITION_C.lime }}
            >
              {Math.round(progress.goalProgressPercent)}%
            </span>
          </div>
          <Progress
            value={progress.goalProgressPercent}
            className="h-2 bg-[#1a2a14] [&_[data-slot=progress-indicator]]:bg-[#64b869]"
          />
        </div>
      ) : null}

      <div
        className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm px-1 pt-1"
        style={{ borderTop: `1px solid ${NUTRITION_C.border}` }}
      >
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground shrink-0">목표 기간</span>
          <span className="font-medium tabular-nums">{profile.targetWeeks}주</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground shrink-0">주당 목표</span>
          <span className="font-medium tabular-nums">
            {profile.weeklyWeightGoalKg > 0 ? "+" : ""}
            {profile.weeklyWeightGoalKg}kg
          </span>
        </div>
        <div className="flex justify-between gap-2 items-center">
          <span className="text-muted-foreground shrink-0">목표 유형</span>
          <GoalTypeBadge
            goalLabel={profile.goalLabel}
            goalDirection={progress.goalDirection}
            className="scale-90 origin-right"
          />
        </div>
        {profile.goalLabel === "감량" ? (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground shrink-0">감량 모드</span>
            <span className="font-medium text-right text-[13px]">
              {profile.dietModeLabel}
            </span>
          </div>
        ) : null}
      </div>

      {profile.targetPeriodAdvice ? (
        <div
          className="rounded-xl px-3 py-2.5 mx-1"
          style={{
            backgroundColor: "rgba(180, 120, 40, 0.12)",
            border: "1px solid rgba(180, 120, 40, 0.28)",
            color: "#d4a574",
          }}
        >
          <div className="flex items-start gap-2 text-[12px] leading-relaxed">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0">
              <p className="font-semibold text-[13px] leading-snug">
                {profile.targetPeriodAdvice.headline}
              </p>
              <p className="opacity-90">{profile.targetPeriodAdvice.detail}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const weeks = applyRecommendedTargetPeriod()
              if (!weeks) return
              setAppliedWeeks(weeks)
              onUpdated?.()
            }}
            className="mt-2.5 w-full rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors hover:brightness-110 active:opacity-90"
            style={{
              backgroundColor: "rgba(100, 184, 105, 0.18)",
              border: `1px solid ${NUTRITION_C.pillBorder}`,
              color: NUTRITION_C.lime,
            }}
          >
            목표기간 추천받기 · {profile.targetPeriodAdvice.recommendedWeeks}주
          </button>
        </div>
      ) : appliedWeeks ? (
        <p
          className="text-[12px] px-3 mx-1 leading-relaxed"
          style={{ color: NUTRITION_C.lime }}
        >
          목표 기간을 {appliedWeeks}주로 변경했어요. 칼로리와 식단이 함께
          조정됐습니다.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground px-1">
        {progress.trackingDays > 0 && (
          <span>{progress.trackingDays}일 기록</span>
        )}
        {profile.weightChangeKg !== 0 && (
          <span
            className="tabular-nums"
            style={
              profile.weightChangeKg < 0
                ? { color: NUTRITION_C.lime }
                : undefined
            }
          >
            최근 7일{" "}
            {profile.weightChangeKg > 0 ? "+" : ""}
            {profile.weightChangeKg}kg
          </span>
        )}
        {progress.recent7DayBmiChange !== 0 && progress.currentBmi > 0 && (
          <span
            className="tabular-nums"
            style={
              progress.recent7DayBmiChange < 0
                ? { color: NUTRITION_C.lime }
                : undefined
            }
          >
            BMI{" "}
            {progress.recent7DayBmiChange > 0 ? "+" : ""}
            {progress.recent7DayBmiChange}
          </span>
        )}
      </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>

      <NutritionStatusEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdated={onUpdated}
      />
    </>
  )
}

const HOME_C = NUTRITION_C

export function NutritionWeightMotivationCompact({
  className,
}: {
  className?: string
}) {
  const { progress, copy } = useWeightMotivation()
  const showProgress =
    progress.hasHistory &&
    (progress.goalDirection === "loss" || progress.goalDirection === "gain")

  return (
    <Link
      href="/nutrition"
      className={cn(
        "block rounded-2xl p-[16px] transition-opacity active:opacity-80",
        className
      )}
      style={{
        backgroundColor: HOME_C.card,
        border: `1px solid ${HOME_C.border}`,
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <MyChangeBadge />
            {showProgress ? (
              <span
                className="text-[13px] font-semibold tabular-nums shrink-0"
                style={{ color: HOME_C.lime }}
              >
                {Math.round(progress.goalProgressPercent)}%
              </span>
            ) : null}
          </div>
          <p className="text-[17px] font-bold tabular-nums tracking-[-0.01em] truncate text-foreground leading-tight">
            {copy.headline}
          </p>
        </div>
        <ChevronRight
          className="h-4 w-4 shrink-0 mt-1"
          style={{ color: HOME_C.textSub }}
        />
      </div>

      {progress.hasHistory ? (
        <div className="space-y-1">
          <p className="text-[12px] tabular-nums" style={{ color: HOME_C.textSub }}>
            시작 {progress.startWeightKg}kg →{" "}
            <span style={{ color: HOME_C.textSub }}>
              현재{" "}
              <span className="font-semibold" style={{ color: "#fff" }}>
                {progress.currentWeightKg}kg
              </span>
            </span>
            {" · "}
            <span style={{ color: HOME_C.textSub }}>
              목표{" "}
              <span className="font-semibold" style={{ color: "#fff" }}>
                {progress.targetWeightKg}kg
              </span>
            </span>
          </p>
          {progress.currentBmi > 0 ? (
            <p className="text-[12px] tabular-nums" style={{ color: HOME_C.textSub }}>
              BMI {progress.startBmi} →{" "}
              <span style={{ color: HOME_C.textSub }}>
                현재{" "}
                <span className="font-semibold" style={{ color: HOME_C.lime }}>
                  {progress.currentBmi}
                </span>
              </span>
              {" · "}
              <span style={{ color: HOME_C.textSub }}>
                목표{" "}
                <span className="font-semibold" style={{ color: "#fff" }}>
                  {progress.targetBmi}
                </span>
              </span>
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-[12px]" style={{ color: HOME_C.textSub }}>
          {copy.subline}
        </p>
      )}

      {showProgress && (
        <div
          className="mt-2.5 h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: HOME_C.pillBg }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, progress.goalProgressPercent)}%`,
              backgroundColor: HOME_C.lime,
            }}
          />
        </div>
      )}
    </Link>
  )
}
