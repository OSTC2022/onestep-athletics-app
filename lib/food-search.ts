import type { FoodDatabaseItem } from "@/lib/food-database"
import { FOOD_ALIAS_PATCHES } from "@/lib/food-search-aliases"
import {
  encyclopediaToLegacyResponse,
  searchFoodEncyclopedia,
  type FoodEncyclopediaSearchResponse,
  type FoodSearchResultItem,
  type FoodSearchResultSource,
} from "@/lib/food-search-encyclopedia"
export type {
  FoodEncyclopediaSearchResponse,
  FoodSearchResultItem,
  FoodSearchResultSource,
} from "@/lib/food-search-encyclopedia"
export { normalizeFoodSearchQuery } from "@/lib/korean-food-search-normalizer"
import { normalizeFoodSearchQuery } from "@/lib/korean-food-search-normalizer"

export type FoodSearchMatchKind =
  | "exact"
  | "name-includes-query"
  | "query-includes-name"
  | "alias"
  | "category"

export interface ScoredFoodMatch {
  food: FoodDatabaseItem
  score: number
  kind: FoodSearchMatchKind
}

export interface FoodSearchResponse {
  items: FoodDatabaseItem[]
  similarItems: FoodDatabaseItem[]
  fallbackExternalQueries: string[]
  exact: FoodSearchResultItem[]
  similar: FoodSearchResultItem[]
}

/** @deprecated 내부 호환용 */
function normalizeFoodSearchQueryLegacy(query: string): string {
  return normalizeFoodSearchQuery(query)
}

function getAliasList(food: FoodDatabaseItem): string[] {
  const patched = FOOD_ALIAS_PATCHES[food.id] ?? []
  const merged = [...(food.aliases ?? []), ...patched]
  return [...new Set(merged)]
}

function getSearchTerms(food: FoodDatabaseItem): {
  name: string
  nameEn: string
  aliases: string[]
  category: string
} {
  const norm = normalizeFoodSearchQueryLegacy
  return {
    name: norm(food.name),
    nameEn: food.nameEn ? norm(food.nameEn) : "",
    aliases: getAliasList(food).map(norm).filter(Boolean),
    category: norm(food.category),
  }
}

function scoreReverseContainment(
  q: string,
  term: string,
  baseScore: number
): number {
  if (term.length < 2 || !q.includes(term)) return 0
  return baseScore + Math.min(term.length, 12)
}

export function scoreFoodSearchMatch(
  food: FoodDatabaseItem,
  rawQuery: string,
  categoryTargets?: string[]
): ScoredFoodMatch | null {
  const q = normalizeFoodSearchQueryLegacy(rawQuery)
  if (!q) return null

  const { name, nameEn, aliases, category } = getSearchTerms(food)
  const terms = [name, nameEn, ...aliases].filter(Boolean)

  if (terms.some((t) => t === q) || category === q) {
    return { food, score: 100, kind: "exact" }
  }

  if (name.startsWith(q)) {
    return { food, score: 92, kind: "name-includes-query" }
  }
  if (nameEn && nameEn.startsWith(q)) {
    return { food, score: 90, kind: "name-includes-query" }
  }
  if (name.includes(q)) {
    return { food, score: 80, kind: "name-includes-query" }
  }
  if (nameEn && nameEn.includes(q)) {
    return { food, score: 78, kind: "name-includes-query" }
  }

  const reverseName = scoreReverseContainment(q, name, 70)
  if (reverseName > 0) {
    return { food, score: reverseName, kind: "query-includes-name" }
  }
  const reverseNameEn = nameEn ? scoreReverseContainment(q, nameEn, 68) : 0
  if (reverseNameEn > 0) {
    return { food, score: reverseNameEn, kind: "query-includes-name" }
  }

  for (const alias of aliases) {
    if (alias === q) {
      return { food, score: 75, kind: "alias" }
    }
    if (alias.startsWith(q)) {
      return { food, score: 62, kind: "alias" }
    }
    if (alias.includes(q)) {
      return { food, score: 55, kind: "alias" }
    }
    const reverseAlias = scoreReverseContainment(q, alias, 58)
    if (reverseAlias > 0) {
      return { food, score: reverseAlias, kind: "alias" }
    }
  }

  if (categoryTargets?.includes(food.category)) {
    return { food, score: 35, kind: "category" }
  }
  if (category.includes(q)) {
    return { food, score: 25, kind: "category" }
  }

  return null
}

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

function sortMatches(a: ScoredFoodMatch, b: ScoredFoodMatch): number {
  if (b.score !== a.score) return b.score - a.score
  const kindOrder: FoodSearchMatchKind[] = [
    "exact",
    "name-includes-query",
    "query-includes-name",
    "alias",
    "category",
  ]
  const ak = kindOrder.indexOf(a.kind)
  const bk = kindOrder.indexOf(b.kind)
  if (ak !== bk) return ak - bk
  if (a.food.isCustom && !b.food.isCustom) return -1
  if (!a.food.isCustom && b.food.isCustom) return 1
  return a.food.name.localeCompare(b.food.name, "ko")
}

export function rankFoodSearchMatches(
  foods: FoodDatabaseItem[],
  query: string
): ScoredFoodMatch[] {
  const q = normalizeFoodSearchQueryLegacy(query)
  if (!q) return []

  const categoryTargets = CATEGORY_SEARCH[q]
  const seen = new Set<string>()

  return foods
    .map((food) => scoreFoodSearchMatch(food, q, categoryTargets))
    .filter((match): match is ScoredFoodMatch => match !== null)
    .filter((match) => {
      if (seen.has(match.food.id)) return false
      seen.add(match.food.id)
      return true
    })
    .sort(sortMatches)
}

export function rankSimilarFoodMatches(
  foods: FoodDatabaseItem[],
  query: string,
  limit = 6
): ScoredFoodMatch[] {
  const q = normalizeFoodSearchQueryLegacy(query)
  if (!q) return []

  return foods
    .map((food) => {
      const { name, nameEn, aliases } = getSearchTerms(food)
      let score = 0
      let kind: FoodSearchMatchKind = "query-includes-name"

      score = Math.max(
        scoreReverseContainment(q, name, 60),
        nameEn ? scoreReverseContainment(q, nameEn, 58) : 0
      )
      for (const alias of aliases) {
        const aliasScore = scoreReverseContainment(q, alias, 55)
        if (aliasScore > score) {
          score = aliasScore
          kind = "alias"
        }
      }

      if (score <= 0) return null
      return { food, score, kind } as ScoredFoodMatch
    })
    .filter((match): match is ScoredFoodMatch => match !== null)
    .sort(sortMatches)
    .slice(0, limit)
}

export function searchFoodDatabaseRanked(
  foods: FoodDatabaseItem[],
  query: string,
  limit = 40
): FoodSearchResponse {
  const encyclopedia = searchFoodEncyclopedia(foods, query, limit)
  return encyclopediaToLegacyResponse(encyclopedia)
}
