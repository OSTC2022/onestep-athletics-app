import type { DietMode } from "@/lib/user-profile"
import type { TrainingNutritionCategory } from "@/lib/user-profile"

/** 다이어트 코칭 모드 (감량 전용) */
export type DietCoachingMode = "normal_loss" | "fast_loss"

export const COACHING_DIET_MODE_OPTIONS: {
  value: DietCoachingMode
  label: string
  description: string
}[] = [
  {
    value: "normal_loss",
    label: "일반 감량",
    description: "유지칼로리 -400~500kcal · 단백질 1.6~2.2g/kg",
  },
  {
    value: "fast_loss",
    label: "강한 감량",
    description: "유지칼로리 -600~700kcal · 탄수·정제탄수·간식 엄격",
  },
]

export const PROFILE_INCOMPLETE_MESSAGE =
  "프로필 정보를 입력하면 더 정확한 목표가 설정돼요"

export type DietCoachingMacroPlan = {
  calories: number
  proteinG: number
  fatG: number
  carbsG: number
  sugarG: number
  fiberG: number
  sodiumMg: number
  proteinPerKg: number
  fatCaloriePct: number
  snackCalorieMax: number
  deficitKcal: number
}

export function resolveCoachingMode(dietMode: DietMode): DietCoachingMode | null {
  if (dietMode === "fast_loss") return "fast_loss"
  if (dietMode === "normal_loss" || dietMode === "performance_loss") {
    return "normal_loss"
  }
  return null
}

export function calculateCoachingMacroPlan(
  mode: DietCoachingMode,
  weightKg: number,
  maintenanceCalories: number,
  trainingCategory: TrainingNutritionCategory,
  minCalories: number
): DietCoachingMacroPlan {
  const deficitKcal = mode === "fast_loss" ? 650 : 450
  let calories = Math.round(maintenanceCalories - deficitKcal)

  if (trainingCategory === "high" && mode === "normal_loss") {
    calories += 100
  } else if (trainingCategory === "rest" && mode === "fast_loss") {
    calories -= 50
  }

  calories = Math.max(minCalories, calories)

  const proteinPerKg = mode === "fast_loss" ? 2.0 : 1.9
  const proteinG = Math.round(weightKg * proteinPerKg)

  const fatCaloriePct = mode === "fast_loss" ? 0.22 : 0.25
  let fatG = Math.round((calories * fatCaloriePct) / 9)
  let carbsG = Math.round((calories - proteinG * 4 - fatG * 9) / 4)

  const minCarbsG = Math.round(weightKg * (mode === "fast_loss" ? 1.5 : 2))
  if (carbsG < minCarbsG) {
    fatG = Math.max(
      Math.round(weightKg * 0.6),
      Math.round((calories - proteinG * 4 - minCarbsG * 4) / 9)
    )
    carbsG = Math.round((calories - proteinG * 4 - fatG * 9) / 4)
  }

  if (mode === "fast_loss") {
    carbsG = Math.max(minCarbsG, Math.round(carbsG * 0.88))
    if (trainingCategory === "rest") {
      carbsG = Math.max(minCarbsG, Math.round(carbsG * 0.92))
    }
  }

  const sugarG = mode === "fast_loss" ? 30 : 40
  const fiberG = 25
  const sodiumMg = mode === "fast_loss" ? 2000 : 2150
  const snackCalorieMax = mode === "fast_loss" ? 180 : Math.round(calories * 0.12)

  return {
    calories,
    proteinG,
    fatG,
    carbsG,
    sugarG,
    fiberG,
    sodiumMg,
    proteinPerKg,
    fatCaloriePct,
    snackCalorieMax,
    deficitKcal,
  }
}

export function getCoachingModeLabel(mode: DietCoachingMode): string {
  return mode === "fast_loss" ? "강한 감량 모드" : "일반 감량 모드"
}
