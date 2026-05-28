import type { FoodDatabaseItem, FoodNutritionPer100g } from "@/lib/food-database"
import type {
  ExternalFoodCacheInput,
  ExternalFoodSearchResult,
} from "@/lib/external-food-types"
import { localizeFoodItem } from "@/lib/food-name-localize"

export const EXTERNAL_FOOD_EVENT = "external-food-updated"

const STORAGE_KEY = "one-step-coach-external-foods"

export type ExternalFoodItem = FoodDatabaseItem & {
  isExternal: true
  externalSource?: string
  externalId?: string
  cachedAt: string
}

function notifyExternalFoodChange(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(EXTERNAL_FOOD_EVENT))
}

function normalizePer100g(per100g: FoodNutritionPer100g): FoodNutritionPer100g {
  return {
    calories: Math.max(0, Math.round(per100g.calories)),
    carbsG: Math.max(0, Math.round(per100g.carbsG * 10) / 10),
    proteinG: Math.max(0, Math.round(per100g.proteinG * 10) / 10),
    fatG: Math.max(0, Math.round(per100g.fatG * 10) / 10),
    sodiumMg: Math.max(0, Math.round(per100g.sodiumMg)),
    sugarG:
      per100g.sugarG != null
        ? Math.max(0, Math.round(per100g.sugarG * 10) / 10)
        : undefined,
    fiberG:
      per100g.fiberG != null
        ? Math.max(0, Math.round(per100g.fiberG * 10) / 10)
        : undefined,
    saturatedFatG:
      per100g.saturatedFatG != null
        ? Math.max(0, Math.round(per100g.saturatedFatG * 10) / 10)
        : undefined,
  }
}

export function loadExternalFoods(): ExternalFoodItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ExternalFoodItem[]
    if (!Array.isArray(parsed)) return []
    const filtered = parsed.filter(
      (item) =>
        item?.isExternal &&
        (item.id?.startsWith("external-") || item.id?.startsWith("mfds:"))
    )
    const items = filtered.map((item) => localizeFoodItem(item) as ExternalFoodItem)

    const migrated = items.some((item) => {
      const orig = filtered.find((entry) => entry.id === item.id)
      return orig != null && orig.name !== item.name
    })
    if (migrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    }

    return items
  } catch {
    return []
  }
}

function saveExternalFoods(items: ExternalFoodItem[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  notifyExternalFoodChange()
}

export function isExternalFoodId(id: string): boolean {
  return id.startsWith("external-") || id.startsWith("mfds:")
}

export function isExternalFood(
  food: Pick<FoodDatabaseItem, "id"> & { isExternal?: boolean }
): boolean {
  return food.isExternal === true || isExternalFoodId(food.id)
}

export function getExternalFoodById(id: string): ExternalFoodItem | undefined {
  return loadExternalFoods().find((food) => food.id === id)
}

export function searchResultToExternalFoodItem(
  result: ExternalFoodSearchResult
): ExternalFoodItem {
  const now = new Date().toISOString()
  const pieceWeightG = result.pieceWeightG ?? 100

  const base: ExternalFoodItem = {
    id: result.id ?? `external-temp-${result.externalId ?? Date.now()}`,
    name: result.name,
    nameEn: result.nameEn,
    category: result.category,
    aliases: result.aliases,
    pieceWeightG,
    servingGrams: pieceWeightG,
    servingLabel: result.servingLabel ?? "1회",
    per100g: normalizePer100g(result.per100g),
    isExternal: true,
    externalSource: result.source,
    externalId: result.externalId,
    cachedAt: now,
  }

  return localizeFoodItem(base) as ExternalFoodItem
}

export function saveExternalFoodFromSearchResult(
  result: ExternalFoodSearchResult
): ExternalFoodItem {
  const item = searchResultToExternalFoodItem(result)
  const items = loadExternalFoods()
  const index = items.findIndex((food) => food.id === item.id)
  if (index >= 0) {
    items[index] = { ...items[index], ...item, cachedAt: items[index].cachedAt }
  } else {
    items.unshift(item)
  }
  saveExternalFoods(items)
  return item
}

export function saveExternalFoodFromCacheInput(
  cached: ExternalFoodSearchResult
): ExternalFoodItem {
  return saveExternalFoodFromSearchResult(cached)
}

export type { ExternalFoodCacheInput }
