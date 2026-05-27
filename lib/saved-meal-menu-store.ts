import type { FoodMealSlotId } from "@/lib/meal-slot-targets"
import type { DailyMealMenuPlan } from "@/lib/meal-menu-recommendations"

export const SAVED_MEAL_MENU_EVENT = "saved-meal-menu-updated"

const DAILY_STORAGE_KEY = "one-step-coach-saved-daily-meal-menus"
const SLOT_STORAGE_KEY = "one-step-coach-saved-meal-slots"

export type SavedMealMenuItem = {
  foodId: string
  servings: number
}

export type SavedMealSlotRecord = {
  id: string
  slotId: FoodMealSlotId
  label: string
  title: string
  items: SavedMealMenuItem[]
  name: string
  savedAt: string
}

export type SavedDailyMealMenuRecord = {
  id: string
  name: string
  headline: string
  meals: Record<
    FoodMealSlotId,
    {
      title: string
      items: SavedMealMenuItem[]
    }
  >
  savedAt: string
}

export const MEAL_SLOT_LABELS: Record<FoodMealSlotId, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function defaultDailyName(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  const h = String(now.getHours()).padStart(2, "0")
  const min = String(now.getMinutes()).padStart(2, "0")
  return `메뉴 ${y}.${m}.${d} ${h}:${min}`
}

function defaultSlotName(slotId: FoodMealSlotId, now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${MEAL_SLOT_LABELS[slotId]} ${y}.${m}.${d}`
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return
  localStorage.setItem(key, JSON.stringify(value))
  window.dispatchEvent(new CustomEvent(SAVED_MEAL_MENU_EVENT))
}

function mealToSavedItems(
  meal: DailyMealMenuPlan["meals"][number]
): SavedMealMenuItem[] {
  return meal.items.map((item) => ({
    foodId: item.foodId,
    servings: item.servings,
  }))
}

export function listSavedDailyMealMenus(): SavedDailyMealMenuRecord[] {
  const items = readJson<SavedDailyMealMenuRecord[]>(DAILY_STORAGE_KEY, [])
  return [...items].sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  )
}

export function listSavedMealSlots(
  slotId?: FoodMealSlotId
): SavedMealSlotRecord[] {
  const items = readJson<SavedMealSlotRecord[]>(SLOT_STORAGE_KEY, [])
  const filtered = slotId ? items.filter((item) => item.slotId === slotId) : items
  return [...filtered].sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  )
}

export function saveDailyMealMenuFromPlan(
  plan: DailyMealMenuPlan,
  name?: string,
  now = new Date()
): SavedDailyMealMenuRecord {
  const meals = {} as SavedDailyMealMenuRecord["meals"]
  for (const meal of plan.meals) {
    meals[meal.slotId] = {
      title: meal.title,
      items: mealToSavedItems(meal),
    }
  }

  const record: SavedDailyMealMenuRecord = {
    id: createId("daily"),
    name: name?.trim() || defaultDailyName(now),
    headline: plan.headline,
    meals,
    savedAt: now.toISOString(),
  }

  const all = listSavedDailyMealMenus()
  writeJson(DAILY_STORAGE_KEY, [record, ...all].slice(0, 30))
  return record
}

export function saveMealSlotFromPlan(
  meal: DailyMealMenuPlan["meals"][number],
  name?: string,
  now = new Date()
): SavedMealSlotRecord {
  const record: SavedMealSlotRecord = {
    id: createId("slot"),
    slotId: meal.slotId,
    label: meal.label,
    title: meal.title,
    items: mealToSavedItems(meal),
    name: name?.trim() || defaultSlotName(meal.slotId, now),
    savedAt: now.toISOString(),
  }

  const all = listSavedMealSlots()
  writeJson(SLOT_STORAGE_KEY, [record, ...all].slice(0, 40))
  return record
}

export function deleteSavedDailyMealMenu(id: string): void {
  writeJson(
    DAILY_STORAGE_KEY,
    listSavedDailyMealMenus().filter((item) => item.id !== id)
  )
}

export function deleteSavedMealSlot(id: string): void {
  writeJson(
    SLOT_STORAGE_KEY,
    listSavedMealSlots().filter((item) => item.id !== id)
  )
}

export function formatSavedMenuSummary(items: SavedMealMenuItem[]): string {
  if (items.length === 0) return "항목 없음"
  return `${items.length}개 · ${items.map((item) => item.foodId).slice(0, 2).join(", ")}${items.length > 2 ? "…" : ""}`
}
