import type { LoggedNutrition } from "@/lib/food-nutrition-utils"
import type {
  MealContext,
  NutritionDeficitAnalysis,
  RecommendFoodsRequest,
} from "@/lib/food-recommendation-types"
import type { NutritionStrategySettings } from "@/lib/food-recommendation-strategy"

/** 목표·섭취량 비교 → 추천 엔진 입력 (서버·클라이언트 공용) */
export function analyzeNutritionState(
  req: RecommendFoodsRequest,
  mealContext: MealContext,
  hasTraining: boolean,
  settings: NutritionStrategySettings
): NutritionDeficitAnalysis {
  const t = req.targets
  const c = req.consumed
  const targetFiber = t.fiberG ?? 25
  const targetSodium = t.sodiumMg ?? 2000
  const targetSugar = t.sugarG ?? 50

  const calorieGap = t.calories - c.calories
  const proteinGap = t.proteinG - c.proteinG
  const carbsGap = t.carbsG - c.carbsG
  const fatGap = t.fatG - c.fatG
  const fiberGap = targetFiber - c.fiberG
  const sodiumExcess = c.sodiumMg - targetSodium
  const sugarExcess = c.sugarG - targetSugar

  const flags: string[] = []

  if (calorieGap > 120) flags.push("calorie_low")
  if (calorieGap < -200) flags.push("calorie_high")
  if (proteinGap > 15) flags.push("protein_low")
  if (carbsGap > 25) flags.push("carbs_low")
  if (carbsGap < -30) flags.push("carbs_high")
  if (fatGap < -15) flags.push("fat_high")
  if (fiberGap > 5) flags.push("fiber_low")
  if (sodiumExcess > 400) flags.push("sodium_high")
  if (sugarExcess > 15) flags.push("sugar_high")

  if (
    hasTraining &&
    (mealContext === "post_workout" ||
      settings.mealTiming === "post_workout" ||
      settings.trainingStatus === "recovering" ||
      settings.trainingStatus === "long_lsd")
  ) {
    flags.push("post_workout")
  }
  if (mealContext === "dinner" || settings.mealTiming === "late_night_prevention") {
    flags.push("light_dinner")
  }
  if (mealContext === "snack" || settings.mealTiming === "convenience") {
    flags.push("convenience")
  }
  if (mealContext === "pre_workout" || settings.mealTiming === "pre_workout") {
    flags.push("pre_workout")
  }

  return {
    calorieGap,
    proteinGap,
    carbsGap,
    fatGap,
    fiberGap,
    sodiumExcess,
    sugarExcess,
    flags,
  }
}

export function consumedFromLogged(totals: LoggedNutrition): LoggedNutrition {
  return {
    calories: totals.calories,
    carbsG: totals.carbsG,
    proteinG: totals.proteinG,
    fatG: totals.fatG,
    sodiumMg: totals.sodiumMg,
    sugarG: totals.sugarG,
    fiberG: totals.fiberG,
  }
}
