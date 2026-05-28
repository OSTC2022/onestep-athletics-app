import type { FoodNutritionPer100g } from "@/lib/food-database"
import type { ExternalFoodSearchResult } from "@/lib/external-food-types"
import { normalizeFoodSearchQuery } from "@/lib/korean-food-search-normalizer"
import { getSupabaseReadClient } from "@/lib/supabase-server"

type FoodItemRow = {
  id: string
  official_code: string
  name_ko: string
  normalized_name: string
  name_en: string | null
  category: string
  representative_name: string | null
  serving_label: string | null
  piece_weight_g: number | null
  per100g: FoodNutritionPer100g
}

type FoodAliasRow = {
  food_item_id: string
  alias: string
  normalized_alias: string
}

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, "")
}

function ilikePattern(value: string): string {
  const escaped = escapeIlike(value)
  return escaped ? `%${escaped}%` : ""
}

function rowToSearchResult(row: FoodItemRow): ExternalFoodSearchResult {
  const pieceWeightG = row.piece_weight_g ?? 100
  return {
    id: row.id,
    name: row.name_ko,
    nameEn: row.name_en ?? undefined,
    category: row.category,
    per100g: row.per100g,
    source: "official",
    isEstimated: false,
    servingLabel: row.serving_label ?? "1회",
    pieceWeightG,
  }
}

function scoreFoodItem(
  row: FoodItemRow,
  normQuery: string,
  aliasNorms: string[]
): number {
  const nameNorm = normalizeFoodSearchQuery(row.name_ko)
  const normalized = row.normalized_name
  const categoryNorm = normalizeFoodSearchQuery(row.category)
  const repNorm = row.representative_name
    ? normalizeFoodSearchQuery(row.representative_name)
    : ""

  if (normalized === normQuery || nameNorm === normQuery) return 100
  if (normalized.startsWith(normQuery) || nameNorm.startsWith(normQuery)) return 92
  if (normalized.includes(normQuery) || nameNorm.includes(normQuery)) return 85

  for (const aliasNorm of aliasNorms) {
    if (aliasNorm === normQuery) return 88
    if (aliasNorm.startsWith(normQuery) || aliasNorm.includes(normQuery)) return 78
  }

  if (categoryNorm.includes(normQuery) || normQuery.includes(categoryNorm)) return 55
  if (repNorm && (repNorm === normQuery || repNorm.includes(normQuery))) return 70
  if (normQuery.includes(normalized) && normalized.length >= 2) return 62
  if (normQuery.includes(nameNorm) && nameNorm.length >= 2) return 58

  return 0
}

/** Supabase food_items + food_aliases 공식 DB 검색 (서버 전용) */
export async function searchFoodItems(
  query: string,
  limit = 20
): Promise<ExternalFoodSearchResult[]> {
  const supabase = getSupabaseReadClient()
  if (!supabase) return []

  const trimmed = query.trim()
  const normQuery = normalizeFoodSearchQuery(trimmed)
  if (normQuery.length < 2) return []

  const rawPattern = ilikePattern(trimmed)
  const normPattern = ilikePattern(normQuery)
  if (!rawPattern && !normPattern) return []

  const itemFilters = [
    rawPattern ? `name_ko.ilike.${rawPattern}` : null,
    normPattern ? `normalized_name.ilike.${normPattern}` : null,
    rawPattern ? `category.ilike.${rawPattern}` : null,
    normPattern && normPattern !== rawPattern
      ? `category.ilike.${normPattern}`
      : null,
  ]
    .filter(Boolean)
    .join(",")

  const aliasFilters = [
    rawPattern ? `alias.ilike.${rawPattern}` : null,
    normPattern ? `normalized_alias.ilike.${normPattern}` : null,
  ]
    .filter(Boolean)
    .join(",")

  const candidateLimit = Math.max(limit * 4, 60)

  const [itemsRes, aliasesRes] = await Promise.all([
    itemFilters
      ? supabase
          .from("food_items")
          .select(
            "id, official_code, name_ko, normalized_name, name_en, category, representative_name, serving_label, piece_weight_g, per100g"
          )
          .or(itemFilters)
          .limit(candidateLimit)
      : Promise.resolve({ data: [] as FoodItemRow[], error: null }),
    aliasFilters
      ? supabase
          .from("food_aliases")
          .select("food_item_id, alias, normalized_alias")
          .or(aliasFilters)
          .limit(candidateLimit)
      : Promise.resolve({ data: [] as FoodAliasRow[], error: null }),
  ])

  if (itemsRes.error) {
    console.error("[searchFoodItems] food_items", itemsRes.error.message)
  }
  if (aliasesRes.error) {
    console.error("[searchFoodItems] food_aliases", aliasesRes.error.message)
  }

  const rowsById = new Map<string, FoodItemRow>()
  for (const row of (itemsRes.data ?? []) as FoodItemRow[]) {
    rowsById.set(row.id, row)
  }

  const aliasNormsByFoodId = new Map<string, string[]>()
  const aliasFoodIds = new Set<string>()

  for (const alias of (aliasesRes.data ?? []) as FoodAliasRow[]) {
    aliasFoodIds.add(alias.food_item_id)
    const list = aliasNormsByFoodId.get(alias.food_item_id) ?? []
    list.push(alias.normalized_alias)
    aliasNormsByFoodId.set(alias.food_item_id, list)
  }

  const missingIds = [...aliasFoodIds].filter((id) => !rowsById.has(id))
  if (missingIds.length > 0) {
    const { data, error } = await supabase
      .from("food_items")
      .select(
        "id, official_code, name_ko, normalized_name, name_en, category, representative_name, serving_label, piece_weight_g, per100g"
      )
      .in("id", missingIds.slice(0, candidateLimit))

    if (error) {
      console.error("[searchFoodItems] food_items by alias ids", error.message)
    } else {
      for (const row of (data ?? []) as FoodItemRow[]) {
        rowsById.set(row.id, row)
      }
    }
  }

  return [...rowsById.values()]
    .map((row) => ({
      row,
      score: scoreFoodItem(
        row,
        normQuery,
        aliasNormsByFoodId.get(row.id) ?? []
      ),
    }))
    .filter((x) => x.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.row.name_ko.localeCompare(b.row.name_ko, "ko")
    )
    .slice(0, limit)
    .map((x) => rowToSearchResult(x.row))
}
