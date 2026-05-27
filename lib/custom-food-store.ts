import type { FoodDatabaseItem, FoodNutritionPer100g } from "@/lib/food-database"

export const CUSTOM_FOOD_EVENT = "custom-food-updated"

const STORAGE_KEY = "one-step-coach-custom-foods"

export type CustomFoodItem = FoodDatabaseItem & {
  isCustom: true
  createdAt: string
  updatedAt: string
}

export type CustomFoodInput = {
  name: string
  category: string
  servingGrams?: number
  servingLabel?: string
  per100g: FoodNutritionPer100g
  aliases?: string[]
}

export const FOOD_CATEGORIES = [
  "곡물",
  "탄수",
  "과일",
  "채소",
  "단백",
  "지방",
  "반찬",
  "식사",
  "간식",
  "음료",
] as const

function notifyCustomFoodChange(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(CUSTOM_FOOD_EVENT))
}

function createCustomFoodId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `custom-${crypto.randomUUID()}`
  }
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
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

export function loadCustomFoods(): CustomFoodItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CustomFoodItem[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => item?.isCustom && item.id?.startsWith("custom-"))
  } catch {
    return []
  }
}

function saveCustomFoods(items: CustomFoodItem[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  notifyCustomFoodChange()
}

export function isCustomFoodId(id: string): boolean {
  return id.startsWith("custom-")
}

export function isCustomFood(
  food: Pick<FoodDatabaseItem, "id"> & { isCustom?: boolean }
): boolean {
  return food.isCustom === true || isCustomFoodId(food.id)
}

export function getCustomFoodById(id: string): CustomFoodItem | undefined {
  return loadCustomFoods().find((food) => food.id === id)
}

export function addCustomFood(input: CustomFoodInput): CustomFoodItem {
  const now = new Date().toISOString()
  const item: CustomFoodItem = {
    id: createCustomFoodId(),
    name: input.name.trim(),
    category: input.category.trim() || "식사",
    aliases: input.aliases?.map((a) => a.trim()).filter(Boolean),
    servingGrams: input.servingGrams ?? 100,
    pieceWeightG: input.servingGrams ?? 100,
    servingLabel: input.servingLabel?.trim() || "1회",
    per100g: normalizePer100g(input.per100g),
    isCustom: true,
    createdAt: now,
    updatedAt: now,
  }
  const items = loadCustomFoods()
  items.unshift(item)
  saveCustomFoods(items)
  return item
}

export function updateCustomFood(
  id: string,
  input: CustomFoodInput
): CustomFoodItem | null {
  const items = loadCustomFoods()
  const index = items.findIndex((food) => food.id === id)
  if (index < 0) return null

  const updated: CustomFoodItem = {
    ...items[index],
    name: input.name.trim(),
    category: input.category.trim() || "식사",
    aliases: input.aliases?.map((a) => a.trim()).filter(Boolean),
    servingGrams: input.servingGrams ?? 100,
    pieceWeightG: input.servingGrams ?? 100,
    servingLabel: input.servingLabel?.trim() || "1회",
    per100g: normalizePer100g(input.per100g),
    updatedAt: new Date().toISOString(),
  }
  items[index] = updated
  saveCustomFoods(items)
  return updated
}

export function deleteCustomFood(id: string): boolean {
  const items = loadCustomFoods()
  const next = items.filter((food) => food.id !== id)
  if (next.length === items.length) return false
  saveCustomFoods(next)
  return true
}

export function searchCustomFoods(query: string, limit = 24): CustomFoodItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const scored = loadCustomFoods().map((food) => {
    const name = food.name.toLowerCase()
    const aliases = (food.aliases ?? []).map((a) => a.toLowerCase())
    let score = 0

    if (name === q) score = 100
    else if (name.startsWith(q)) score = 80
    else if (name.includes(q)) score = 60
    else if (aliases.some((a) => a === q)) score = 70
    else if (aliases.some((a) => a.startsWith(q))) score = 55
    else if (aliases.some((a) => a.includes(q))) score = 45
    else if (food.category.includes(q)) score = 20

    return { food, score }
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.food.name.localeCompare(b.food.name, "ko"))

  return scored.slice(0, limit).map((x) => x.food)
}

export function emptyCustomFoodInput(name = ""): CustomFoodInput {
  return {
    name,
    category: "식사",
    servingGrams: 100,
    servingLabel: "1회",
    per100g: {
      calories: 0,
      carbsG: 0,
      proteinG: 0,
      fatG: 0,
      sodiumMg: 0,
      sugarG: undefined,
      fiberG: undefined,
    },
  }
}
