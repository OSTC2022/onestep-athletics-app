"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Apple,
  ChevronDown,
  Droplets,
  MessageSquare,
  TrendingDown,
  Utensils,
  Check,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  getWeeklyNutritionReport,
  loadTodayMealLog,
  MEAL_SLOTS,
  NUTRITION_EVENT,
  NUTRITION_BASIS_LABEL,
  WEIGHT_TRACKER_EVENT,
  toggleMealSlot,
  formatCalories,
  type MealSlotId,
  type TodayMealLog,
  type AdjustedMealPlan,
} from "@/lib/nutrition"
import { USER_PROFILE_EVENT } from "@/lib/user-profile"
import { getTodayScheduleDay } from "@/lib/weekly-schedule"
import { NutritionStatusCard } from "@/components/nutrition-status-card"
import { NutritionWeightMotivation } from "@/components/nutrition-weight-motivation"
import { NutritionTargetPanel } from "@/components/meal-food-alternatives"
import { FoodSearchPanel } from "@/components/food-search-panel"
import { ProfileIncompleteBanner } from "@/components/profile-incomplete-banner"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useHydrated } from "@/hooks/use-hydrated"
import { cn } from "@/lib/utils"

export function NutritionPage() {
  const hydrated = useHydrated()
  const [profileVersion, setProfileVersion] = useState(0)
  const [mealPlan, setMealPlan] = useState<AdjustedMealPlan | null>(null)
  const [showCalcDetail, setShowCalcDetail] = useState(false)
  const profile = useMemo(
    () => (hydrated ? getNutritionProfile() : getDefaultNutritionProfile()),
    [hydrated, profileVersion]
  )
  const todaySchedule = useMemo(() => getTodayScheduleDay(), [])
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
  const weeklyReport = useMemo(
    () =>
      hydrated
        ? getWeeklyNutritionReport()
        : {
            weightChangeKg: 0,
            attendanceRate: 0,
            trainingVolumeKm: 0,
            mealLogRate: 0,
          },
    [hydrated, profileVersion]
  )

  useEffect(() => {
    if (!hydrated) return
    ensureWeightLogSeeded()
    const syncMeals = () => setMealLog(loadTodayMealLog())
    const syncProfile = () => setProfileVersion((v) => v + 1)
    syncMeals()
    window.addEventListener(NUTRITION_EVENT, syncMeals)
    window.addEventListener(USER_PROFILE_EVENT, syncProfile)
    window.addEventListener(WEIGHT_TRACKER_EVENT, syncProfile)
    return () => {
      window.removeEventListener(NUTRITION_EVENT, syncMeals)
      window.removeEventListener(USER_PROFILE_EVENT, syncProfile)
      window.removeEventListener(WEIGHT_TRACKER_EVENT, syncProfile)
    }
  }, [hydrated])

  void mealPlan

  const handleToggleMeal = (slotId: MealSlotId) => {
    setMealLog(toggleMealSlot(slotId))
  }

  const mealProgress = Math.round(
    (mealLog.recordedSlots.length / MEAL_SLOTS.length) * 100
  )

  return (
    <div className="px-4 py-6 space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">영양·체중관리</h1>
        <p className="text-sm text-muted-foreground">
          {formatKoreanDateWithWeekday()}
          {todaySchedule && (
            <span className="ml-1.5">· 오늘 {todaySchedule.type}</span>
          )}
        </p>
      </header>

      <NutritionWeightMotivation />

      <NutritionStatusCard onUpdated={() => setProfileVersion((v) => v + 1)} />

      {/* 2. 오늘 영양 목표 */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Apple className="h-4 w-4 text-accent" />
            오늘의 영양 관리
          </CardTitle>
          <p className="text-[12px] text-accent mt-1">
            {targets.breakdown.goalModeLabel}
          </p>
          {targets.breakdown.expectedWeightChangeRange && (
            <p className="text-[11px] text-muted-foreground mt-1">
              {profile.expectedWeightChangeLabel}{" "}
              {targets.breakdown.expectedWeightChangeRange}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <NutritionTargetPanel targets={targets} onPlanChange={setMealPlan} />

          <Collapsible open={showCalcDetail} onOpenChange={setShowCalcDetail}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <span className="text-[13px] font-medium">계산 기준 보기</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    showCalcDetail && "rotate-180"
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
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
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* 3. 음식 검색 · 오늘 식단 */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Utensils className="h-4 w-4 text-accent" />
            음식 검색 · 오늘 식단
          </CardTitle>
          <p className="text-[11px] text-muted-foreground font-normal mt-1">
            음식을 검색하면 영양성분표와 1끼·하루 목표에 맞는 섭취량을
            확인할 수 있습니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <ProfileIncompleteBanner
            message={targets.breakdown.profileIncompleteMessage}
          />
          <FoodSearchPanel targets={targets} />
        </CardContent>
      </Card>

      {/* 4. 오늘 식단 기록 (끼니 체크) */}
      <Card className="bg-card border-border" id="meals">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Check className="h-4 w-4 text-accent" />
              식단 기록
            </CardTitle>
            <span className="text-xs text-muted-foreground tabular-nums">
              {mealLog.recordedSlots.length}/{MEAL_SLOTS.length}
            </span>
          </div>
          <Progress value={mealProgress} className="h-1.5 mt-2" />
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* 4. 코치 코멘트 */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-accent" />
            코치 코멘트
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed">{coachComment.message}</p>
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
        </CardContent>
      </Card>

      {/* 5. 주간 리포트 */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-accent" />
            주간 리포트
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-secondary/40 px-3 py-2.5">
              <p className="text-xs text-muted-foreground mb-0.5">체중 변화</p>
              <p className="text-lg font-bold tabular-nums">
                {weeklyReport.weightChangeKg > 0 ? "+" : ""}
                {weeklyReport.weightChangeKg}kg
              </p>
            </div>
            <div className="rounded-lg bg-secondary/40 px-3 py-2.5">
              <p className="text-xs text-muted-foreground mb-0.5">출석률</p>
              <p className="text-lg font-bold tabular-nums">
                {weeklyReport.attendanceRate}%
              </p>
            </div>
            <div className="rounded-lg bg-secondary/40 px-3 py-2.5">
              <p className="text-xs text-muted-foreground mb-0.5">훈련량</p>
              <p className="text-lg font-bold tabular-nums">
                {weeklyReport.trainingVolumeKm}km
              </p>
            </div>
            <div className="rounded-lg bg-secondary/40 px-3 py-2.5">
              <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                <Droplets className="h-3 w-3" />
                식단 기록률
              </p>
              <p className="text-lg font-bold tabular-nums">
                {weeklyReport.mealLogRate}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
