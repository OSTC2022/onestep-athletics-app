import type { FoodDatabaseItem } from "@/lib/food-database"
import {
  rankAllKoreanFallbackMatches,
} from "@/lib/korean-food-fallback"
import { getExternalSearchQueries } from "@/lib/korean-food-query-map"
import {
  rankFoodSearchMatches,
  rankSimilarFoodMatches,
  type FoodSearchMatchKind,
} from "@/lib/food-search"

export type FoodSearchResultSource =
  | "local"
  | "fallback"
  | "external"
  | "cache"
  | "manual"

export type FoodSearchResultItem = {
  food: FoodDatabaseItem
  source: FoodSearchResultSource
  score: number
  matchKind?: FoodSearchMatchKind | "fallback-map" | "word-decompose" | "base-suffix"
}

export type FoodEncyclopediaSearchResponse = {
  exact: FoodSearchResultItem[]
  similar: FoodSearchResultItem[]
  externalQueries: string[]
}

const EXACT_KINDS: FoodSearchMatchKind[] = [
  "exact",
  "name-includes-query",
  "alias",
]

function isExactMatch(score: number, kind: FoodSearchMatchKind): boolean {
  if (kind === "exact") return true
  if (kind === "alias" && score >= 75) return true
  if (kind === "name-includes-query" && score >= 78) return true
  return score >= 85
}

function toItem(
  food: FoodDatabaseItem,
  source: FoodSearchResultSource,
  score: number,
  matchKind?: FoodSearchResultItem["matchKind"]
): FoodSearchResultItem {
  return { food, source, score, matchKind }
}

/** 음식 백과사전형 통합 검색 (로컬 + fallback, 외부 API 쿼리만 반환) */
export function searchFoodEncyclopedia(
  foods: FoodDatabaseItem[],
  query: string,
  limit = 40
): FoodEncyclopediaSearchResponse {
  const ranked = rankFoodSearchMatches(foods, query)
  const externalQueries = getExternalSearchQueries(query)

  const exact: FoodSearchResultItem[] = []
  const similar: FoodSearchResultItem[] = []
  const seenExact = new Set<string>()
  const seenSimilar = new Set<string>()

  for (const match of ranked.slice(0, limit)) {
    if (isExactMatch(match.score, match.kind)) {
      if (seenExact.has(match.food.id)) continue
      seenExact.add(match.food.id)
      exact.push(toItem(match.food, "local", match.score, match.kind))
    }
  }

  for (const match of ranked.slice(0, limit)) {
    if (seenExact.has(match.food.id)) continue
    if (seenSimilar.has(match.food.id)) continue
    if (match.score < 25) continue
    seenSimilar.add(match.food.id)
    similar.push(toItem(match.food, "local", match.score, match.kind))
  }

  if (exact.length === 0) {
    for (const match of rankSimilarFoodMatches(foods, query, 6)) {
      if (seenExact.has(match.food.id) || seenSimilar.has(match.food.id)) continue
      seenSimilar.add(match.food.id)
      similar.push(toItem(match.food, "local", match.score, match.kind))
    }
  }

  for (const food of rankAllKoreanFallbackMatches(foods, query, 10)) {
    if (seenExact.has(food.id) || seenSimilar.has(food.id)) continue
    seenSimilar.add(food.id)
    similar.push(toItem(food, "fallback", 65, "fallback-map"))
  }

  return {
    exact: exact.slice(0, limit),
    similar: similar.slice(0, 10),
    externalQueries,
  }
}

/** 하위 호환 — items / similarItems 형태 */
export function encyclopediaToLegacyResponse(
  response: FoodEncyclopediaSearchResponse
) {
  return {
    items: response.exact.map((r) => r.food),
    similarItems: response.similar.map((r) => r.food),
    fallbackExternalQueries: response.externalQueries,
    exact: response.exact,
    similar: response.similar,
  }
}
