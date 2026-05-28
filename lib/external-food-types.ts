import type { FoodNutritionPer100g } from "@/lib/food-database"

/** API 응답 — 아직 로컬에 저장되지 않은 외부 검색 결과 */
export type ExternalFoodSearchResult = {
  /** 캐시에 있으면 `external-{uuid}` */
  id?: string
  name: string
  nameEn?: string
  category: string
  aliases?: string[]
  per100g: FoodNutritionPer100g
  source: "cache" | "usda" | "official"
  /** USDA 등 추정 영양정보 여부 */
  isEstimated: boolean
  externalId?: string
  servingLabel?: string
  pieceWeightG?: number
}

export type ExternalFoodCacheInput = {
  name: string
  nameEn?: string
  category?: string
  aliases?: string[]
  per100g: FoodNutritionPer100g
  source: string
  externalId?: string
  searchQuery: string
  servingLabel?: string
  pieceWeightG?: number
}
