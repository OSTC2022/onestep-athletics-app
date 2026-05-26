import type { PortionGoalScope } from "@/lib/food-portion-calculator"
import {
  formatServingCountDisplay,
  getFoodById,
  gramsForServingCount,
} from "@/lib/food-database"
import { toLoggedNutrition, type LoggedNutrition } from "@/lib/food-nutrition-utils"
import type { MealSlotId } from "@/lib/nutrition"
import { NUTRITION_EVENT } from "@/lib/nutrition"

export const DAILY_FOOD_LOG_EVENT = "daily-food-log-updated"

const STORAGE_KEY = "one-step-coach-daily-food-log"

export interface LoggedFoodEntry {
  id: string
  foodId: string
  name: string
  grams: number
  displayAmount: string
  /** 1회 제공량 기준 수량 (0.5 단위) */
  servingCount: number
  scope: PortionGoalScope
  scopeLabel: string
  mealSlotId?: MealSlotId
  nutrition: LoggedNutrition
  appliedAt: string
}

export interface DailyFoodLog {
  date: string
  entries: LoggedFoodEntry[]
  updatedAt: string
}

function getTodayDateKey(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `food-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function notifyChange(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(DAILY_FOOD_LOG_EVENT))
  window.dispatchEvent(new CustomEvent(NUTRITION_EVENT))
}

function readAll(): Record<string, DailyFoodLog> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, DailyFoodLog>
  } catch {
    return {}
  }
}

function writeAll(data: Record<string, DailyFoodLog>): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  notifyChange()
}

function normalizeEntry(raw: LoggedFoodEntry): LoggedFoodEntry | null {
  const food = getFoodById(raw.foodId)
  if (!food) return null

  const inferredCount =
    food.servingGrams && raw.grams
      ? Math.max(0.5, Math.round((raw.grams / food.servingGrams) * 2) / 2)
      : 1
  const servingCount =
    typeof raw.servingCount === "number" && raw.servingCount > 0
      ? raw.servingCount
      : inferredCount

  const unitGrams =
    food.servingGrams ??
    (servingCount > 0 && raw.grams ? raw.grams / servingCount : 100)
  const grams =
    typeof raw.grams === "number" && raw.grams > 0
      ? raw.grams
      : gramsForServingCount(food, servingCount, unitGrams)
  const computed = toLoggedNutrition(food, grams)

  const nutrition: LoggedNutrition = {
    calories: Number(raw.nutrition?.calories ?? computed.calories) || 0,
    carbsG: Number(raw.nutrition?.carbsG ?? computed.carbsG) || 0,
    proteinG: Number(raw.nutrition?.proteinG ?? computed.proteinG) || 0,
    fatG: Number(raw.nutrition?.fatG ?? computed.fatG) || 0,
    sodiumMg: Number(raw.nutrition?.sodiumMg ?? computed.sodiumMg) || 0,
    sugarG: Number(raw.nutrition?.sugarG ?? computed.sugarG) || 0,
    fiberG: Number(raw.nutrition?.fiberG ?? computed.fiberG) || 0,
  }

  return {
    ...raw,
    grams,
    servingCount,
    displayAmount:
      raw.displayAmount ||
      formatServingCountDisplay(food, servingCount, unitGrams),
    nutrition,
  }
}

function normalizeDailyLog(log: DailyFoodLog): DailyFoodLog {
  const entries = log.entries
    .map((entry) => normalizeEntry(entry))
    .filter((entry): entry is LoggedFoodEntry => entry !== null)

  return { ...log, entries }
}

export function loadTodayFoodLog(now = new Date()): DailyFoodLog {
  const date = getTodayDateKey(now)
  const existing = readAll()[date]
  if (!existing) {
    return { date, entries: [], updatedAt: new Date().toISOString() }
  }
  return normalizeDailyLog({ ...existing, date })
}

export function addFoodLogEntry(
  entry: Omit<LoggedFoodEntry, "id" | "appliedAt">,
  now = new Date()
): DailyFoodLog {
  return addFoodLogEntries([entry], now)
}

export function addFoodLogEntries(
  entries: Omit<LoggedFoodEntry, "id" | "appliedAt">[],
  now = new Date()
): DailyFoodLog {
  if (entries.length === 0) {
    return loadTodayFoodLog(now)
  }

  const date = getTodayDateKey(now)
  const all = readAll()
  const current = all[date] ?? { date, entries: [], updatedAt: now.toISOString() }
  const appliedAt = now.toISOString()

  const next: DailyFoodLog = {
    date,
    entries: [
      ...entries.map((entry) => ({
        ...entry,
        id: generateId(),
        appliedAt,
      })),
      ...current.entries,
    ],
    updatedAt: appliedAt,
  }

  all[date] = next
  writeAll(all)
  return next
}

export function removeFoodLogEntry(id: string, now = new Date()): DailyFoodLog {
  const date = getTodayDateKey(now)
  const all = readAll()
  const current = all[date] ?? loadTodayFoodLog(now)

  const next: DailyFoodLog = {
    ...current,
    entries: current.entries.filter((e) => e.id !== id),
    updatedAt: now.toISOString(),
  }

  all[date] = next
  writeAll(all)
  return next
}

export function adjustFoodLogServingCount(
  id: string,
  delta: number,
  now = new Date()
): DailyFoodLog {
  const date = getTodayDateKey(now)
  const all = readAll()
  const current = all[date] ?? loadTodayFoodLog(now)
  const entry = current.entries.find((e) => e.id === id)
  if (!entry) return current

  const currentCount =
    typeof entry.servingCount === "number" && entry.servingCount > 0
      ? entry.servingCount
      : 1
  const nextCount = Math.round((currentCount + delta) * 2) / 2
  if (nextCount < 0.5) {
    return removeFoodLogEntry(id, now)
  }

  const food = getFoodById(entry.foodId)
  if (!food) return current

  const unitGrams =
    food.servingGrams ??
    (currentCount > 0 ? entry.grams / currentCount : entry.grams)
  const grams = gramsForServingCount(food, nextCount, unitGrams)
  const nutrition = toLoggedNutrition(food, grams)

  const next: DailyFoodLog = {
    ...current,
    entries: current.entries.map((e) =>
      e.id === id
        ? {
            ...e,
            servingCount: nextCount,
            grams,
            displayAmount: formatServingCountDisplay(food, nextCount, unitGrams),
            nutrition: {
              calories: nutrition.calories,
              carbsG: nutrition.carbsG,
              proteinG: nutrition.proteinG,
              fatG: nutrition.fatG,
              sodiumMg: nutrition.sodiumMg,
              sugarG: nutrition.sugarG,
              fiberG: nutrition.fiberG,
            },
          }
        : e
    ),
    updatedAt: now.toISOString(),
  }

  all[date] = next
  writeAll(all)
  return next
}

export function updateFoodLogMealSlot(
  id: string,
  mealSlotId: MealSlotId,
  now = new Date()
): DailyFoodLog {
  const date = getTodayDateKey(now)
  const all = readAll()
  const current = all[date] ?? loadTodayFoodLog(now)

  const next: DailyFoodLog = {
    ...current,
    entries: current.entries.map((e) =>
      e.id === id ? { ...e, mealSlotId } : e
    ),
    updatedAt: now.toISOString(),
  }

  all[date] = next
  writeAll(all)
  return next
}

export function getTodayFoodLogTotals(now = new Date()): {
  calories: number
  carbsG: number
  proteinG: number
  fatG: number
  sodiumMg: number
  count: number
} {
  const log = loadTodayFoodLog(now)
  return log.entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.nutrition.calories,
      carbsG: Math.round((acc.carbsG + e.nutrition.carbsG) * 10) / 10,
      proteinG: Math.round((acc.proteinG + e.nutrition.proteinG) * 10) / 10,
      fatG: Math.round((acc.fatG + e.nutrition.fatG) * 10) / 10,
      sodiumMg: acc.sodiumMg + e.nutrition.sodiumMg,
      count: acc.count + 1,
    }),
    { calories: 0, carbsG: 0, proteinG: 0, fatG: 0, sodiumMg: 0, count: 0 }
  )
}
