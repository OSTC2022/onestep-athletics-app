import { getTodayDateKey } from "@/lib/daily-date"
import type { FoodMealSlotId } from "@/lib/meal-slot-targets"
import type { LoggedFoodEntry } from "@/lib/daily-food-log"

const STORAGE_KEY = "one-step-coach-confirmed-meal-slots"
export const CONFIRMED_MEAL_SLOTS_EVENT = "confirmed-meal-slots-updated"

type ConfirmedStore = Record<string, FoodMealSlotId[]>

function readStore(): ConfirmedStore {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as ConfirmedStore
  } catch {
    return {}
  }
}

function writeStore(store: ConfirmedStore): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  window.dispatchEvent(new CustomEvent(CONFIRMED_MEAL_SLOTS_EVENT))
}

export function getConfirmedMealSlots(now = new Date()): Set<FoodMealSlotId> {
  const date = getTodayDateKey(now)
  return new Set(readStore()[date] ?? [])
}

export function isMealSlotConfirmed(
  slotId: FoodMealSlotId,
  now = new Date()
): boolean {
  return getConfirmedMealSlots(now).has(slotId)
}

export function confirmMealSlot(slotId: FoodMealSlotId, now = new Date()): void {
  const date = getTodayDateKey(now)
  const store = readStore()
  const current = new Set(store[date] ?? [])
  current.add(slotId)
  store[date] = Array.from(current)
  writeStore(store)
}

export function unconfirmMealSlot(slotId: FoodMealSlotId, now = new Date()): void {
  const date = getTodayDateKey(now)
  const store = readStore()
  const next = (store[date] ?? []).filter((id) => id !== slotId)
  if (next.length === 0) {
    delete store[date]
  } else {
    store[date] = next
  }
  writeStore(store)
}

export function clearConfirmedMealSlots(now = new Date()): void {
  const date = getTodayDateKey(now)
  const store = readStore()
  if (!store[date]) return
  delete store[date]
  writeStore(store)
}

/** 결정된 끼니 + 끼니 미지정 항목만 상단 영양 집계에 포함 */
export function filterConfirmedFoodLogEntries(
  entries: LoggedFoodEntry[],
  now = new Date()
): LoggedFoodEntry[] {
  const confirmed = getConfirmedMealSlots(now)
  return entries.filter((entry) => {
    if (!entry.mealSlotId) return true
    return confirmed.has(entry.mealSlotId as FoodMealSlotId)
  })
}
