"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Apple,
  MessageSquare,
  Utensils,
  Check,
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { formatKoreanDateWithWeekday } from "@/lib/date-format"
import {
  getCoachNutritionComment,
  ensureWeightLogSeeded,
  createEmptyTodayMealLog,
  getDailyMacroTargets,
  getDefaultDailyMacroTargets,
  getDefaultNutritionProfile,
  getNutritionProfile,
  loadTodayMealLog,
  MEAL_SLOTS,
  NUTRITION_EVENT,
  NUTRITION_BASIS_LABEL,
  WEIGHT_TRACKER_EVENT,
  toggleMealSlot,
  formatCalories,
  type MealSlotId,
  type TodayMealLog,
} from "@/lib/nutrition"
import { DAILY_FOOD_LOG_EVENT, loadTodayFoodLog } from "@/lib/daily-food-log"
import { sumLoggedNutrition } from "@/lib/food-nutrition-utils"
import { USER_PROFILE_EVENT } from "@/lib/user-profile"
import { getTodayScheduleDay } from "@/lib/weekly-schedule"
import { NutritionWeightMotivation } from "@/components/nutrition-weight-motivation"
import {
  NutritionTodayPanel,
  formatNutritionTodaySummary,
} from "@/components/nutrition-today-panel"
import { FoodSearchPanel } from "@/components/food-search-panel"
import { ProfileIncompleteBanner } from "@/components/profile-incomplete-banner"
import { CollapsibleCard, CollapsibleInlineSection } from "@/components/collapsible-card"
import {
  CollapsibleSectionProvider,
  CollapsibleSectionToolbar,
} from "@/components/collapsible-section-context"
import { useHydrated } from "@/hooks/use-hydrated"
import { useDailyDateRollover } from "@/hooks/use-daily-date-rollover"
import { cn } from "@/lib/utils"

export function NutritionPage() {
  const hydrated = useHydrated()
  useDailyDateRollover()
  const [profileVersion, setProfileVersion] = useState(0)
  const [foodLogVersion, setFoodLogVersion] = useState(0)
  const profile = useMemo(
    () => (hydrated ? getNutritionProfile() : getDefaultNutritionProfile()),
    [hydrated, profileVersion]
  )
  const todaySchedule = useMemo(
    (): WeeklyScheduleDay | null => (hydrated ? getTodayScheduleDay() : null),
    [hydrated]
  )
  const targets = useMemo(
    () =>
      hydrated
        ? getDailyMacroTargets(todaySchedule)
        : getDefaultDailyMacroTargets(todaySchedule),
    [hydrated, todaySchedule, profileVersion]
  )
  const [mealLog, setMealLog] = useState<TodayMealLog>(() =>
    createEmptyTodayMealLog()
  )
  const coachComment = useMemo(
    () =>
      hydrated
        ? getCoachNutritionComment(todaySchedule, mealLog)
        : getCoachNutritionComment(todaySchedule, createEmptyTodayMealLog()),
    [hydrated, todaySchedule, mealLog, profileVersion]
  )

  const todayNutritionSummary = useMemo(() => {
    void foodLogVersion
    if (!hydrated) {
      return `${targets.breakdown.dietModeLabel} · ${formatCalories(targets.calories)}kcal`
    }
    const consumed = sumLoggedNutrition(loadTodayFoodLog().entries).calories
    return formatNutritionTodaySummary(targets, consumed)
  }, [hydrated, targets, foodLogVersion])

  useEffect(() => {
    if (!hydrated) return
    ensureWeightLogSeeded()
    const syncMeals = () => setMealLog(loadTodayMealLog())
    const syncProfile = () => setProfileVersion((v) => v + 1)
    const syncFoodLog = () => setFoodLogVersion((v) => v + 1)
    syncMeals()
    window.addEventListener(NUTRITION_EVENT, syncMeals)
    window.addEventListener(USER_PROFILE_EVENT, syncProfile)
    window.addEventListener(WEIGHT_TRACKER_EVENT, syncProfile)
    window.addEventListener(DAILY_FOOD_LOG_EVENT, syncFoodLog)
    return () => {
      window.removeEventListener(NUTRITION_EVENT, syncMeals)
      window.removeEventListener(USER_PROFILE_EVENT, syncProfile)
      window.removeEventListener(WEIGHT_TRACKER_EVENT, syncProfile)
      window.removeEventListener(DAILY_FOOD_LOG_EVENT, syncFoodLog)
    }
  }, [hydrated])

  const handleToggleMeal = (slotId: MealSlotId) => {
    setMealLog(toggleMealSlot(slotId))
  }

  const mealProgress = Math.round(
    (mealLog.recordedSlots.length / MEAL_SLOTS.length) * 100
  )

  return (
    <CollapsibleSectionProvider>
    <div className="px-4 py-6 space-y-4">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">영양·체중관리</h1>
            <p className="text-sm text-muted-foreground">
              {hydrated ? (
                <>
                  {formatKoreanDateWithWeekday()}
                  {todaySchedule ? (
                    <span className="ml-1.5">· 오늘 {todaySchedule.type}</span>
                  ) : null}
                </>
              ) : (
                <span aria-hidden="true">&nbsp;</span>
              )}
            </p>
          </div>
        </div>
        <CollapsibleSectionToolbar />
      </header>

      <NutritionWeightMotivation
        sectionId="nutrition-weight-motivation"
        onUpdated={() => setProfileVersion((v) => v + 1)}
      />

      {/* 2. 오늘 영양 목표 */}
      <CollapsibleCard
        sectionId="nutrition-target"
        icon={Apple}
        title="오늘의 영양 관리"
        summary={todayNutritionSummary}
      >
        <NutritionTodayPanel targets={targets} profile={profile} />

        <CollapsibleInlineSection title="계산 기준 보기" sectionId="nutrition-calc-basis">
          <div className="rounded-xl bg-secondary/20 px-3 py-3 space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">유지 칼로리</span>
              <span className="tabular-nums">
                {formatCalories(targets.breakdown.maintenanceCalories)}kcal
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">감량 보정</span>
              <span className="tabular-nums">
                {targets.breakdown.dietAdjustment > 0 ? "+" : ""}
                {formatCalories(targets.breakdown.dietAdjustment)}kcal
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">
                훈련 보정 ({targets.breakdown.trainingDayLabel})
              </span>
              <span className="tabular-nums">
                {targets.breakdown.trainingAdjustment > 0 ? "+" : ""}
                {formatCalories(targets.breakdown.trainingAdjustment)}kcal
              </span>
            </div>
            <div className="flex justify-between gap-2 pt-1 border-t border-border/50">
              <span className="font-medium">최종 권장</span>
              <span className="font-semibold tabular-nums text-accent">
                {formatCalories(targets.breakdown.finalCalories)}kcal
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground pt-1 leading-relaxed">
              {targets.breakdown.macroBasisNote}
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {NUTRITION_BASIS_LABEL}
            </p>
          </div>
        </CollapsibleInlineSection>
      </CollapsibleCard>

      {/* 3. 음식 검색 · 오늘 식단 */}
      <CollapsibleCard
        sectionId="nutrition-food-search"
        icon={Utensils}
        title="음식 검색 · 오늘 식단"
        summary="음식 검색 · 추천 메뉴 · 식단 추가"
        defaultOpen
        contentClassName="space-y-3"
      >
        <p className="text-[11px] text-muted-foreground -mt-1 leading-relaxed">
          음식 검색, 추천 메뉴, 직접 추가 후 오늘 식단에 적용하세요. 전체
          영양 상태는 위 「오늘의 영양 관리」에서 확인할 수 있어요.
        </p>
        <ProfileIncompleteBanner
          message={targets.breakdown.profileIncompleteMessage}
        />
        <FoodSearchPanel targets={targets} />
      </CollapsibleCard>

      {/* 4. 오늘 식단 기록 (끼니 체크) */}
      <CollapsibleCard
        sectionId="nutrition-meal-log"
        id="meals"
        icon={Check}
        title="식단 기록"
        summary={`${mealLog.recordedSlots.length}/${MEAL_SLOTS.length}끼 기록 · ${mealProgress}%`}
        headerFooter={<Progress value={mealProgress} className="h-1.5" />}
      >
        <div className="grid grid-cols-2 gap-2">
          {MEAL_SLOTS.map((slot) => {
            const recorded = mealLog.recordedSlots.includes(slot.id)
            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => handleToggleMeal(slot.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors active:opacity-80",
                  recorded
                    ? "border-accent/50 bg-accent/10 text-accent"
                    : "border-border bg-secondary/20 hover:bg-secondary/40"
                )}
              >
                <div
                  className={cn(
                    "h-4 w-4 rounded-full border flex items-center justify-center shrink-0",
                    recorded
                      ? "border-accent bg-accent"
                      : "border-muted-foreground/40"
                  )}
                >
                  {recorded && (
                    <Check className="h-2.5 w-2.5 text-accent-foreground stroke-[3]" />
                  )}
                </div>
                {slot.label}
              </button>
            )
          })}
        </div>
      </CollapsibleCard>

      {/* 5. 코치 코멘트 */}
      <CollapsibleCard
        sectionId="nutrition-coach-comment"
        icon={MessageSquare}
        title="코치 코멘트"
        summary={coachComment.message}
      >
        <p className="text-sm leading-relaxed -mt-1">{coachComment.message}</p>
        <ul className="space-y-1.5">
          {coachComment.tips.map((tip) => (
            <li
              key={tip}
              className="text-[13px] text-muted-foreground flex items-start gap-2"
            >
              <span className="text-accent shrink-0">•</span>
              {tip}
            </li>
          ))}
        </ul>
      </CollapsibleCard>
    </div>
    </CollapsibleSectionProvider>
  )
}
