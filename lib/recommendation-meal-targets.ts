import type { FoodMealSlotId } from "@/lib/meal-slot-targets"
import type { MealSlotMacroTargets } from "@/lib/meal-slot-targets"
import type {
  MealTiming,
  NutritionGoal,
  TrainingStatus,
} from "@/lib/food-recommendation-strategy"
import type { RecommendFoodCombo } from "@/lib/food-recommendation-types"

export type IntendedMealSlot =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack"
  | "preWorkout"
  | "postWorkout"
  | "recoveryMeal"
  | "lightDinner"

export type MacroMinMax = { min?: number; max?: number }

export type MealTargetRange = {
  calories: { min: number; max: number }
  protein: { min: number; max?: number }
  carbs: { min?: number; max?: number }
  fat: { min?: number; max: number }
  sodium?: { max: number }
  fiber?: { min?: number }
  sugar?: { max?: number }
}

export type MealRecommendationContext = {
  comboId: string
  title: string
  purpose: string
  intendedMealSlot: IntendedMealSlot
  applyMealSlotId: FoodMealSlotId
  evaluationCriteriaLabel: string
  evaluationBadgeLabel: string
  targetRange: MealTargetRange
  goalMode?: string
  isRecommendedMeal: true
}

const INTENDED_SLOT_LABELS: Record<IntendedMealSlot, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
  preWorkout: "운동 전",
  postWorkout: "운동 후",
  recoveryMeal: "회복 식사",
  lightDinner: "저녁 가벼운 식사",
}

export function labelForIntendedMealSlot(slot: IntendedMealSlot): string {
  return INTENDED_SLOT_LABELS[slot] ?? slot
}

export function mealTimingToApplySlot(mealTiming: MealTiming): FoodMealSlotId {
  switch (mealTiming) {
    case "breakfast":
      return "breakfast"
    case "lunch":
      return "lunch"
    case "dinner":
    case "late_night_prevention":
      return "dinner"
    case "snack":
    case "convenience":
    case "pre_workout":
      return "snack"
    case "post_workout":
      return "dinner"
    default:
      return "lunch"
  }
}

export function resolveIntendedMealSlot(
  templateId: string,
  mealTiming: MealTiming,
  trainingStatus: TrainingStatus
): IntendedMealSlot {
  if (mealTiming === "snack" || mealTiming === "convenience") return "snack"
  if (mealTiming === "pre_workout") return "preWorkout"
  if (
    mealTiming === "post_workout" ||
    trainingStatus === "recovering" ||
    trainingStatus === "long_lsd"
  ) {
    return templateId === "post_workout" || templateId === "gap_fill"
      ? "recoveryMeal"
      : "postWorkout"
  }
  if (mealTiming === "late_night_prevention" || templateId === "light_dinner") {
    return "lightDinner"
  }
  if (mealTiming === "breakfast") return "breakfast"
  if (mealTiming === "lunch") return "lunch"
  if (mealTiming === "dinner") return "dinner"

  if (templateId === "pre_run_energy") return "preWorkout"
  if (templateId === "post_workout") return "postWorkout"
  if (templateId === "light_dinner") return "lightDinner"
  if (templateId === "convenience" || templateId === "snack_light") return "snack"

  return mealTimingToApplySlot(mealTiming) as IntendedMealSlot
}

export function intendedSlotToApplySlot(
  intended: IntendedMealSlot,
  mealTiming: MealTiming
): FoodMealSlotId {
  switch (intended) {
    case "breakfast":
      return "breakfast"
    case "lunch":
      return "lunch"
    case "dinner":
    case "lightDinner":
      return "dinner"
    case "snack":
    case "preWorkout":
      return "snack"
    case "postWorkout":
    case "recoveryMeal":
      return mealTiming === "lunch" ? "lunch" : "dinner"
    default:
      return "lunch"
  }
}

export function evaluationCriteriaForTemplate(
  templateId: string,
  goal: NutritionGoal
): { label: string; badge: string; purpose: string } {
  switch (templateId) {
    case "post_workout":
      return {
        label: "회복식 기준",
        badge: "운동 후 회복식 기준",
        purpose: "운동 후 회복",
      }
    case "pre_run_energy":
      return {
        label: "운동 전 에너지 기준",
        badge: "러닝 전 탄수화물 기준",
        purpose: "러닝 전 에너지 보충",
      }
    case "snack_light":
      return {
        label: "간식 기준",
        badge: "간식 기준",
        purpose: "가벼운 간식",
      }
    case "fat_loss_realistic":
    case "light_dinner":
      return {
        label: "감량식 기준",
        badge: "감량식 기준",
        purpose: "감량·체지방 관리",
      }
    case "high_protein_low_fat":
      return {
        label: "고단백식 기준",
        badge: "고단백식 기준",
        purpose: "고단백 저지방",
      }
    default:
      if (goal === "fat_loss_priority" || goal === "aggressive_diet") {
        return {
          label: "감량식 기준",
          badge: "감량식 기준",
          purpose: "감량 우선",
        }
      }
      return {
        label: "추천 식단 기준",
        badge: "추천 식단 적용됨",
        purpose: "맞춤 영양 전략",
      }
  }
}

export function buildTargetRangeForCombo(
  templateId: string,
  intended: IntendedMealSlot,
  total: RecommendFoodCombo["total"],
  calorieGap: number,
  goal: NutritionGoal
): MealTargetRange {
  const cal = total.calories
  const slack = intended === "snack" ? 0.15 : intended === "postWorkout" || intended === "recoveryMeal" ? 0.2 : 0.12

  let minCal = Math.round(cal * (1 - slack))
  let maxCal = Math.round(cal * (1 + slack))

  if (intended === "snack") {
    minCal = Math.max(80, Math.min(minCal, 180))
    maxCal = Math.min(300, Math.max(maxCal, minCal + 40))
  } else if (intended === "preWorkout") {
    maxCal = Math.min(350, maxCal)
    minCal = Math.min(minCal, maxCal - 80)
  } else if (intended === "postWorkout" || intended === "recoveryMeal") {
    minCal = Math.max(450, minCal)
    maxCal = Math.max(maxCal, Math.min(900, minCal + 250))
    if (calorieGap > 0 && calorieGap < 600) {
      maxCal = Math.min(maxCal, Math.max(cal + 80, calorieGap + cal))
    }
  } else if (intended === "lightDinner") {
    maxCal = Math.min(650, maxCal)
  } else {
    minCal = Math.max(350, Math.min(minCal, 500))
    maxCal = Math.min(850, Math.max(maxCal, minCal + 150))
    if (calorieGap > 0 && calorieGap < 500 && templateId !== "post_workout") {
      maxCal = Math.min(maxCal, cal + Math.round(calorieGap * 0.6) + 50)
    }
  }

  const proteinMin = Math.max(
    intended === "snack" ? 5 : 20,
    Math.round(total.protein * 0.85)
  )
  const proteinMax =
    intended === "postWorkout" || intended === "recoveryMeal"
      ? undefined
      : Math.round(total.protein * 1.35)

  return {
    calories: { min: minCal, max: maxCal },
    protein: { min: proteinMin, max: proteinMax },
    carbs: {
      min:
        intended === "postWorkout" || intended === "recoveryMeal"
          ? Math.round(total.carbs * 0.8)
          : undefined,
      max: Math.round(total.carbs * 1.25 + (intended === "snack" ? 10 : 25)),
    },
    fat: {
      min: intended === "snack" ? 0 : 5,
      max: Math.round(total.fat * 1.2 + (intended === "snack" ? 5 : 12)),
    },
    sodium: { max: Math.round(total.sodium * 1.15 + (intended === "snack" ? 200 : 350)) },
    fiber: { min: intended === "snack" ? 1 : Math.round(total.fiber * 0.7) },
    sugar: { max: Math.round((total.carbs * 0.35 + 8) * 10) / 10 },
  }
}

export function targetRangeToMacroTargets(range: MealTargetRange): MealSlotMacroTargets {
  const midCal = Math.round((range.calories.min + range.calories.max) / 2)
  const midProtein = range.protein.max
    ? Math.round((range.protein.min + range.protein.max) / 2)
    : Math.round(range.protein.min * 1.1)
  const midCarbs = range.carbs?.max
    ? Math.round(((range.carbs.min ?? 0) + range.carbs.max) / 2)
    : 0
  const midFat = Math.round(((range.fat.min ?? 0) + range.fat.max) / 2)

  return {
    calories: midCal,
    proteinG: midProtein,
    carbsG: midCarbs,
    fatG: midFat,
    sodiumMg: range.sodium?.max ?? 800,
    sugarG: range.sugar?.max ?? 25,
    fiberG: range.fiber?.min ?? 3,
    waterMl: 0,
  }
}

export function buildRecommendationContext(combo: RecommendFoodCombo): MealRecommendationContext {
  return {
    comboId: combo.id,
    title: combo.title,
    purpose: combo.recommendedPurpose,
    intendedMealSlot: combo.intendedMealSlot,
    applyMealSlotId: combo.applyMealSlotId,
    evaluationCriteriaLabel: combo.evaluationCriteria.label,
    evaluationBadgeLabel: combo.evaluationCriteria.badge,
    targetRange: combo.targetRange,
    goalMode: combo.goalMode,
    isRecommendedMeal: true,
  }
}

export function isMealSlotMismatch(
  combo: RecommendFoodCombo,
  applySlot: FoodMealSlotId
): boolean {
  if (combo.applyMealSlotId === applySlot) return false
  if (combo.intendedMealSlot === "snack" && applySlot !== "snack") return true
  if (
    (combo.intendedMealSlot === "postWorkout" ||
      combo.intendedMealSlot === "recoveryMeal" ||
      combo.intendedMealSlot === "dinner" ||
      combo.intendedMealSlot === "lightDinner") &&
    applySlot === "snack"
  ) {
    return true
  }
  if (
    combo.intendedMealSlot === "preWorkout" &&
    applySlot !== "snack" &&
    combo.total.calories <= 350
  ) {
    return applySlot === "dinner" || applySlot === "breakfast"
  }
  return false
}

export function mismatchSuggestionMessage(
  combo: RecommendFoodCombo,
  applySlot: FoodMealSlotId
): string {
  const intendedLabel = labelForIntendedMealSlot(combo.intendedMealSlot)
  const applyLabel =
    applySlot === "snack"
      ? "간식"
      : applySlot === "breakfast"
        ? "아침"
        : applySlot === "lunch"
          ? "점심"
          : "저녁"
  const suggestLabel = labelForIntendedMealSlot(
    combo.intendedMealSlot === "preWorkout" || combo.intendedMealSlot === "snack"
      ? combo.intendedMealSlot
      : combo.intendedMealSlot === "postWorkout" || combo.intendedMealSlot === "recoveryMeal"
        ? "dinner"
        : combo.intendedMealSlot
  )

  if (applySlot === "snack" && combo.total.calories > 300) {
    return `이 식단(${combo.total.calories}kcal)은 간식보다는 ${suggestLabel} 식사에 더 적합합니다. ${suggestLabel}에 적용할까요?`
  }
  return `이 식단은 ${intendedLabel} 목적에 맞춰 설계되었습니다. ${applyLabel}보다 ${suggestLabel}에 적용하는 것을 권장합니다.`
}

export function deriveMealRecommendationContext(
  entries: import("@/lib/daily-food-log").LoggedFoodEntry[]
): MealRecommendationContext | null {
  const withCtx = entries.filter((e) => e.recommendationContext?.isRecommendedMeal)
  if (withCtx.length === 0) return null

  const byCombo = new Map<string, { ctx: MealRecommendationContext; kcal: number }>()
  for (const entry of withCtx) {
    const ctx = entry.recommendationContext!
    const prev = byCombo.get(ctx.comboId)
    const kcal = entry.nutrition.calories
    if (!prev || kcal > prev.kcal) {
      byCombo.set(ctx.comboId, { ctx, kcal })
    }
  }

  let best: MealRecommendationContext | null = null
  let bestKcal = 0
  let totalRecKcal = 0
  let totalKcal = entries.reduce((s, e) => s + e.nutrition.calories, 0)

  for (const entry of withCtx) {
    totalRecKcal += entry.nutrition.calories
  }

  for (const { ctx, kcal } of byCombo.values()) {
    if (kcal > bestKcal) {
      bestKcal = kcal
      best = ctx
    }
  }

  if (!best || totalKcal <= 0 || totalRecKcal / totalKcal < 0.45) return null
  return best
}

export function isSnackMealTiming(mealTiming: MealTiming): boolean {
  return mealTiming === "snack" || mealTiming === "convenience"
}

export function templateAllowedForMealTiming(
  templateId: string,
  mealTiming: MealTiming
): boolean {
  if (isSnackMealTiming(mealTiming) || mealTiming === "late_night_prevention") {
    return (
      templateId === "snack_light" ||
      templateId === "convenience" ||
      (mealTiming === "late_night_prevention" && templateId === "light_dinner")
    )
  }
  if (mealTiming === "pre_workout") {
    return templateId === "pre_run_energy" || templateId === "snack_light"
  }
  if (mealTiming === "post_workout") {
    return (
      templateId === "post_workout" ||
      templateId === "gap_fill" ||
      templateId === "optimal_meal" ||
      templateId === "high_protein_low_fat"
    )
  }
  if (templateId === "snack_light") return false
  return true
}
