import type { FoodDatabaseItem } from "@/lib/food-database"
import { getPieceWeightG } from "@/lib/food-database"
import type { LoggedNutrition } from "@/lib/food-nutrition-utils"

/** 단일 원재료 단백질 식품 — '개'·'g' 혼동 검사 대상 */
const SINGLE_PROTEIN_FOOD_IDS = new Set([
  "chicken-breast",
  "chicken-thigh",
  "egg",
  "egg-white",
  "egg-yolk",
  "tofu",
  "tuna-can",
  "salmon",
  "greek-yogurt",
  "protein-shake",
])

function isSingleProteinFood(food: Pick<FoodDatabaseItem, "id" | "category">): boolean {
  if (SINGLE_PROTEIN_FOOD_IDS.has(food.id)) return true
  if (food.category === "단백" && !food.id.includes("salad")) return true
  return false
}

/**
 * '개' 단위와 'g' 단위 혼동 가능성 경고.
 * 예: 닭가슴살 675g인데 단백질이 100g 이하 → 실제로는 2~3토막인데 g로 잘못 계산됐을 수 있음.
 */
export function getPortionUnitWarning(
  food: FoodDatabaseItem,
  grams: number,
  nutrition: Pick<LoggedNutrition, "proteinG">
): string | null {
  if (!isSingleProteinFood(food)) return null
  if (food.category === "식사") return null

  const per100Protein = food.per100g.proteinG
  if (per100Protein < 12 || grams < 250) return null

  const expectedProtein = (per100Protein * grams) / 100
  const actualProtein = nutrition.proteinG

  const pieceWeight = getPieceWeightG(food)
  const suspiciousByUserRule =
    grams >= 400 && actualProtein <= 100 && per100Protein >= 20
  const suspiciousByRatio =
    actualProtein < expectedProtein * 0.55 && grams >= pieceWeight * 3

  if (!suspiciousByUserRule && !suspiciousByRatio) return null

  const pieceHint = pieceWeight
    ? `1회 ≈ ${pieceWeight}g`
    : "100g 기준"

  return `「${food.name}」 ${grams}g 기준 단백질이 ${Math.round(actualProtein)}g로 예상(${Math.round(expectedProtein)}g)보다 낮습니다. '개'와 'g' 단위가 혼동됐을 수 있어요. (${pieceHint} · 100g당 단백 ${per100Protein}g)`
}
