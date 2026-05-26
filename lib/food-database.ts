/** 검색 가능한 음식 DB (100g 기준 영양성분) */

import { FOOD_DATABASE_ITEMS } from "@/lib/food-database-data"
import { getFiberPer100g, toLoggedNutrition } from "@/lib/food-nutrition-utils"
import { getFiberSearchResults } from "@/lib/food-recommendations"
import type { DietWarningContext } from "@/lib/food-nutrition-utils"
import { loadCustomFoods, searchCustomFoods } from "@/lib/custom-food-store"

export { getFiberPer100g } from "@/lib/food-nutrition-utils"

export interface FoodNutritionPer100g {
  calories: number
  carbsG: number
  proteinG: number
  fatG: number
  sodiumMg: number
  sugarG?: number
  fiberG?: number
  saturatedFatG?: number
}

export interface FoodDatabaseItem {
  id: string
  name: string
  category: string
  aliases?: string[]
  /** 1회 제공량 참고 (g) */
  servingGrams?: number
  servingLabel?: string
  per100g: FoodNutritionPer100g
  /** 정제 탄수화물 정도 (다이어트 평가용) */
  refinedCarbLevel?: RefinedCarbLevel
  /** 사용자가 직접 추가한 음식 */
  isCustom?: boolean
}

export type RefinedCarbLevel = "low" | "medium" | "high"

const REFINED_CARB_LEVELS: Record<string, RefinedCarbLevel> = {
  // high — 김밥, 흰쌀, 빵, 면, 떡, 시리얼, 과자류
  "rice-white": "high",
  gimbap: "high",
  "triangle-kimbap": "high",
  "kimbap-tuna": "high",
  "sushi-roll": "high",
  "bread-white": "high",
  baguette: "high",
  croissant: "high",
  pasta: "high",
  udon: "high",
  ramen: "high",
  "instant-noodle": "high",
  "rice-noodle": "high",
  "glass-noodle": "high",
  "rice-cake": "high",
  cereal: "high",
  "corn-flakes": "high",
  cookie: "high",
  chocolate: "high",
  "ice-cream": "high",
  hotteok: "high",
  yakgwa: "high",
  bungeoppang: "high",
  tteokbokki: "high",
  "ramyeon-street": "high",
  jjajangmyeon: "high",
  jjamppong: "high",
  naengmyeon: "high",
  sandwich: "high",
  pizza: "high",
  burger: "high",
  dosirak: "high",
  "curry-rice": "high",
  "tuna-rice": "high",
  "chicken-rice": "high",
  "protein-bar": "high",
  // medium — 현미, 고구마, 귀리, 통밀
  "rice-brown": "medium",
  "rice-mixed": "medium",
  "rice-barley": "medium",
  "oatmeal-cooked": "medium",
  "oatmeal-dry": "medium",
  "sweet-potato": "medium",
  "bread-whole": "medium",
  congee: "medium",
  bibimbap: "medium",
  soba: "medium",
  potato: "medium",
  "potato-boiled": "medium",
  corn: "medium",
}

export function getRefinedCarbLevel(
  food: Pick<FoodDatabaseItem, "id" | "category" | "refinedCarbLevel">
): RefinedCarbLevel {
  if (food.refinedCarbLevel) return food.refinedCarbLevel
  if (REFINED_CARB_LEVELS[food.id]) return REFINED_CARB_LEVELS[food.id]
  if (food.category === "간식") return "high"
  if (food.category === "곡물" || food.category === "탄수") return "medium"
  return "low"
}

export interface FoodNutritionAtPortion {
  grams: number
  calories: number
  carbsG: number
  proteinG: number
  fatG: number
  sodiumMg: number
  sugarG: number
  fiberG: number
  waterMl: number
  saturatedFatG?: number
}

const FOODS: FoodDatabaseItem[] = FOOD_DATABASE_ITEMS

function getSearchableFoods(): FoodDatabaseItem[] {
  if (typeof window === "undefined") return FOODS
  return [...loadCustomFoods(), ...FOODS]
}

function scoreFoodMatch(
  food: FoodDatabaseItem,
  q: string,
  categoryTargets?: string[]
): number {
  const name = food.name.toLowerCase()
  const aliases = (food.aliases ?? []).map((a) => a.toLowerCase())
  let score = 0

  if (name === q) score = 100
  else if (name.startsWith(q)) score = 80
  else if (name.includes(q)) score = 60
  else if (aliases.some((a) => a === q)) score = 70
  else if (aliases.some((a) => a.startsWith(q))) score = 55
  else if (aliases.some((a) => a.includes(q))) score = 45
  else if (categoryTargets?.includes(food.category)) score = 35
  else if (food.category.includes(q)) score = 20

  if (food.isCustom && score > 0) score += 5

  return score
}

/** 검색어 → 해당 카테고리 음식 일괄 매칭 */
const CATEGORY_SEARCH: Record<string, string[]> = {
  과일: ["과일"],
  곡물: ["곡물"],
  잡곡: ["곡물"],
  탄수: ["탄수", "곡물"],
  채소: ["채소"],
  야채: ["채소"],
  단백: ["단백"],
  단백질: ["단백"],
  지방: ["지방"],
  견과: ["지방"],
  반찬: ["반찬"],
  식사: ["식사"],
  간식: ["간식"],
  음료: ["음료"],
  밥: ["곡물"],
  면: ["탄수"],
  빵: ["탄수"],
}

const FIBER_SEARCH_TERMS = ["식이섬유", "섬유질", "dietary fiber", "fiber"] as const

export function isFiberSearchQuery(query: string): boolean {
  const q = query.trim().toLowerCase().replace(/\s/g, "")
  return FIBER_SEARCH_TERMS.some(
    (term) => q === term || q.includes(term) || term.includes(q)
  )
}

export function searchFoodDatabase(
  query: string,
  limit = 24,
  warningContext?: DietWarningContext
): FoodDatabaseItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  if (isFiberSearchQuery(q)) {
    return getFiberSearchResults(limit, warningContext)
  }

  const categoryTargets = CATEGORY_SEARCH[q]
  const searchableFoods = getSearchableFoods()

  const scored = searchableFoods
    .map((food) => ({
      food,
      score: scoreFoodMatch(food, q, categoryTargets),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.food.name.localeCompare(b.food.name, "ko"))

  return scored.slice(0, limit).map((x) => x.food)
}

export function getCustomFoodSearchResults(query: string, limit = 24): FoodDatabaseItem[] {
  return searchCustomFoods(query, limit)
}

export function getFoodById(id: string): FoodDatabaseItem | undefined {
  if (typeof window !== "undefined" && id.startsWith("custom-")) {
    return loadCustomFoods().find((f) => f.id === id) ?? FOODS.find((f) => f.id === id)
  }
  return FOODS.find((f) => f.id === id) ?? loadCustomFoods().find((f) => f.id === id)
}

export function getAllCustomFoods(): FoodDatabaseItem[] {
  return loadCustomFoods()
}

export function getFoodDatabaseCount(): number {
  return FOODS.length
}

export function nutritionAtGrams(
  food: FoodDatabaseItem,
  grams: number
): FoodNutritionAtPortion {
  const logged = toLoggedNutrition(food, grams)
  const f = grams / 100
  return {
    grams,
    ...logged,
    saturatedFatG: food.per100g.saturatedFatG
      ? Math.round(food.per100g.saturatedFatG * f * 10) / 10
      : undefined,
    waterMl: Math.round(grams * 0.7),
  }
}

export function formatServingHint(food: FoodDatabaseItem, grams: number): string {
  if (food.servingGrams) {
    const servings = Math.round((grams / food.servingGrams) * 10) / 10
    if (servings >= 0.3) {
      return `${grams}g · 약 ${servings}개`
    }
  }
  return `${grams}g`
}

/** servingLabel에서 단위 추출 — 전 음식 1개 기준 */
export function getServingUnit(_food: FoodDatabaseItem): string {
  return "개"
}

export function gramsForServingCount(
  food: FoodDatabaseItem,
  count: number,
  fallbackUnitGrams: number
): number {
  const unitGrams = food.servingGrams ?? fallbackUnitGrams
  return Math.round(unitGrams * count)
}

export function formatServingCountDisplay(
  food: FoodDatabaseItem,
  count: number,
  fallbackUnitGrams: number
): string {
  const grams = gramsForServingCount(food, count, fallbackUnitGrams)
  if (food.servingGrams) {
    const countStr = Number.isInteger(count) ? String(count) : String(count)
    return `${countStr}개 (${grams}g)`
  }
  return `${grams}g`
}

export function initialServingCount(
  food: FoodDatabaseItem,
  recommendedGrams: number
): number {
  const unitGrams = food.servingGrams ?? recommendedGrams
  if (unitGrams <= 0) return 1
  const raw = recommendedGrams / unitGrams
  return Math.max(0.5, Math.round(raw * 2) / 2)
}
