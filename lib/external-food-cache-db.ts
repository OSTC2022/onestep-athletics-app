import type { FoodNutritionPer100g } from "@/lib/food-database"
import type {
  ExternalFoodCacheInput,
  ExternalFoodSearchResult,
} from "@/lib/external-food-types"
import { normalizeFoodSearchQuery } from "@/lib/food-search"
import { localizeExternalFoodSearchResult, localizeFoodName } from "@/lib/food-name-localize"
import { getSupabaseAdmin, getSupabaseReadClient } from "@/lib/supabase-server"

type ExternalFoodCacheRow = {
  id: string
  name: string
  name_en: string | null
  aliases: string[] | null
  category: string
  search_keys: string[] | null
  per100g: FoodNutritionPer100g
  source: string
  external_id: string | null
  serving_label: string | null
  piece_weight_g: number | null
}

function buildSearchKeys(input: {
  name: string
  nameEn?: string
  aliases?: string[]
  searchQuery?: string
}): string[] {
  const keys = new Set<string>()
  const add = (value?: string) => {
    const norm = normalizeFoodSearchQuery(value ?? "")
    if (norm.length >= 2) keys.add(norm)
  }

  add(input.name)
  add(input.nameEn)
  input.aliases?.forEach(add)
  add(input.searchQuery)

  return [...keys]
}

function rowToSearchResult(row: ExternalFoodCacheRow): ExternalFoodSearchResult {
  return localizeExternalFoodSearchResult({
    id: `external-${row.id}`,
    name: row.name,
    nameEn: row.name_en ?? undefined,
    category: row.category,
    aliases: row.aliases ?? undefined,
    per100g: row.per100g,
    source: "cache",
    isEstimated: false,
    externalId: row.external_id ?? undefined,
    servingLabel: row.serving_label ?? undefined,
    pieceWeightG: row.piece_weight_g ?? undefined,
  })
}

function scoreCacheRow(row: ExternalFoodCacheRow, normQuery: string): number {
  const name = normalizeFoodSearchQuery(row.name)
  const nameEn = normalizeFoodSearchQuery(row.name_en ?? "")
  const keys = (row.search_keys ?? []).map(normalizeFoodSearchQuery)

  if (name === normQuery || nameEn === normQuery) return 100
  if (name.startsWith(normQuery) || nameEn.startsWith(normQuery)) return 90
  if (name.includes(normQuery) || nameEn.includes(normQuery)) return 80
  if (keys.some((k) => k === normQuery)) return 75
  if (keys.some((k) => k.includes(normQuery) || normQuery.includes(k))) return 65
  if (normQuery.includes(name) && name.length >= 2) return 60
  return 0
}

export async function searchExternalFoodCache(
  query: string,
  limit = 10
): Promise<ExternalFoodSearchResult[]> {
  const supabase = getSupabaseReadClient()
  if (!supabase) return []

  const normQuery = normalizeFoodSearchQuery(query)
  if (normQuery.length < 2) return []

  const pattern = `%${query.trim().replace(/[%_\\]/g, "")}%`
  const { data, error } = await supabase
    .from("external_food_cache")
    .select("*")
    .or(`name.ilike.${pattern},name_en.ilike.${pattern}`)
    .order("last_used_at", { ascending: false })
    .limit(Math.max(limit * 3, 20))

  if (error || !data?.length) return []

  return (data as ExternalFoodCacheRow[])
    .map((row) => ({ row, score: scoreCacheRow(row, normQuery) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.row.name.localeCompare(b.row.name))
    .slice(0, limit)
    .map((x) => rowToSearchResult(x.row))
}

export async function upsertExternalFoodCache(
  input: ExternalFoodCacheInput
): Promise<ExternalFoodSearchResult | null> {
  const supabase = getSupabaseAdmin()
  if (!supabase) return null

  const { name, nameEn } = localizeFoodName(input.name, input.nameEn)
  const aliases = new Set(input.aliases ?? [])
  aliases.add(input.name.trim())
  if (nameEn) aliases.add(nameEn)

  const localizedInput: ExternalFoodCacheInput = {
    ...input,
    name,
    nameEn,
    aliases: [...aliases],
  }

  const searchKeys = buildSearchKeys({
    name: localizedInput.name,
    nameEn: localizedInput.nameEn,
    aliases: localizedInput.aliases,
    searchQuery: input.searchQuery,
  })

  const now = new Date().toISOString()
  const payload = {
    name: localizedInput.name.trim(),
    name_en: localizedInput.nameEn?.trim() || null,
    aliases: localizedInput.aliases?.map((a) => a.trim()).filter(Boolean) ?? [],
    category: input.category?.trim() || "식사",
    search_keys: searchKeys,
    per100g: input.per100g,
    source: input.source,
    external_id: input.externalId ?? null,
    serving_label: input.servingLabel ?? "1회",
    piece_weight_g: input.pieceWeightG ?? 100,
    updated_at: now,
    last_used_at: now,
  }

  if (input.externalId) {
    const { data: existing } = await supabase
      .from("external_food_cache")
      .select("id")
      .eq("external_id", input.externalId)
      .maybeSingle()

    if (existing?.id) {
      const { data, error } = await supabase
        .from("external_food_cache")
        .update(payload)
        .eq("id", existing.id)
        .select("*")
        .single()

      if (error || !data) return null
      return rowToSearchResult(data as ExternalFoodCacheRow)
    }
  }

  const { data, error } = await supabase
    .from("external_food_cache")
    .insert({ ...payload, created_at: now })
    .select("*")
    .single()

  if (error || !data) return null
  return rowToSearchResult(data as ExternalFoodCacheRow)
}

export async function touchExternalFoodCache(id: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  if (!supabase) return

  const uuid = id.startsWith("external-") ? id.slice("external-".length) : id
  await supabase
    .from("external_food_cache")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", uuid)
}
