"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Apple, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  formatCalories,
  ensureWeightLogSeeded,
  getDailyMacroTargets,
  getDefaultDailyMacroTargets,
  getDefaultNutritionProfile,
  getNutritionProfile,
  NUTRITION_EVENT,
  WEIGHT_TRACKER_EVENT,
  type AdjustedMealPlan,
} from "@/lib/nutrition"
import {
  hasSavedUserProfile,
  USER_PROFILE_EVENT,
} from "@/lib/user-profile"
import { getTodayScheduleDay } from "@/lib/weekly-schedule"
import {
  WeightQuickInput,
  WeightSummaryLine,
} from "@/components/weight-quick-input"
import { NutritionTargetPanel } from "@/components/meal-food-alternatives"
import { useHydrated } from "@/hooks/use-hydrated"
import { cn } from "@/lib/utils"

const C = {
  lime: "#64b869",
  cardSection: "#0a0a0a",
  divider: "#1a1a1a",
  textSub: "#888888",
  cardBtn: "#1a1a1a",
  inner: "#111811",
} as const

function BreakdownRow({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-[12px]">
      <span style={{ color: C.textSub }}>{label}</span>
      <span
        className={cn("tabular-nums text-right shrink-0", accent && "font-semibold")}
        style={accent ? { color: C.lime } : undefined}
      >
        {value}
      </span>
    </div>
  )
}

function formatSignedKcal(value: number): string {
  if (value > 0) return `+${formatCalories(value)}kcal`
  if (value < 0) return `${formatCalories(value)}kcal`
  return "0kcal"
}

export function NutritionHomeCard() {
  const hydrated = useHydrated()
  const [version, setVersion] = useState(0)
  const [mealPlan, setMealPlan] = useState<AdjustedMealPlan | null>(null)
  const [hasCustomProfile, setHasCustomProfile] = useState(false)

  useEffect(() => {
    if (!hydrated) return
    ensureWeightLogSeeded()
    setHasCustomProfile(hasSavedUserProfile())
    const refresh = () => {
      setVersion((v) => v + 1)
      setHasCustomProfile(hasSavedUserProfile())
    }
    window.addEventListener(USER_PROFILE_EVENT, refresh)
    window.addEventListener(NUTRITION_EVENT, refresh)
    window.addEventListener(WEIGHT_TRACKER_EVENT, refresh)
    return () => {
      window.removeEventListener(USER_PROFILE_EVENT, refresh)
      window.removeEventListener(NUTRITION_EVENT, refresh)
      window.removeEventListener(WEIGHT_TRACKER_EVENT, refresh)
    }
  }, [hydrated])

  void version
  void mealPlan

  const profile = useMemo(
    () => (hydrated ? getNutritionProfile() : getDefaultNutritionProfile()),
    [hydrated, version]
  )
  const todaySchedule = useMemo(() => getTodayScheduleDay(), [version])
  const targets = useMemo(
    () =>
      hydrated
        ? getDailyMacroTargets(todaySchedule)
        : getDefaultDailyMacroTargets(todaySchedule),
    [hydrated, todaySchedule, version]
  )
  const breakdown = targets.breakdown

  return (
    <div
      className="rounded-2xl p-[18px] mb-3"
      style={{
        backgroundColor: C.cardSection,
        border: `1px solid ${C.divider}`,
      }}
    >
      <div className="flex items-start gap-2 mb-4">
        <div
          className="h-8 w-8 rounded-[9px] flex items-center justify-center shrink-0"
          style={{ backgroundColor: "rgba(85, 153, 97, 0.14)" }}
        >
          <Apple className="h-4 w-4" style={{ color: C.lime }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-tight tracking-[-0.01em]">
            오늘의 영양 관리
          </p>
          <p className="text-[12px] mt-1 leading-relaxed" style={{ color: C.lime }}>
            {profile.goalModeLabel}
          </p>
          <div className="text-[12px] mt-0.5">
            <WeightSummaryLine
              currentWeightKg={profile.currentWeightKg}
              targetWeightKg={profile.targetWeightKg}
              weightChangeKg={profile.weightChangeKg}
            />
            {!hasCustomProfile && (
              <p className="mt-0.5 text-[11px]" style={{ color: C.textSub }}>
                기본값
              </p>
            )}
          </div>
        </div>
      </div>

      <NutritionTargetPanel targets={targets} onPlanChange={setMealPlan} />

      <p className="text-[11px] mt-3 px-1" style={{ color: C.textSub }}>
        오늘 훈련: {breakdown.trainingDayLabel}
        {breakdown.expectedWeightChangeRange && (
          <>
            {" · "}
            {profile.expectedWeightChangeLabel}{" "}
            <span className="text-white tabular-nums">
              {breakdown.expectedWeightChangeRange}
            </span>
          </>
        )}
        {breakdown.trainingAdjustment !== 0 && (
          <span className="ml-1 tabular-nums">
            ({formatSignedKcal(breakdown.trainingAdjustment)})
          </span>
        )}
      </p>

      <details className="mt-3 group">
        <summary
          className="list-none cursor-pointer rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 transition-colors active:opacity-80"
          style={{ backgroundColor: C.inner, border: `1px solid ${C.divider}` }}
        >
          <span className="text-[12px] font-medium">체중 입력 · 계산 기준</span>
          <ChevronDown
            className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
            style={{ color: C.textSub }}
          />
        </summary>
        <div
          className="rounded-xl px-3 py-3 mt-2 space-y-3"
          style={{ backgroundColor: C.inner, border: `1px solid ${C.divider}` }}
        >
          <p className="text-[11px]" style={{ color: C.textSub }}>
            체중 입력 시 칼로리·탄단지·나트륨이 자동 재계산됩니다
          </p>
          <WeightQuickInput
            currentWeightKg={profile.currentWeightKg}
            onSaved={() => setVersion((v) => v + 1)}
            compact
          />
          <div className="space-y-2.5 pt-2 border-t border-border/40">
            <BreakdownRow
              label="적용 체중"
              value={`${breakdown.activeWeightKg}kg`}
              accent
            />
            <BreakdownRow
              label="유지 칼로리"
              value={`${formatCalories(breakdown.maintenanceCalories)}kcal`}
            />
            <BreakdownRow
              label="감량 보정 칼로리"
              value={formatSignedKcal(breakdown.dietAdjustment)}
            />
            <BreakdownRow
              label={`훈련 보정 (${breakdown.trainingDayLabel})`}
              value={formatSignedKcal(breakdown.trainingAdjustment)}
            />
            <BreakdownRow
              label="최종 권장 칼로리"
              value={`${formatCalories(breakdown.finalCalories)}kcal`}
              accent
            />
            <BreakdownRow
              label="탄단지 계산 기준"
              value={breakdown.macroBasisNote}
            />
          </div>
        </div>
      </details>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <Button
          asChild
          className="h-10 rounded-xl text-[13px] font-semibold bg-accent text-accent-foreground hover:bg-accent/90"
        >
          <Link href="/nutrition">식단 기록하기</Link>
        </Button>
        <Button
          asChild
          variant="secondary"
          className="h-10 rounded-xl text-[13px] font-semibold border-0 text-white hover:opacity-90"
          style={{ backgroundColor: C.cardBtn }}
        >
          <Link href="/settings?section=goals">목표 설정</Link>
        </Button>
      </div>
    </div>
  )
}
