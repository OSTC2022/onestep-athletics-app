import type { FoodDatabaseItem, FoodNutritionPer100g } from "@/lib/food-database"

function resolvePieceWeightG(food: FoodDatabaseItem): number | undefined {
  return food.pieceWeightG ?? food.servingGrams
}

export const FOOD_NUTRITION_OVERRIDE_EVENT = "food-nutrition-override-updated"

const STORAGE_KEY = "one-step-coach-food-nutrition-overrides"

/** 제품별 차이가 커서 사용자가 직접 수정할 수 있는 기본 음식 */
export const NUTRITION_OVERRIDE_FOOD_IDS = [
  "chicken-breast",
  "egg",
  "egg-white",
  "greek-yogurt",
] as const

export type NutritionOverrideFoodId = (typeof NUTRITION_OVERRIDE_FOOD_IDS)[number]

export type FoodNutritionOverride = {
  pieceWeightG?: number
  servingLabel?: string
  per100g?: Partial<FoodNutritionPer100g>
  updatedAt: string
}

export type FoodNutritionOverrideInput = {
  pieceWeightG?: number
  servingLabel?: string
  per100g: FoodNutritionPer100g
}

function notifyChange(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(FOOD_NUTRITION_OVERRIDE_EVENT))
}

export function isNutritionOverrideEditable(
  foodId: string
): foodId is NutritionOverrideFoodId {
  return (NUTRITION_OVERRIDE_FOOD_IDS as readonly string[]).includes(foodId)
}

export function loadFoodNutritionOverrides(): Record<string, FoodNutritionOverride> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, FoodNutritionOverride>
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

export function getFoodNutritionOverride(
  foodId: string
): FoodNutritionOverride | null {
  return loadFoodNutritionOverrides()[foodId] ?? null
}

export function saveFoodNutritionOverride(
  foodId: NutritionOverrideFoodId,
  input: FoodNutritionOverrideInput
): FoodNutritionOverride {
  const all = loadFoodNutritionOverrides()
  const saved: FoodNutritionOverride = {
    pieceWeightG:
      input.pieceWeightG != null
        ? Math.max(1, Math.round(input.pieceWeightG))
        : undefined,
    servingLabel: input.servingLabel?.trim() || undefined,
    per100g: input.per100g,
    updatedAt: new Date().toISOString(),
  }
  all[foodId] = saved
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  }
  notifyChange()
  return saved
}

export function clearFoodNutritionOverride(foodId: NutritionOverrideFoodId): void {
  const all = loadFoodNutritionOverrides()
  delete all[foodId]
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  }
  notifyChange()
}

export function hasFoodNutritionOverride(foodId: string): boolean {
  return foodId in loadFoodNutritionOverrides()
}

export function applyFoodNutritionOverride(
  food: FoodDatabaseItem
): FoodDatabaseItem {
  const override = getFoodNutritionOverride(food.id)
  if (!override) return food

  const pieceWeightG = override.pieceWeightG ?? resolvePieceWeightG(food)
  const per100g = { ...food.per100g, ...override.per100g }

  return {
    ...food,
    per100g,
    pieceWeightG,
    servingGrams: pieceWeightG,
    servingLabel: override.servingLabel ?? food.servingLabel,
  }
}
