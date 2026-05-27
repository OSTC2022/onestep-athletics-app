"use client"

import { useEffect, useMemo, useState } from "react"
import { RefreshCw, Undo2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { CollapsibleInlineSection } from "@/components/collapsible-card"
import { MacroRangeLabel } from "@/components/macro-range-label"
import { formatCalories, type MacroTargets } from "@/lib/user-profile"
import {
  buildMealSlotTargets,
  NEXT_MEAL_SLOT,
  type FoodMealSlotId,
  type MealSlotMacroTargets,
} from "@/lib/meal-slot-targets"
import {
  evaluateMealNutrition,
  macroStatusColor,
  mealStatusBorderColor,
  type MacroEval,
  type MealEvaluationContext,
} from "@/lib/meal-evaluation"
import {
  buildDietJudgmentSummary,
  buildDietWarningContext,
  formatMacroG,
  nutritionPercent,
  sumLoggedNutrition,
  validateMacroCalories,
  type DietJudgmentKind,
  type LoggedNutrition,
} from "@/lib/food-nutrition-utils"
import { getFoodRecommendationsForJudgment } from "@/lib/food-recommendations"
import type { FoodDatabaseItem } from "@/lib/food-database"
import { cn } from "@/lib/utils"
import type { LoggedFoodEntry } from "@/lib/daily-food-log"
import { MEAL_SLOTS } from "@/lib/nutrition"

const FOOD_MEAL_SLOTS = MEAL_SLOTS.filter((slot) =>
  (["breakfast", "lunch", "dinner", "snack"] as FoodMealSlotId[]).includes(
    slot.id as FoodMealSlotId
  )
)

function groupCaloriesByMeal(entries: LoggedFoodEntry[]) {
  const grouped = Object.fromEntries(
    FOOD_MEAL_SLOTS.map((slot) => [slot.id, 0])
  ) as Record<(typeof FOOD_MEAL_SLOTS)[number]["id"], number>

  let unassigned = 0
  for (const entry of entries) {
    const kcal = entry.nutrition.calories
    if (entry.mealSlotId && grouped[entry.mealSlotId] !== undefined) {
      grouped[entry.mealSlotId] += kcal
    } else {
      unassigned += kcal
    }
  }

  return { grouped, unassigned }
}

type MealNutritionBucket = LoggedNutrition & { count: number }

function emptyMealBucket(): MealNutritionBucket {
  return {
    calories: 0,
    carbsG: 0,
    proteinG: 0,
    fatG: 0,
    sodiumMg: 0,
    sugarG: 0,
    fiberG: 0,
    count: 0,
  }
}

function groupNutritionByMeal(entries: LoggedFoodEntry[]) {
  const grouped = Object.fromEntries(
    FOOD_MEAL_SLOTS.map((slot) => [slot.id, emptyMealBucket()])
  ) as Record<(typeof FOOD_MEAL_SLOTS)[number]["id"], MealNutritionBucket>

  const unassigned = emptyMealBucket()

  for (const entry of entries) {
    const bucket =
      entry.mealSlotId && grouped[entry.mealSlotId]
        ? grouped[entry.mealSlotId]
        : unassigned
    const n = entry.nutrition
    bucket.calories += n.calories
    bucket.carbsG += n.carbsG
    bucket.proteinG += n.proteinG
    bucket.fatG += n.fatG
    bucket.sodiumMg += n.sodiumMg
    bucket.sugarG += n.sugarG ?? 0
    bucket.fiberG += n.fiberG ?? 0
    bucket.count += 1
  }

  for (const slot of FOOD_MEAL_SLOTS) {
    const bucket = grouped[slot.id]
    bucket.carbsG = Math.round(bucket.carbsG * 10) / 10
    bucket.proteinG = Math.round(bucket.proteinG * 10) / 10
    bucket.fatG = Math.round(bucket.fatG * 10) / 10
    bucket.sugarG = Math.round(bucket.sugarG * 10) / 10
    bucket.fiberG = Math.round(bucket.fiberG * 10) / 10
  }
  unassigned.carbsG = Math.round(unassigned.carbsG * 10) / 10
  unassigned.proteinG = Math.round(unassigned.proteinG * 10) / 10
  unassigned.fatG = Math.round(unassigned.fatG * 10) / 10
  unassigned.sugarG = Math.round(unassigned.sugarG * 10) / 10
  unassigned.fiberG = Math.round(unassigned.fiberG * 10) / 10

  return { grouped, unassigned }
}

function ScopeToggle({
  value,
  onChange,
}: {
  value: "daily" | "perMeal"
  onChange: (value: "daily" | "perMeal") => void
}) {
  return (
    <div className="flex rounded-lg bg-secondary/50 p-0.5 gap-0.5">
      {(
        [
          { id: "daily" as const, label: "오늘 섭취량" },
          { id: "perMeal" as const, label: "끼니별" },
        ] as const
      ).map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={cn(
            "flex-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
            value === item.id
              ? "bg-accent/15 text-accent ring-1 ring-accent/30"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {item.id === "daily" ? (
            <span className="block leading-tight text-center">
              <span className="block">오늘</span>
              <span className="block">섭취량</span>
            </span>
          ) : (
            item.label
          )}
        </button>
      ))}
    </div>
  )
}

function groupEntriesByMeal(entries: LoggedFoodEntry[]) {
  const grouped = Object.fromEntries(
    FOOD_MEAL_SLOTS.map((slot) => [slot.id, [] as LoggedFoodEntry[]])
  ) as Record<(typeof FOOD_MEAL_SLOTS)[number]["id"], LoggedFoodEntry[]>

  const unassigned: LoggedFoodEntry[] = []

  for (const entry of entries) {
    if (entry.mealSlotId && grouped[entry.mealSlotId]) {
      grouped[entry.mealSlotId].push(entry)
    } else {
      unassigned.push(entry)
    }
  }

  return { grouped, unassigned }
}

function MacroRow({
  macro,
  unit,
  formatValue,
  nested,
}: {
  macro: MacroEval
  unit: string
  formatValue?: (v: number) => string
  nested?: boolean
}) {
  const format = formatValue ?? formatMacroG
  const color = macroStatusColor(macro.status)
  const unitSuffix = unit === "kcal" || unit === "mg" ? ` ${unit}` : unit

  return (
    <div className={nested ? "pl-2" : undefined}>
      <div className="flex flex-nowrap justify-between gap-1.5 text-[10px] tabular-nums min-w-0">
        <span className="text-muted-foreground whitespace-nowrap shrink-0">
          {nested ? "└ " : ""}
          {macro.label}
        </span>
        <span className={cn(color, "whitespace-nowrap shrink-0 text-right")}>
          {format(macro.actual)} / {format(macro.target)}
          {unitSuffix}
          {macro.status !== "none" ? (
            <span className="ml-0.5">{macro.statusLabel}</span>
          ) : null}
        </span>
      </div>
      {macro.target > 0 ? (
        <Progress
          value={Math.min(100, macro.ratio)}
          className={cn("h-1", nested && "ml-2", macro.status === "very-high" || macro.status === "low" ? "[&>div]:bg-red-500/70" : macro.status === "high" ? "[&>div]:bg-amber-500/70" : "[&>div]:bg-accent/70")}
        />
      ) : null}
    </div>
  )
}

function PerMealSummaryCard({
  slotId,
  label,
  nutrition,
  slotTargets,
  mealEntries,
  coachingContext,
  undoAvailable = false,
  onClearOrUndo,
}: {
  slotId?: FoodMealSlotId
  label: string
  nutrition: MealNutritionBucket
  slotTargets: MealSlotMacroTargets
  mealEntries: LoggedFoodEntry[]
  coachingContext?: MealEvaluationContext
  undoAvailable?: boolean
  onClearOrUndo?: () => void
}) {
  const nextMeal = slotId ? NEXT_MEAL_SLOT[slotId] : undefined
  const evaluation = useMemo(
    () =>
      evaluateMealNutrition(
        nutrition,
        slotTargets,
        mealEntries,
        slotId ?? "breakfast",
        label,
        nextMeal?.label,
        coachingContext
      ),
    [nutrition, slotTargets, mealEntries, slotId, label, nextMeal?.label, coachingContext]
  )

  const calories = evaluation.macros.find((m) => m.key === "calories")
  const carbs = evaluation.macros.find((m) => m.key === "carbs")
  const sugar = evaluation.macros.find((m) => m.key === "sugar")
  const fiber = evaluation.macros.find((m) => m.key === "fiber")
  const protein = evaluation.macros.find((m) => m.key === "protein")
  const fat = evaluation.macros.find((m) => m.key === "fat")
  const sodium = evaluation.macros.find((m) => m.key === "sodium")

  const statusLabel =
    evaluation.overallStatus === "good"
      ? "양호"
      : evaluation.overallStatus === "caution"
        ? "주의"
        : evaluation.overallStatus === "bad"
          ? "개선 필요"
          : "기록 없음"

  const statusColor =
    evaluation.overallStatus === "good"
      ? "text-accent"
      : evaluation.overallStatus === "caution"
        ? "text-amber-400"
        : evaluation.overallStatus === "bad"
          ? "text-red-400"
          : "text-muted-foreground"

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5 space-y-2",
        mealStatusBorderColor(evaluation.overallStatus)
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-[12px] font-semibold text-accent">{label}</p>
          <span className={cn("text-[10px] font-medium", statusColor)}>
            {statusLabel}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
          {nutrition.count}개 · 목표 {formatCalories(slotTargets.calories)}kcal
        </span>
      </div>

      {nutrition.count > 0 ? (
        <>
          {calories ? (
            <MacroRow macro={calories} unit="kcal" formatValue={formatCalories} />
          ) : null}

          {carbs ? (
            <div className="space-y-1">
              <MacroRow macro={carbs} unit="g" />
              <div className="space-y-1 pl-1 border-l border-accent/15 ml-0.5">
                {sugar ? <MacroRow macro={sugar} unit="g" nested /> : null}
                {fiber ? <MacroRow macro={fiber} unit="g" nested /> : null}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-1.5">
            {protein ? <MacroRow macro={protein} unit="g" /> : null}
            {fat ? <MacroRow macro={fat} unit="g" /> : null}
            {sodium ? (
              <MacroRow macro={sodium} unit="mg" formatValue={formatCalories} />
            ) : null}
          </div>

          {evaluation.refinedCarbLevel === "high" && !evaluation.coachingSummary ? (
            <p className="text-[10px] text-amber-400/90 leading-relaxed">
              정제 탄수화물 비중이 높아요
            </p>
          ) : null}

          {evaluation.foodTags.length > 0 ? (
            <div className="space-y-1">
              {evaluation.foodTags.map((item) => (
                <div
                  key={item.name}
                  className="rounded-lg border border-border/40 bg-secondary/15 px-2 py-1.5"
                >
                  <p className="text-[10px] font-medium text-foreground/90">
                    {item.name}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="rounded-full border border-border/50 bg-background/50 px-1.5 py-0.5 text-[9px] text-muted-foreground"
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                  {item.hint ? (
                    <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground/90">
                      {item.hint}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {evaluation.coachingSummary ? (
            <p
              className={cn(
                "rounded-lg border px-2 py-1.5 text-[10px] leading-relaxed whitespace-pre-line",
                evaluation.qualityMismatch
                  ? "border-amber-500/30 bg-amber-500/5 text-amber-200/90"
                  : evaluation.overallStatus === "bad"
                    ? "border-red-500/30 bg-red-500/5 text-red-200/90"
                    : evaluation.overallStatus === "good"
                      ? "border-accent/30 bg-accent/5 text-accent/90"
                      : "border-border/40 bg-secondary/20 text-muted-foreground"
              )}
            >
              {evaluation.coachingSummary}
            </p>
          ) : null}

          {evaluation.foodAlerts.map((alert) => (
            <p
              key={alert}
              className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-2 py-1.5 text-[10px] leading-relaxed text-amber-200/90"
            >
              {alert}
            </p>
          ))}

          {evaluation.messages
            .filter((message) => message !== evaluation.coachingSummary)
            .map((message) => (
            <p
              key={message}
              className={cn(
                "rounded-lg border px-2 py-1.5 text-[10px] leading-relaxed",
                evaluation.qualityMismatch
                  ? "border-amber-500/30 bg-amber-500/5 text-amber-200/90"
                  : "border-border/40 bg-secondary/20 text-muted-foreground"
              )}
            >
              {message}
            </p>
          ))}

          {evaluation.nextMealRecommendation && !evaluation.coachingSummary ? (
            <div className="rounded-lg border border-accent/25 bg-accent/5 px-2 py-1.5">
              <p className="text-[9px] font-medium text-accent mb-0.5">
                다음 식사 추천
              </p>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                {evaluation.nextMealRecommendation}
              </p>
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-[10px] text-muted-foreground">아직 기록이 없어요.</p>
      )}

      {slotId && onClearOrUndo ? (
        <button
          type="button"
          disabled={!undoAvailable && nutrition.count === 0}
          onClick={onClearOrUndo}
          className={cn(
            "w-full h-8 rounded-lg text-[10px] font-medium transition-colors inline-flex items-center justify-center gap-1",
            undoAvailable
              ? "border border-accent/35 bg-accent/10 text-accent hover:bg-accent/20"
              : "border border-border/60 bg-background/30 text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5",
            "disabled:opacity-40 disabled:pointer-events-none"
          )}
        >
          {undoAvailable ? (
            <>
              <Undo2 className="h-3 w-3" />
              되돌리기
            </>
          ) : (
            "메뉴 비우기"
          )}
        </button>
      ) : null}
    </div>
  )
}

function JudgmentChip({
  label,
  tone,
  active,
  actionable,
  onClick,
}: {
  label: string
  tone: "ok" | "warn" | "caution" | "neutral"
  active?: boolean
  actionable?: boolean
  onClick?: () => void
}) {
  const className = cn(
    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
    tone === "ok" && "border-accent/40 bg-accent/10 text-accent",
    tone === "warn" && "border-amber-500/40 bg-amber-500/10 text-amber-400",
    tone === "caution" &&
      "border-orange-500/35 bg-orange-500/10 text-orange-300",
    tone === "neutral" && "border-border/60 bg-secondary/30 text-muted-foreground",
    actionable && "cursor-pointer hover:brightness-125",
    active && "ring-1 ring-accent/50 bg-accent/20"
  )

  if (actionable && onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {label}
      </button>
    )
  }

  return <span className={className}>{label}</span>
}

function RecommendationPanel({
  bundle,
  onSelectFood,
  onRefresh,
}: {
  bundle: NonNullable<ReturnType<typeof getFoodRecommendationsForJudgment>>
  onSelectFood?: (food: FoodDatabaseItem) => void
  onRefresh?: () => void
}) {
  const categories = useMemo(
    () => new Set(bundle.items.map(({ food }) => food.category)).size,
    [bundle.items]
  )

  return (
    <div className="rounded-xl border border-accent/25 bg-background/50 px-3 py-2.5 space-y-2 overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-accent">{bundle.title}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{bundle.subtitle}</p>
          <p className="text-[10px] text-muted-foreground/80 mt-1 tabular-nums">
            {bundle.items.length}종 · 카테고리 {categories}개
          </p>
        </div>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-border/60 bg-secondary/30 px-2 py-1.5 text-[10px] font-medium text-muted-foreground hover:border-accent/30 hover:text-accent transition-colors"
            aria-label="다른 음식으로 다시 추천"
          >
            <RefreshCw className="size-3" />
            새로고침
          </button>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-lg border border-border/40 bg-background/20">
        <div
          className="max-h-[min(240px,42dvh)] overflow-y-auto overscroll-y-contain touch-pan-y pr-1 [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]"
          aria-label="추천 음식 목록"
        >
          <ul className="space-y-1.5 p-1.5">
            {bundle.items.map(({ food, hint }) => (
              <li key={food.id}>
                <button
                  type="button"
                  onClick={() => onSelectFood?.(food)}
                  className="w-full rounded-lg border border-border/50 bg-secondary/20 px-2.5 py-2 text-left hover:border-accent/30 hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-medium">{food.name}</p>
                    <span className="shrink-0 rounded-full border border-accent/25 bg-accent/10 px-1.5 py-0.5 text-[9px] font-medium text-accent">
                      {food.category}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                    {hint}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>
        {bundle.items.length > 4 ? (
          <p className="border-t border-border/30 px-2 py-1 text-center text-[9px] text-muted-foreground/70">
            휠 또는 드래그로 더 보기
          </p>
        ) : null}
      </div>
    </div>
  )
}

function MacroCard({
  label,
  value,
  target,
  unit,
  pct,
  formatValue,
  children,
}: {
  label: string
  value: number
  target: number
  unit: string
  pct: number
  formatValue?: (value: number) => string
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/40 px-3 py-2.5 min-w-0">
      <div className="flex flex-nowrap items-center justify-between gap-1.5 mb-1.5 min-w-0">
        <span className="text-[11px] font-medium text-foreground whitespace-nowrap shrink-0">
          {label}
        </span>
        <span className="text-[10px] sm:text-[11px] tabular-nums text-muted-foreground whitespace-nowrap shrink-0 text-right">
          <MacroRangeLabel
            value={value}
            target={target}
            unit={unit}
            formatValue={formatValue}
          />
        </span>
      </div>
      <Progress value={pct} className="h-1.5" />
      {children}
    </div>
  )
}

export function NutritionDailySummary({
  entries,
  targets,
  onSelectFood,
  onClearAllOrUndo,
  clearAllUndoAvailable = false,
  onClearOrUndoMealSlot,
  mealSlotUndoAvailable,
}: {
  entries: LoggedFoodEntry[]
  targets: MacroTargets
  onSelectFood?: (food: FoodDatabaseItem) => void
  onClearAllOrUndo?: () => void
  clearAllUndoAvailable?: boolean
  onClearOrUndoMealSlot?: (slotId: FoodMealSlotId, label: string) => void
  mealSlotUndoAvailable?: Partial<Record<FoodMealSlotId, boolean>>
}) {
  const [activeKind, setActiveKind] = useState<DietJudgmentKind | null>(null)
  const [recommendationExcludeIds, setRecommendationExcludeIds] = useState<string[]>([])
  const [recommendationRotateOffset, setRecommendationRotateOffset] = useState(0)
  const totals = useMemo(() => sumLoggedNutrition(entries), [entries])

  const mealNutrition = useMemo(() => groupNutritionByMeal(entries), [entries])
  const mealEntries = useMemo(() => groupEntriesByMeal(entries), [entries])
  const mealSlotTargets = useMemo(
    () =>
      targets.perMealBySlot ??
      buildMealSlotTargets(
        targets,
        targets.breakdown.coachingMode ?? null,
        targets.breakdown.snackCalorieMax ?? null
      ),
    [targets]
  )

  const coachingContext = useMemo<MealEvaluationContext>(
    () => ({
      coachingMode: targets.breakdown.coachingMode ?? null,
    }),
    [targets.breakdown.coachingMode]
  )

  const judgmentTags = useMemo(
    () => buildDietJudgmentSummary(totals, targets),
    [totals, targets]
  )

  const warningContext = useMemo(
    () => buildDietWarningContext(judgmentTags),
    [judgmentTags]
  )

  const recommendationBundle = useMemo(
    () =>
      activeKind
        ? getFoodRecommendationsForJudgment(activeKind, warningContext, {
            excludeIds: recommendationExcludeIds,
            rotateOffset: recommendationRotateOffset,
          })
        : null,
    [activeKind, warningContext, recommendationExcludeIds, recommendationRotateOffset]
  )

  useEffect(() => {
    setRecommendationExcludeIds([])
    setRecommendationRotateOffset(0)
  }, [activeKind])

  const handleRefreshRecommendations = () => {
    if (!recommendationBundle?.items.length) return
    setRecommendationExcludeIds((prev) => [
      ...prev,
      ...recommendationBundle.items.map(({ food }) => food.id),
    ])
    setRecommendationRotateOffset((prev) => prev + recommendationBundle.items.length)
  }

  useEffect(() => {
    if (totals.count === 0) return
    validateMacroCalories(totals, "오늘 식단 합계")
    for (const entry of entries) {
      validateMacroCalories(entry.nutrition, entry.name)
    }
  }, [totals, entries])

  if (totals.count === 0 && !clearAllUndoAvailable) return null

  const evaluationSummary = judgmentTags
    .slice(0, 3)
    .map((tag) => tag.label)
    .join(" · ")

  const mealSummary = `${totals.count}개 기록 · ${FOOD_MEAL_SLOTS.length}끼`

  return (
    <div className="space-y-2 mb-3">
      <CollapsibleInlineSection
        title="식단 질 평가"
        summary={evaluationSummary || `${totals.count}개 기록`}
        sectionId="nutrition-diet-evaluation"
      >
        <div className="rounded-xl border border-accent/25 bg-accent/5 px-3 py-2.5">
          <p className="text-[10px] text-muted-foreground mb-2">
            태그를 눌러 부족한 영양소 보완 음식을 추천받을 수 있어요.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {judgmentTags.map((tag) => (
              <JudgmentChip
                key={tag.label}
                label={tag.label}
                tone={tag.tone}
                actionable={tag.actionable}
                active={activeKind === tag.kind}
                onClick={
                  tag.actionable
                    ? () =>
                        setActiveKind((prev) =>
                          prev === tag.kind ? null : tag.kind
                        )
                    : undefined
                }
              />
            ))}
          </div>
          {recommendationBundle ? (
            <div className="mt-3">
              <RecommendationPanel
                bundle={recommendationBundle}
                onSelectFood={onSelectFood}
                onRefresh={handleRefreshRecommendations}
              />
            </div>
          ) : null}
        </div>
      </CollapsibleInlineSection>

      <CollapsibleInlineSection
        title="끼니별 보기"
        summary={mealSummary}
        sectionId="nutrition-meal-breakdown"
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {FOOD_MEAL_SLOTS.map((slot) => (
            <PerMealSummaryCard
              key={slot.id}
              slotId={slot.id as FoodMealSlotId}
              label={slot.label}
              nutrition={mealNutrition.grouped[slot.id as FoodMealSlotId]}
              slotTargets={mealSlotTargets[slot.id as FoodMealSlotId]}
              mealEntries={mealEntries.grouped[slot.id as FoodMealSlotId]}
              coachingContext={coachingContext}
              undoAvailable={Boolean(
                mealSlotUndoAvailable?.[slot.id as FoodMealSlotId]
              )}
              onClearOrUndo={
                onClearOrUndoMealSlot
                  ? () =>
                      onClearOrUndoMealSlot(slot.id as FoodMealSlotId, slot.label)
                  : undefined
              }
            />
          ))}
          {mealNutrition.unassigned.count > 0 ? (
            <div className="sm:col-span-2">
              <PerMealSummaryCard
                label="미정"
                nutrition={mealNutrition.unassigned}
                slotTargets={mealSlotTargets.lunch}
                mealEntries={mealEntries.unassigned}
                coachingContext={coachingContext}
              />
            </div>
          ) : null}
        </div>
      </CollapsibleInlineSection>

      {onClearAllOrUndo ? (
        <button
          type="button"
          disabled={!clearAllUndoAvailable && totals.count === 0}
          onClick={onClearAllOrUndo}
          className={cn(
            "w-full h-9 rounded-lg text-[11px] font-medium transition-colors inline-flex items-center justify-center gap-1.5",
            clearAllUndoAvailable
              ? "border border-accent/35 bg-accent/10 text-accent hover:bg-accent/20"
              : "border border-border/60 text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5",
            "disabled:opacity-40 disabled:pointer-events-none"
          )}
        >
          {clearAllUndoAvailable ? (
            <>
              <Undo2 className="h-3.5 w-3.5" />
              되돌리기
            </>
          ) : (
            "메뉴 모두 비우기"
          )}
        </button>
      ) : null}
    </div>
  )
}

export type { LoggedNutrition }
