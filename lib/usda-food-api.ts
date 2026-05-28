import type { FoodNutritionPer100g } from "@/lib/food-database"
import type { ExternalFoodSearchResult } from "@/lib/external-food-types"
import { localizeFoodName } from "@/lib/food-name-localize"

/** @server-only — FOOD_DATA_CENTRAL_API_KEY는 API route에서만 import하세요. */
const USDA_BASE = "https://api.nal.usda.gov/fdc/v1"

type UsdaNutrient = {
  nutrientId?: number
  nutrientNumber?: string
  value?: number
}

type UsdaFood = {
  fdcId: number
  description: string
  dataType?: string
  foodCategory?: string
  foodNutrients?: UsdaNutrient[]
}

function nutrientValue(
  nutrients: UsdaNutrient[],
  ...ids: number[]
): number | undefined {
  for (const id of ids) {
    const hit = nutrients.find((n) => n.nutrientId === id)
    if (hit?.value != null && Number.isFinite(hit.value)) return hit.value
  }
  return undefined
}

function mapUsdaPer100g(nutrients: UsdaNutrient[]): FoodNutritionPer100g {
  const calories =
    nutrientValue(nutrients, 1008, 2047, 2048) ?? 0
  const proteinG = nutrientValue(nutrients, 1003) ?? 0
  const fatG = nutrientValue(nutrients, 1004) ?? 0
  const carbsG = nutrientValue(nutrients, 1005) ?? 0
  const sodiumMg = nutrientValue(nutrients, 1093) ?? 0
  const fiberG = nutrientValue(nutrients, 1079)
  const sugarG = nutrientValue(nutrients, 2000, 1063)

  return {
    calories: Math.max(0, Math.round(calories)),
    proteinG: Math.max(0, Math.round(proteinG * 10) / 10),
    fatG: Math.max(0, Math.round(fatG * 10) / 10),
    carbsG: Math.max(0, Math.round(carbsG * 10) / 10),
    sodiumMg: Math.max(0, Math.round(sodiumMg)),
    fiberG:
      fiberG != null ? Math.max(0, Math.round(fiberG * 10) / 10) : undefined,
    sugarG:
      sugarG != null ? Math.max(0, Math.round(sugarG * 10) / 10) : undefined,
  }
}

function inferCategory(dataType?: string, foodCategory?: string): string {
  const raw = `${foodCategory ?? ""} ${dataType ?? ""}`.toLowerCase()
  if (raw.includes("beverage") || raw.includes("drink")) return "음료"
  if (raw.includes("fruit")) return "과일"
  if (raw.includes("vegetable")) return "채소"
  if (raw.includes("snack") || raw.includes("dessert")) return "간식"
  if (raw.includes("grain") || raw.includes("cereal")) return "곡물"
  if (raw.includes("meat") || raw.includes("poultry") || raw.includes("fish")) {
    return "단백"
  }
  return "식사"
}

function mapUsdaFood(food: UsdaFood): ExternalFoodSearchResult | null {
  const nutrients = food.foodNutrients ?? []
  const per100g = mapUsdaPer100g(nutrients)
  if (per100g.calories <= 0 && per100g.proteinG <= 0 && per100g.carbsG <= 0) {
    return null
  }

  const description = food.description.trim()
  const { name, nameEn } = localizeFoodName(description)

  return {
    name,
    nameEn,
    category: inferCategory(food.dataType, food.foodCategory),
    per100g,
    source: "usda",
    isEstimated: true,
    externalId: String(food.fdcId),
    aliases: nameEn && nameEn !== name ? [description, nameEn] : [description],
  }
}

export function isUsdaConfigured(): boolean {
  return Boolean(process.env.FOOD_DATA_CENTRAL_API_KEY?.trim())
}

export async function searchUsdaFoods(
  query: string,
  limit = 8
): Promise<ExternalFoodSearchResult[]> {
  const apiKey = process.env.FOOD_DATA_CENTRAL_API_KEY?.trim()
  if (!apiKey) return []

  const url = new URL(`${USDA_BASE}/foods/search`)
  url.searchParams.set("api_key", apiKey)
  url.searchParams.set("query", query)
  url.searchParams.set("pageSize", String(limit))
  for (const dataType of ["Survey (FNDDS)", "SR Legacy", "Foundation", "Branded"]) {
    url.searchParams.append("dataType", dataType)
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    throw new Error(`USDA API error: ${res.status}`)
  }

  const data = (await res.json()) as { foods?: UsdaFood[] }
  const mapped = (data.foods ?? [])
    .map(mapUsdaFood)
    .filter((item): item is ExternalFoodSearchResult => item != null)

  const seen = new Set<string>()
  return mapped.filter((item) => {
    const key = item.externalId ?? item.name.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
