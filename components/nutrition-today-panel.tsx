"use client"

import { useEffect, useMemo, useState } from "react"
import { Progress } from "@/components/ui/progress"
import {
  DAILY_FOOD_LOG_EVENT,
  addTodayWaterConsumedL,
  loadTodayFoodLog,
  setTodayWaterConsumedL,
} from "@/lib/daily-food-log"
import { filterConfirmedFoodLogEntries, CONFIRMED_MEAL_SLOTS_EVENT } from "@/lib/confirmed-meal-slots"
import {
  buildTodayNutritionCheckpoints,
  formatMacroG,
  sumLoggedNutrition,
} from "@/lib/food-nutrition-utils"
import type { NutritionProfile } from "@/lib/nutrition"
import { WEIGHT_TRACKER_EVENT } from "@/lib/nutrition"
import {
  calculateDailyWaterTarget,
  DEFAULT_USER_PROFILE,
  formatCalories,
  loadUserProfile,
  USER_PROFILE_EVENT,
  WATER_EXERCISE_GUIDE_NOTE,
  withActiveWeight,
  type MacroTargets,
} from "@/lib/user-profile"
import { useHydrated } from "@/hooks/use-hydrated"
import { WaterIntakeRow } from "@/components/water-intake-edit"

const PANEL_C = {
  lime: "#64b869",
  card: "#111811",
  border: "#1c2a1c",
  pillBg: "#1a2a14",
  pillBorder: "#2d4a22",
  textSub: "#888888",
} as const

function StatRow({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-[13px]">
      <span style={{ color: PANEL_C.textSub }}>{label}</span>
      <span
        className="tabular-nums font-semibold"
        style={{ color: accent ? PANEL_C.lime : "#fff" }}
      >
        {value}
      </span>
    </div>
  )
}

function MacroIntakeRow({
  label,
  consumed,
  target,
  unit,
}: {
  label: string
  consumed: number
  target: number
  unit: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-[13px]">
      <span style={{ color: PANEL_C.textSub }}>{label}</span>
      <span className="tabular-nums font-medium text-foreground">
        {formatMacroG(consumed)} / {formatMacroG(target)}
        {unit}
      </span>
    </div>
  )
}

export function NutritionTodayPanel({
  targets,
  profile,
}: {
  targets: MacroTargets
  profile: Pick<NutritionProfile, "dietModeLabel" | "currentWeightKg">
}) {
  const hydrated = useHydrated()
  const [logVersion, setLogVersion] = useState(0)
  const [profileVersion, setProfileVersion] = useState(0)

  useEffect(() => {
    if (!hydrated) return
    const syncLog = () => setLogVersion((v) => v + 1)
    const syncProfile = () => setProfileVersion((v) => v + 1)
    window.addEventListener(DAILY_FOOD_LOG_EVENT, syncLog)
    window.addEventListener(WEIGHT_TRACKER_EVENT, syncProfile)
    window.addEventListener(USER_PROFILE_EVENT, syncProfile)
    window.addEventListener(CONFIRMED_MEAL_SLOTS_EVENT, syncLog)
    return () => {
      window.removeEventListener(DAILY_FOOD_LOG_EVENT, syncLog)
      window.removeEventListener(WEIGHT_TRACKER_EVENT, syncProfile)
      window.removeEventListener(USER_PROFILE_EVENT, syncProfile)
      window.removeEventListener(CONFIRMED_MEAL_SLOTS_EVENT, syncLog)
    }
  }, [hydrated])

  const totals = useMemo(() => {
    void logVersion
    if (!hydrated) {
      return sumLoggedNutrition([])
    }
    return sumLoggedNutrition(
      filterConfirmedFoodLogEntries(loadTodayFoodLog().entries)
    )
  }, [hydrated, logVersion])

  const waterConsumedL = useMemo(() => {
    void logVersion
    if (!hydrated) return 0
    return loadTodayFoodLog().waterConsumedL ?? 0
  }, [hydrated, logVersion])

  const waterTarget = useMemo(() => {
    void profileVersion
    if (!hydrated) {
      return calculateDailyWaterTarget(
        profile.currentWeightKg || DEFAULT_USER_PROFILE.currentWeightKg,
        DEFAULT_USER_PROFILE.dietMode
      )
    }
    const user = withActiveWeight(loadUserProfile())
    return calculateDailyWaterTarget(user.currentWeightKg, user.dietMode)
  }, [hydrated, profileVersion, profile.currentWeightKg, targets.waterL])

  const waterTargetL = waterTarget.waterL

  const handleWaterChange = (waterL: number) => {
    setTodayWaterConsumedL(waterL)
    setLogVersion((v) => v + 1)
  }

  const handleWaterAddMl = (ml: number) => {
    addTodayWaterConsumedL(ml / 1000)
    setLogVersion((v) => v + 1)
  }

  const targetCalories = targets.calories
  const consumedCalories = totals.calories
  const remainingCalories = Math.max(0, targetCalories - consumedCalories)
  const calorieProgress = Math.min(
    100,
    Math.round((consumedCalories / Math.max(1, targetCalories)) * 100)
  )

  const checkpoints = useMemo(
    () =>
      buildTodayNutritionCheckpoints(
        totals,
        { ...targets, waterL: waterTargetL },
        { waterConsumedL }
      ),
    [totals, targets, waterTargetL, waterConsumedL]
  )

  return (
    <div
      className="rounded-2xl px-4 py-4 space-y-4"
      style={{
        backgroundColor: PANEL_C.card,
        border: `1px solid ${PANEL_C.border}`,
      }}
    >
      <div
        className="inline-flex items-center rounded-full px-2 py-[3px]"
        style={{
          backgroundColor: PANEL_C.pillBg,
          border: `1px solid ${PANEL_C.pillBorder}`,
        }}
      >
        <span
          className="text-[10px] font-bold tracking-[0.04em]"
          style={{ color: PANEL_C.lime }}
        >
          {profile.dietModeLabel}
        </span>
      </div>

      <div className="space-y-2">
        <StatRow
          label="오늘 목표 칼로리"
          value={`${formatCalories(targetCalories)} kcal`}
        />
        <StatRow
          label="현재 섭취 칼로리"
          value={`${formatCalories(consumedCalories)} kcal`}
        />
        <StatRow
          label="남은 칼로리"
          value={`${formatCalories(remainingCalories)} kcal`}
          accent
        />
      </div>

      <div>
        <div className="flex items-center justify-between text-[11px] mb-1.5">
          <span style={{ color: PANEL_C.textSub }}>칼로리 진행률</span>
          <span className="tabular-nums font-medium" style={{ color: PANEL_C.lime }}>
            {calorieProgress}%
          </span>
        </div>
        <Progress
          value={calorieProgress}
          className="h-2 bg-[#1a2a14] [&_[data-slot=progress-indicator]]:bg-[#64b869]"
        />
      </div>

      <div
        className="space-y-2 pt-1 border-t"
        style={{ borderColor: PANEL_C.border }}
      >
        <MacroIntakeRow
          label="탄수화물"
          consumed={totals.carbsG}
          target={targets.carbsG}
          unit="g"
        />
        <MacroIntakeRow
          label="단백질"
          consumed={totals.proteinG}
          target={targets.proteinG}
          unit="g"
        />
        <MacroIntakeRow
          label="지방"
          consumed={totals.fatG}
          target={targets.fatG}
          unit="g"
        />
        <WaterIntakeRow
          consumedL={waterConsumedL}
          targetL={waterTargetL}
          guideNote={WATER_EXERCISE_GUIDE_NOTE}
          onChange={handleWaterChange}
          onAddMl={handleWaterAddMl}
        />
      </div>

      {checkpoints.length > 0 ? (
        <div
          className="rounded-xl px-3 py-3 space-y-2"
          style={{
            backgroundColor: PANEL_C.pillBg,
            border: `1px solid ${PANEL_C.pillBorder}`,
          }}
        >
          <p className="text-[12px] font-semibold text-foreground">
            오늘 체크포인트
          </p>
          <ul className="space-y-1">
            {checkpoints.map((point) => (
              <li
                key={point}
                className="text-[12px] flex items-start gap-2 leading-relaxed"
                style={{ color: PANEL_C.textSub }}
              >
                <span className="shrink-0" style={{ color: PANEL_C.lime }}>
                  •
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p
        className="text-[11px] leading-relaxed"
        style={{ color: PANEL_C.textSub }}
      >
        음식 추가와 추천 메뉴는 아래 「음식 검색 · 오늘 식단」에서 할 수 있어요.
      </p>
    </div>
  )
}

export function formatNutritionTodaySummary(
  targets: MacroTargets,
  consumedCalories: number
): string {
  const remaining = Math.max(0, targets.calories - consumedCalories)
  return `남은 ${formatCalories(remaining)}kcal · 섭취 ${formatCalories(consumedCalories)}kcal`
}
