import type { FoodDatabaseItem } from "@/lib/food-database"
import {
  extractFoodTokensFromQuery,
  normalizeFoodSearchQuery,
} from "@/lib/korean-food-search-normalizer"
import {
  getKoreanFoodQueryMapEntry,
  KOREAN_FOOD_BASE_SUFFIXES,
  KOREAN_FOOD_SEARCH_TOKENS,
} from "@/lib/korean-food-query-map"
import { FOOD_ALIAS_PATCHES } from "@/lib/food-search-aliases"

function getAliasList(food: FoodDatabaseItem): string[] {
  const patched = FOOD_ALIAS_PATCHES[food.id] ?? []
  return [...new Set([...(food.aliases ?? []), ...patched])]
}

function scoreTokenMatch(food: FoodDatabaseItem, token: string): number {
  const t = normalizeFoodSearchQuery(token)
  if (!t) return 0
  const name = normalizeFoodSearchQuery(food.name)
  const nameEn = food.nameEn ? normalizeFoodSearchQuery(food.nameEn) : ""
  if (name === t || nameEn === t) return 90
  if (name.startsWith(t) || nameEn.startsWith(t)) return 80
  if (name.includes(t) || nameEn.includes(t)) return 70
  if (getAliasList(food).some((a) => normalizeFoodSearchQuery(a) === t)) return 75
  if (getAliasList(food).some((a) => normalizeFoodSearchQuery(a).includes(t))) return 60
  if (t.length >= 2 && (t.includes(name) || t.includes(nameEn))) return 55
  return 0
}

function foodMatchesTarget(food: FoodDatabaseItem, target: string): boolean {
  const t = normalizeFoodSearchQuery(target)
  const name = normalizeFoodSearchQuery(food.name)
  if (name === t) return true
  if (food.nameEn && normalizeFoodSearchQuery(food.nameEn) === t) return true
  return (food.aliases ?? []).some(
    (alias) => normalizeFoodSearchQuery(alias) === t
  )
}

/** query map targets → DB 음식 */
export function rankQueryMapFallbackMatches(
  foods: FoodDatabaseItem[],
  rawQuery: string,
  limit = 8
): FoodDatabaseItem[] {
  const entry = getKoreanFoodQueryMapEntry(rawQuery)
  if (!entry) return []

  const results: FoodDatabaseItem[] = []
  const seen = new Set<string>()

  for (const target of entry.targets) {
    const matches = foods.filter((food) => foodMatchesTarget(food, target))
    matches.sort(
      (a, b) =>
        a.name.length - b.name.length ||
        a.name.localeCompare(b.name, "ko")
    )
    for (const food of matches) {
      if (seen.has(food.id)) continue
      seen.add(food.id)
      results.push(food)
    }
  }

  return results.slice(0, limit)
}

function isCanonicalBaseName(foodName: string, baseNorm: string): boolean {
  const name = normalizeFoodSearchQuery(foodName)
  if (name === baseNorm) return true
  if (name.startsWith(baseNorm) && name.length <= baseNorm.length + 6) {
    return true
  }
  return false
}

export function extractKoreanFoodBaseTerms(rawQuery: string): string[] {
  const q = normalizeFoodSearchQuery(rawQuery)
  if (q.length < 2) return []

  const bases = new Set<string>()
  const entry = getKoreanFoodQueryMapEntry(rawQuery)
  entry?.targets.forEach((t) => {
    const nt = normalizeFoodSearchQuery(t)
    if (nt !== q) bases.add(nt)
  })

  for (const suffix of KOREAN_FOOD_BASE_SUFFIXES) {
    const ns = normalizeFoodSearchQuery(suffix)
    if (ns.length >= 2 && q.includes(ns) && q !== ns) {
      bases.add(ns)
    }
  }

  return [...bases].sort((a, b) => b.length - a.length)
}

export function findFoodsForKoreanBase(
  foods: FoodDatabaseItem[],
  baseTerm: string
): FoodDatabaseItem[] {
  const baseNorm = normalizeFoodSearchQuery(baseTerm)
  if (!baseNorm) return []

  return foods
    .filter((food) => isCanonicalBaseName(food.name, baseNorm))
    .sort((a, b) => {
      const aName = normalizeFoodSearchQuery(a.name)
      const bName = normalizeFoodSearchQuery(b.name)
      const aExact = aName === baseNorm ? 0 : 1
      const bExact = bName === baseNorm ? 0 : 1
      if (aExact !== bExact) return aExact - bExact
      return aName.length - bName.length || a.name.localeCompare(b.name, "ko")
    })
}

/** 접미사 기본형 fallback */
export function rankKoreanBaseFallbackMatches(
  foods: FoodDatabaseItem[],
  rawQuery: string,
  limit = 8
): FoodDatabaseItem[] {
  const q = normalizeFoodSearchQuery(rawQuery)
  const baseTerms = extractKoreanFoodBaseTerms(rawQuery)
  if (baseTerms.length === 0) return []

  const results: FoodDatabaseItem[] = []
  const seen = new Set<string>()

  for (const base of baseTerms) {
    if (base === q) continue
    for (const food of findFoodsForKoreanBase(foods, base)) {
      if (seen.has(food.id)) continue
      seen.add(food.id)
      results.push(food)
    }
  }

  return results.slice(0, limit)
}

/** 검색어 단어 분해 fallback — 닭가슴살샐러드 → 닭가슴살 + 샐러드 */
export function rankWordDecompositionFallbackMatches(
  foods: FoodDatabaseItem[],
  rawQuery: string,
  limit = 8
): FoodDatabaseItem[] {
  const entry = getKoreanFoodQueryMapEntry(rawQuery)
  const tokens =
    entry?.tokens ??
    extractFoodTokensFromQuery(rawQuery, KOREAN_FOOD_SEARCH_TOKENS)

  if (tokens.length < 2) return []

  const results: FoodDatabaseItem[] = []
  const seen = new Set<string>()

  for (const token of tokens) {
    const scored = foods
      .map((food) => ({ food, score: scoreTokenMatch(food, token) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.food.name.localeCompare(b.food.name, "ko"))
      .slice(0, 3)

    for (const { food } of scored) {
      if (seen.has(food.id)) continue
      seen.add(food.id)
      results.push(food)
    }
  }

  return results.slice(0, limit)
}

/** 모든 fallback 소스 통합 */
export function rankAllKoreanFallbackMatches(
  foods: FoodDatabaseItem[],
  rawQuery: string,
  limit = 10
): FoodDatabaseItem[] {
  const seen = new Set<string>()
  const results: FoodDatabaseItem[] = []

  const append = (items: FoodDatabaseItem[]) => {
    for (const food of items) {
      if (seen.has(food.id)) continue
      seen.add(food.id)
      results.push(food)
    }
  }

  append(rankQueryMapFallbackMatches(foods, rawQuery, limit))
  append(rankWordDecompositionFallbackMatches(foods, rawQuery, limit))
  append(rankKoreanBaseFallbackMatches(foods, rawQuery, limit))

  return results.slice(0, limit)
}
