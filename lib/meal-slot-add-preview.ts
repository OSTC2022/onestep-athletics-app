import type { LoggedFoodEntry } from "@/lib/daily-food-log"
import type { DietCoachingMode } from "@/lib/diet-coaching"
import type { RecommendFoodItem } from "@/lib/food-recommendation-types"
import type { LoggedNutrition } from "@/lib/food-nutrition-utils"
import type {
  MacroEvalStatus,
  MealOverallStatus,
} from "@/lib/meal-evaluation"
import { evaluateMealNutrition } from "@/lib/nutrition-evaluation"
import {
  FOOD_MEAL_SLOT_IDS,
  NEXT_MEAL_SLOT,
  type FoodMealSlotId,
  type MealSlotMacroTargets,
} from "@/lib/meal-slot-targets"
import { MEAL_SLOT_LABELS } from "@/lib/saved-meal-menu-store"

export type MealSlotAddPreview = {
  slotId: FoodMealSlotId
  label: string
  currentCalories: number
  projectedCalories: number
  targetCalories: number
  calorieRatio: number
  overallStatus: MealOverallStatus
  calorieStatus: MacroEvalStatus
  calorieStatusLabel: string
  nutrientWarning?: string
}

function emptyNutrition(): LoggedNutrition & { count: number } {
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

function sumMealNutrition(entries: LoggedFoodEntry[]): LoggedNutrition & { count: number } {
  const bucket = emptyNutrition()
  for (const entry of entries) {
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
  return bucket
}

function itemToAddNutrition(item: RecommendFoodItem): LoggedNutrition {
  return {
    calories: item.calories,
    carbsG: item.carbs,
    proteinG: item.protein,
    fatG: item.fat,
    sodiumMg: item.sodium,
    sugarG: item.sugar,
    fiberG: item.fiber,
  }
}

function mergeNutrition(
  base: LoggedNutrition & { count: number },
  add: LoggedNutrition
): LoggedNutrition & { count: number } {
  return {
    calories: Math.round(base.calories + add.calories),
    carbsG: Math.round((base.carbsG + add.carbsG) * 10) / 10,
    proteinG: Math.round((base.proteinG + add.proteinG) * 10) / 10,
    fatG: Math.round((base.fatG + add.fatG) * 10) / 10,
    sodiumMg: Math.round(base.sodiumMg + add.sodiumMg),
    sugarG: Math.round((base.sugarG + add.sugarG) * 10) / 10,
    fiberG: Math.round((base.fiberG + add.fiberG) * 10) / 10,
    count: base.count + 1,
  }
}

function nutrientWarningFromEvaluation(
  macros: ReturnType<typeof evaluateMealNutrition>["macros"]
): string | undefined {
  const warnings = ["sodium", "sugar", "fat", "carbs"]
    .map((key) => macros.find((macro) => macro.key === key))
    .filter(
      (macro) =>
        macro &&
        (macro.status === "high" || macro.status === "very-high") &&
        macro.key !== "calories"
    )
    .map((macro) => macro!.statusLabel)

  if (warnings.length === 0) return undefined
  return warnings.slice(0, 2).join(" · ")
}

/** 선택 음식을 각 끼니에 추가했을 때 칼로리·영양 상태 미리보기 */
export function buildMealSlotAddPreviews({
  entries,
  addItem,
  addFoodId,
  slotTargets,
  coachingMode,
}: {
  entries: LoggedFoodEntry[]
  addItem: RecommendFoodItem
  addFoodId: string
  slotTargets: Record<FoodMealSlotId, MealSlotMacroTargets>
  coachingMode?: DietCoachingMode | null
}): MealSlotAddPreview[] {
  const addNutrition = itemToAddNutrition(addItem)

  return FOOD_MEAL_SLOT_IDS.map((slotId) => {
    const slotEntries = entries.filter((entry) => entry.mealSlotId === slotId)
    const current = sumMealNutrition(slotEntries)
    const entriesWithoutDuplicate = slotEntries.filter(
      (entry) => entry.foodId !== addFoodId
    )
    const base = sumMealNutrition(entriesWithoutDuplicate)
    const projectedNutrition = mergeNutrition(base, addNutrition)

    const evaluation = evaluateMealNutrition(
      projectedNutrition,
      entriesWithoutDuplicate,
      {
        mealSlot: slotId,
        slotLabel: MEAL_SLOT_LABELS[slotId],
        defaultTargets: slotTargets[slotId],
        coachingMode: coachingMode ?? null,
        nextMealLabel: NEXT_MEAL_SLOT[slotId]?.label,
      }
    )

    const calories = evaluation.macros.find((macro) => macro.key === "calories")

    return {
      slotId,
      label: MEAL_SLOT_LABELS[slotId],
      currentCalories: current.calories,
      projectedCalories: projectedNutrition.calories,
      targetCalories: slotTargets[slotId].calories,
      calorieRatio: calories?.ratio ?? 0,
      overallStatus: evaluation.overallStatus,
      calorieStatus: calories?.status ?? "none",
      calorieStatusLabel: calories?.statusLabel ?? "—",
      nutrientWarning: nutrientWarningFromEvaluation(evaluation.macros),
    }
  })
}

export function mealSlotPreviewButtonClass(calorieStatus: MacroEvalStatus): string {
  switch (calorieStatus) {
    case "ok":
    case "good":
      return "border-accent/40 bg-accent/10 text-accent hover:bg-accent/15"
    case "high":
      return "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/15"
    case "very-high":
      return "border-red-500/45 bg-red-500/10 text-red-400 hover:bg-red-500/15"
    case "low":
      return "border-border/50 bg-secondary/20 text-muted-foreground hover:bg-secondary/30"
    default:
      return "border-border/50 bg-secondary/20 text-muted-foreground hover:bg-secondary/30"
  }
}
