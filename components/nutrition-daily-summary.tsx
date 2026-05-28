"use client"

import { useEffect, useMemo, useState } from "react"
import { Undo2, X, Plus, Lock } from "lucide-react"
import { toast } from "sonner"
import { useHydrated } from "@/hooks/use-hydrated"
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
  type MealNutritionEvaluationContext,
} from "@/lib/nutrition-evaluation"
import {
  macroStatusColor,
  mealStatusBorderColor,
  type MacroEval,
  type MealEvaluationContext,
} from "@/lib/meal-evaluation"
import {
  formatMacroG,
  nutritionPercent,
  sumLoggedNutrition,
  validateMacroCalories,
  type LoggedNutrition,
} from "@/lib/food-nutrition-utils"
import type { FoodDatabaseItem } from "@/lib/food-database"
import type { RecommendFoodCombo } from "@/lib/food-recommendation-types"
import { NutritionQualityPanel } from "@/components/nutrition-quality-panel"
import { MealSlotInlineFoodSearch } from "@/components/meal-slot-inline-food-search"
import { cn } from "@/lib/utils"
import type { LoggedFoodEntry } from "@/lib/daily-food-log"
import {
  foodLogEntriesFromSavedItems,
  replaceMealSlotFoodLogEntries,
} from "@/lib/daily-food-log"
import { MEAL_SLOTS } from "@/lib/nutrition"
import {
  deleteSavedMealSlot,
  listSavedMealSlots,
  saveMealSlotFromLogEntries,
  SAVED_MEAL_MENU_EVENT,
  type SavedMealSlotRecord,
} from "@/lib/saved-meal-menu-store"
import { MealSlotSaveLoadBar } from "@/components/meal-slot-save-load-bar"
import { MealSlotConfirmButtons } from "@/components/meal-slot-confirm-buttons"
import {
  CONFIRMED_MEAL_SLOTS_EVENT,
  confirmMealSlot,
  isMealSlotConfirmed,
} from "@/lib/confirmed-meal-slots"

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

function MealEntryList({
  entries,
  onSelectEntry,
  onRemoveEntry,
  locked = false,
}: {
  entries: LoggedFoodEntry[]
  onSelectEntry?: (entry: LoggedFoodEntry) => void
  onRemoveEntry?: (entry: LoggedFoodEntry) => void
  locked?: boolean
}) {
  return (
    <ul className="space-y-1">
      {entries.map((entry) => (
        <li key={entry.id}>
          <div
            className={cn(
              "relative rounded-lg border border-border/40 bg-secondary/15 transition-colors",
              !locked && "hover:border-accent/30"
            )}
          >
            {!locked && onRemoveEntry ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveEntry(entry)
                }}
                className="absolute top-1 right-1 z-10 flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label={`${entry.name} 삭제`}
              >
                <X className="h-3 w-3" />
              </button>
            ) : null}
            <button
              type="button"
              disabled={locked}
              onClick={() => !locked && onSelectEntry?.(entry)}
              className={cn(
                "w-full px-2 py-1.5 text-left rounded-lg transition-colors",
                !locked && onRemoveEntry ? "pr-7" : "",
                locked
                  ? "cursor-default opacity-90"
                  : "hover:bg-accent/5"
              )}
            >
              <p className="text-[11px] font-medium leading-snug">{entry.name}</p>
              <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                {entry.displayAmount} · {formatCalories(entry.nutrition.calories)}kcal
              </p>
              <p className="text-[9px] text-muted-foreground/80 tabular-nums mt-0.5">
                탄수 {formatMacroG(entry.nutrition.carbsG)}g · 단백{" "}
                {formatMacroG(entry.nutrition.proteinG)}g · 지방{" "}
                {formatMacroG(entry.nutrition.fatG)}g
              </p>
            </button>
          </div>
        </li>
      ))}
    </ul>
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
  onConfirmMealSlot,
  onUnlockMealSlot,
  onSelectEntry,
  onRemoveEntry,
  inlineAddOpen = false,
  onToggleInlineAdd,
  onPickFoodForSlot,
  searchTargets,
  allLogEntries = [],
}: {
  slotId?: FoodMealSlotId
  label: string
  nutrition: MealNutritionBucket
  slotTargets: MealSlotMacroTargets
  mealEntries: LoggedFoodEntry[]
  coachingContext?: MealEvaluationContext
  undoAvailable?: boolean
  onClearOrUndo?: () => void
  onConfirmMealSlot?: (slotId: FoodMealSlotId, label: string) => void
  onUnlockMealSlot?: (slotId: FoodMealSlotId, label: string) => void
  onSelectEntry?: (entry: LoggedFoodEntry) => void
  onRemoveEntry?: (entry: LoggedFoodEntry) => void
  inlineAddOpen?: boolean
  onToggleInlineAdd?: (slotId: FoodMealSlotId) => void
  onPickFoodForSlot?: (food: FoodDatabaseItem, slotId: FoodMealSlotId) => void
  searchTargets?: MacroTargets
  allLogEntries?: LoggedFoodEntry[]
}) {
  const hydrated = useHydrated()
  const [savedListVersion, setSavedListVersion] = useState(0)
  const [confirmedVersion, setConfirmedVersion] = useState(0)
  const [showGraph, setShowGraph] = useState(false)
  const nextMeal = slotId ? NEXT_MEAL_SLOT[slotId] : undefined
  const evaluation = useMemo(() => {
    const ctx: MealNutritionEvaluationContext = {
      mealSlot: slotId ?? "breakfast",
      slotLabel: label,
      defaultTargets: slotTargets,
      coachingMode: coachingContext?.coachingMode ?? null,
      nextMealLabel: nextMeal?.label,
    }
    return evaluateMealNutrition(nutrition, mealEntries, ctx)
  }, [nutrition, slotTargets, mealEntries, slotId, label, nextMeal?.label, coachingContext])

  const calories = evaluation.macros.find((m) => m.key === "calories")
  const carbs = evaluation.macros.find((m) => m.key === "carbs")
  const sugar = evaluation.macros.find((m) => m.key === "sugar")
  const fiber = evaluation.macros.find((m) => m.key === "fiber")
  const protein = evaluation.macros.find((m) => m.key === "protein")
  const fat = evaluation.macros.find((m) => m.key === "fat")
  const sodium = evaluation.macros.find((m) => m.key === "sodium")

  const statusLabel =
    evaluation.displayStatusLabel ??
    (evaluation.overallStatus === "good"
      ? "양호"
      : evaluation.overallStatus === "caution"
        ? "주의"
        : evaluation.overallStatus === "bad"
          ? "개선 필요"
          : "기록 없음")

  const targetCalLabel = evaluation.usesRecommendationCriteria
    ? `${Math.round(evaluation.recommendationContext!.targetRange.calories.min)}~${Math.round(evaluation.recommendationContext!.targetRange.calories.max)}`
    : formatCalories(slotTargets.calories)

  const statusColor =
    evaluation.overallStatus === "good"
      ? "text-accent"
      : evaluation.overallStatus === "caution"
        ? "text-amber-400"
        : evaluation.overallStatus === "bad"
          ? "text-red-400"
          : "text-muted-foreground"

  const toggleGraph = () => {
    if (nutrition.count > 0) setShowGraph((prev) => !prev)
  }

  useEffect(() => {
    if (!hydrated || !slotId) return
    const handler = () => setSavedListVersion((version) => version + 1)
    window.addEventListener(SAVED_MEAL_MENU_EVENT, handler)
    return () => window.removeEventListener(SAVED_MEAL_MENU_EVENT, handler)
  }, [hydrated, slotId])

  useEffect(() => {
    if (!hydrated) return
    const handler = () => setConfirmedVersion((version) => version + 1)
    window.addEventListener(CONFIRMED_MEAL_SLOTS_EVENT, handler)
    return () => window.removeEventListener(CONFIRMED_MEAL_SLOTS_EVENT, handler)
  }, [hydrated])

  void confirmedVersion
  const mealConfirmed = slotId ? isMealSlotConfirmed(slotId) : false

  const savedSlots = useMemo(() => {
    if (!hydrated || !slotId) return []
    return listSavedMealSlots().filter((item) => item.slotId === slotId)
  }, [hydrated, slotId, savedListVersion])

  const handleSaveSlot = (name: string) => {
    if (!slotId) return
    const record = saveMealSlotFromLogEntries(
      slotId,
      label,
      mealEntries.map((entry) => ({
        foodId: entry.foodId,
        servingCount: entry.servingCount,
        name: entry.name,
      })),
      name
    )
    toast.success(`「${record.name}」을 저장했습니다`)
  }

  const handleLoadSlot = (record: SavedMealSlotRecord) => {
    replaceMealSlotFoodLogEntries(
      record.slotId,
      foodLogEntriesFromSavedItems(record.slotId, record.label, record.items)
    )
    confirmMealSlot(record.slotId)
    toast.success(`「${record.name}」을 불러왔습니다`)
  }

  const handleDeleteSavedSlot = (id: string) => {
    deleteSavedMealSlot(id)
    toast.message("저장된 끼니 메뉴를 삭제했습니다")
  }

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5 space-y-2",
        mealStatusBorderColor(evaluation.overallStatus)
      )}
    >
      <button
        type="button"
        onClick={toggleGraph}
        disabled={nutrition.count === 0}
        className={cn(
          "w-full text-left space-y-1 rounded-lg transition-colors",
          nutrition.count > 0 && "hover:bg-secondary/25 -mx-1 px-1 py-0.5"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-[12px] font-semibold text-accent">{label}</p>
            {mealConfirmed ? (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[9px] font-medium text-accent">
                <Lock className="h-2.5 w-2.5" />
                결정됨
              </span>
            ) : null}
            <span className={cn("text-[10px] font-medium", statusColor)}>
              {statusLabel}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
            {nutrition.count}개 · 목표 {targetCalLabel}kcal
          </span>
        </div>
        {nutrition.count > 0 ? (
          <p className="text-[9px] text-accent/70">
            {showGraph ? "탭하여 음식 목록 보기" : "탭하여 영양 그래프 보기"}
          </p>
        ) : null}
      </button>

      {nutrition.count > 0 && showGraph && evaluation.recommendationContext ? (
        <div className="flex flex-wrap items-center gap-1">
          <span className="rounded border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[9px] font-medium text-accent">
            {evaluation.recommendationContext.evaluationBadgeLabel}
          </span>
          {evaluation.usesRecommendationCriteria ? (
            <span className="text-[9px] text-muted-foreground">
              추천 식단 기준 평가
            </span>
          ) : null}
        </div>
      ) : null}

      {nutrition.count > 0 && !showGraph ? (
        <MealEntryList
          entries={mealEntries}
          locked={mealConfirmed}
          onSelectEntry={mealConfirmed ? undefined : onSelectEntry}
          onRemoveEntry={mealConfirmed ? undefined : onRemoveEntry}
        />
      ) : null}

      {!showGraph &&
      slotId &&
      !mealConfirmed &&
      inlineAddOpen &&
      searchTargets &&
      onPickFoodForSlot ? (
        <MealSlotInlineFoodSearch
          slotLabel={label}
          targets={searchTargets}
          logEntries={allLogEntries}
          onClose={() => onToggleInlineAdd?.(slotId)}
          onSelectFood={(food) => onPickFoodForSlot(food, slotId)}
        />
      ) : !showGraph && slotId && !mealConfirmed && onToggleInlineAdd ? (
        <button
          type="button"
          onClick={() => onToggleInlineAdd(slotId)}
          className="w-full h-8 rounded-lg border border-dashed border-accent/35 bg-accent/5 text-[10px] font-medium text-accent hover:bg-accent/10 transition-colors inline-flex items-center justify-center gap-1"
        >
          <Plus className="h-3 w-3" />
          메뉴 추가
        </button>
      ) : null}

      {nutrition.count > 0 && showGraph ? (
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
      ) : null}

      {nutrition.count === 0 ? (
        <p className="text-[10px] text-muted-foreground">아직 기록이 없어요.</p>
      ) : null}

      {slotId && !mealConfirmed ? (
        <MealSlotSaveLoadBar
          slotId={slotId}
          mealLabel={label}
          savedSlots={savedSlots}
          saveDisabled={mealEntries.length === 0}
          onSave={handleSaveSlot}
          onLoadSlot={handleLoadSlot}
          onDeleteSlot={handleDeleteSavedSlot}
        />
      ) : null}

      {slotId && (onClearOrUndo || onConfirmMealSlot || onUnlockMealSlot) ? (
        <MealSlotConfirmButtons
          hasItems={nutrition.count > 0}
          undoAvailable={undoAvailable}
          isConfirmed={mealConfirmed}
          compact
          onClearOrUndo={onClearOrUndo ?? (() => {})}
          onConfirm={() => {
            if (!slotId || !onConfirmMealSlot) return
            onConfirmMealSlot(slotId, label)
          }}
          onUnlock={() => {
            if (!slotId || !onUnlockMealSlot) return
            onUnlockMealSlot(slotId, label)
          }}
        />
      ) : null}
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
  onSelectLogEntry,
  onRemoveLogEntry,
  inlineAddSlotId,
  onToggleInlineAdd,
  onPickFoodForSlot,
  onClearAllOrUndo,
  clearAllUndoAvailable = false,
  onClearOrUndoMealSlot,
  mealSlotUndoAvailable,
  onApplyRecommendedItem,
  onConfirmMealSlot,
  onUnlockMealSlot,
}: {
  entries: LoggedFoodEntry[]
  targets: MacroTargets
  onSelectFood?: (food: FoodDatabaseItem) => void
  onSelectLogEntry?: (entry: LoggedFoodEntry) => void
  onRemoveLogEntry?: (entry: LoggedFoodEntry) => void
  inlineAddSlotId?: FoodMealSlotId | null
  onToggleInlineAdd?: (slotId: FoodMealSlotId) => void
  onPickFoodForSlot?: (food: FoodDatabaseItem, slotId: FoodMealSlotId) => void
  onClearAllOrUndo?: () => void
  clearAllUndoAvailable?: boolean
  onClearOrUndoMealSlot?: (slotId: FoodMealSlotId, label: string) => void
  mealSlotUndoAvailable?: Partial<Record<FoodMealSlotId, boolean>>
  onApplyRecommendedItem?: (
    item: RecommendFoodCombo["items"][number],
    combo: RecommendFoodCombo,
    slotId: FoodMealSlotId
  ) => void
  onConfirmMealSlot?: (slotId: FoodMealSlotId, label: string) => void
  onUnlockMealSlot?: (slotId: FoodMealSlotId, label: string) => void
}) {
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

  useEffect(() => {
    if (totals.count === 0) return
    validateMacroCalories(totals, "오늘 식단 합계")
    for (const entry of entries) {
      validateMacroCalories(entry.nutrition, entry.name)
    }
  }, [totals, entries])

  if (totals.count === 0 && !clearAllUndoAvailable) return null

  const mealSummary = `${totals.count}개 기록 · ${FOOD_MEAL_SLOTS.length}끼`

  return (
    <div className="space-y-2 mb-3">
      <CollapsibleInlineSection
        title="식단 질 평가"
        summary={`${totals.count}개 기록 · 영양 분석`}
        sectionId="nutrition-diet-evaluation"
      >
        <NutritionQualityPanel
          totals={totals}
          targets={targets}
          entries={entries}
          onApplyRecommendedItem={onApplyRecommendedItem}
        />
      </CollapsibleInlineSection>

      <CollapsibleInlineSection
        title="아침 점심 저녁 나눠보기"
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
              onSelectEntry={onSelectLogEntry}
              onRemoveEntry={onRemoveLogEntry}
              inlineAddOpen={inlineAddSlotId === slot.id}
              onToggleInlineAdd={onToggleInlineAdd}
              onPickFoodForSlot={onPickFoodForSlot}
              searchTargets={targets}
              allLogEntries={entries}
              undoAvailable={Boolean(
                mealSlotUndoAvailable?.[slot.id as FoodMealSlotId]
              )}
              onClearOrUndo={
                onClearOrUndoMealSlot
                  ? () =>
                      onClearOrUndoMealSlot(slot.id as FoodMealSlotId, slot.label)
                  : undefined
              }
              onConfirmMealSlot={onConfirmMealSlot}
              onUnlockMealSlot={onUnlockMealSlot}
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
                onSelectEntry={onSelectLogEntry}
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
