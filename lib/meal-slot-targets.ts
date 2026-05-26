import type { MacroTargets, MealMacroTargets } from "@/lib/user-profile"
import type { DietCoachingMode } from "@/lib/diet-coaching"

export const FOOD_MEAL_SLOT_IDS = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
] as const

export type FoodMealSlotId = (typeof FOOD_MEAL_SLOT_IDS)[number]

/** 하루 칼로리 대비 식사·간식 분배 비율 */
export const MEAL_CALORIE_RATIO: Record<FoodMealSlotId, number> = {
  breakfast: 0.25,
  lunch: 0.35,
  dinner: 0.3,
  snack: 0.1,
}

export type MealSlotMacroTargets = MealMacroTargets & {
  sugarG: number
  fiberG: number
}

function scaleMacro(
  value: number,
  ratio: number,
  decimals = 1
): number {
  const scaled = value * ratio
  if (decimals === 0) return Math.round(scaled)
  return Math.round(scaled * 10 ** decimals) / 10 ** decimals
}

export function buildMealSlotTargets(
  totals: Pick<
    MacroTargets,
    | "calories"
    | "carbsG"
    | "proteinG"
    | "fatG"
    | "sugarG"
    | "fiberG"
    | "waterL"
    | "sodiumMg"
  >,
  coachingMode: DietCoachingMode | null = null,
  snackCalorieMax: number | null = null
): Record<FoodMealSlotId, MealSlotMacroTargets> {
  const result = {} as Record<FoodMealSlotId, MealSlotMacroTargets>

  for (const slot of FOOD_MEAL_SLOT_IDS) {
    const ratio = MEAL_CALORIE_RATIO[slot]
    let slotCalories = Math.round(totals.calories * ratio)

    if (slot === "snack") {
      if (snackCalorieMax != null) {
        slotCalories = Math.min(slotCalories, snackCalorieMax)
      }
      if (coachingMode === "fast_loss") {
        slotCalories = Math.min(slotCalories, snackCalorieMax ?? 180)
        slotCalories = Math.max(100, slotCalories)
      }
    }

    const calorieRatio = totals.calories > 0 ? slotCalories / totals.calories : ratio

    result[slot] = {
      calories: slotCalories,
      carbsG: scaleMacro(totals.carbsG, calorieRatio),
      proteinG: scaleMacro(totals.proteinG, calorieRatio),
      fatG: scaleMacro(totals.fatG, calorieRatio),
      waterMl: Math.round(totals.waterL * 1000 * calorieRatio),
      sodiumMg: Math.round(totals.sodiumMg * calorieRatio),
      sugarG: scaleMacro(totals.sugarG, calorieRatio),
      fiberG: scaleMacro(totals.fiberG, calorieRatio),
    }
  }

  return result
}

export const NEXT_MEAL_SLOT: Partial<
  Record<FoodMealSlotId, { id: FoodMealSlotId; label: string }>
> = {
  breakfast: { id: "lunch", label: "점심" },
  lunch: { id: "dinner", label: "저녁" },
  dinner: { id: "snack", label: "간식" },
}
