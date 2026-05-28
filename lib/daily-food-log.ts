import type { PortionGoalScope } from "@/lib/food-portion-calculator"
import {
  formatFullFoodPortion,
  formatPortionAmount,
  getFoodById,
  getPieceWeightG,
  gramsForServingCount,
} from "@/lib/food-database"
import { toLoggedNutrition, type LoggedNutrition } from "@/lib/food-nutrition-utils"
import type { FoodMealSlotId } from "@/lib/meal-slot-targets"
import type { MealSlotId } from "@/lib/nutrition"
import { NUTRITION_EVENT } from "@/lib/nutrition"
import { getTodayDateKey } from "@/lib/daily-date"

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
  recommendationContext?: import("@/lib/recommendation-meal-targets").MealRecommendationContext
}

export interface DailyFoodLog {
  date: string
  entries: LoggedFoodEntry[]
  /** 오늘 섭취 수분 (L) */
  waterConsumedL?: number
  updatedAt: string
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

  const pieceWeight = getPieceWeightG(food)
  const inferredCount =
    pieceWeight && raw.grams
      ? Math.max(0.5, Math.round((raw.grams / pieceWeight) * 2) / 2)
      : 1
  const servingCount =
    typeof raw.servingCount === "number" && raw.servingCount > 0
      ? raw.servingCount
      : inferredCount

  const unitGrams =
    pieceWeight ??
    (servingCount > 0 && raw.grams ? raw.grams / servingCount : 100)
  const grams =
    typeof raw.grams === "number" && raw.grams > 0
      ? raw.grams
      : gramsForServingCount(food, servingCount, unitGrams)
  const computed = toLoggedNutrition(food, grams)

  const nutrition: LoggedNutrition = {
    calories: computed.calories,
    carbsG: computed.carbsG,
    proteinG: computed.proteinG,
    fatG: computed.fatG,
    sodiumMg: computed.sodiumMg,
    sugarG: computed.sugarG ?? 0,
    fiberG: computed.fiberG ?? 0,
  }

  return {
    ...raw,
    grams,
    servingCount,
    displayAmount:
      raw.displayAmount ||
      formatFullFoodPortion(food, servingCount, unitGrams),
    nutrition,
  }
}

function normalizeWaterL(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return 0
  return Math.round(value * 10) / 10
}

function normalizeDailyLog(log: DailyFoodLog): DailyFoodLog {
  const entries = log.entries
    .map((entry) => normalizeEntry(entry))
    .filter((entry): entry is LoggedFoodEntry => entry !== null)

  return {
    ...log,
    entries,
    waterConsumedL: normalizeWaterL(log.waterConsumedL),
  }
}

export function loadTodayFoodLog(now = new Date()): DailyFoodLog {
  const date = getTodayDateKey(now)
  const existing = readAll()[date]
  if (!existing) {
    return {
      date,
      entries: [],
      waterConsumedL: 0,
      updatedAt: new Date().toISOString(),
    }
  }
  return normalizeDailyLog({ ...existing, date })
}

/** 영양 DB·사용자 수정 반영 후 오늘 기록 재계산 */
export function refreshTodayFoodLogNutrition(now = new Date()): DailyFoodLog {
  const log = loadTodayFoodLog(now)
  const all = readAll()
  all[log.date] = { ...log, updatedAt: now.toISOString() }
  writeAll(all)
  return log
}

export function addFoodLogEntry(
  entry: Omit<LoggedFoodEntry, "id" | "appliedAt">,
  now = new Date()
): DailyFoodLog {
  return addFoodLogEntries([entry], now)
}

export type MealFoodLogSource = {
  slotId: FoodMealSlotId
  label: string
  items: Array<{
    foodId: string
    name: string
    displayAmount: string
    servings: number
    grams: number
    nutrition: LoggedNutrition
  }>
}

export function mealToFoodLogEntries(
  meal: MealFoodLogSource
): Omit<LoggedFoodEntry, "id" | "appliedAt">[] {
  return meal.items.map((item) => ({
    foodId: item.foodId,
    name: item.name,
    grams: item.grams,
    displayAmount: item.displayAmount,
    servingCount: item.servings,
    scope: "meal",
    scopeLabel: meal.label,
    mealSlotId: meal.slotId,
    nutrition: item.nutrition,
  }))
}

/** 같은 끼니 슬롯 기록을 교체한 뒤 새 항목을 추가합니다. */
export function replaceMealSlotFoodLogEntries(
  mealSlotId: MealSlotId,
  entries: Omit<LoggedFoodEntry, "id" | "appliedAt">[],
  now = new Date()
): DailyFoodLog {
  const date = getTodayDateKey(now)
  const all = readAll()
  const current = all[date] ?? loadTodayFoodLog(now)
  const appliedAt = now.toISOString()
  const kept = current.entries.filter((e) => e.mealSlotId !== mealSlotId)

  const next: DailyFoodLog = {
    ...current,
    date,
    entries: [
      ...entries.map((entry) => ({
        ...entry,
        id: generateId(),
        appliedAt,
      })),
      ...kept,
    ],
    updatedAt: appliedAt,
  }

  all[date] = next
  writeAll(all)
  return next
}

/** 이전 추천 식단 기록을 제거한 뒤 새 추천 식단을 적용합니다. */
export function replaceRecommendedMealEntries(
  entries: Omit<LoggedFoodEntry, "id" | "appliedAt">[],
  now = new Date()
): DailyFoodLog {
  const date = getTodayDateKey(now)
  const all = readAll()
  const current = all[date] ?? loadTodayFoodLog(now)
  const appliedAt = now.toISOString()
  const kept = current.entries.filter(
    (e) => !e.recommendationContext?.isRecommendedMeal
  )

  const next: DailyFoodLog = {
    ...current,
    date,
    entries: [
      ...entries.map((entry) => ({
        ...entry,
        id: generateId(),
        appliedAt,
      })),
      ...kept,
    ],
    updatedAt: appliedAt,
  }

  all[date] = next
  writeAll(all)
  return next
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
    ...current,
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

/** 추천 식단이면 같은 comboId 항목을 함께 제거합니다. */
export function removeFoodLogEntryOrCombo(
  entryId: string,
  now = new Date()
): DailyFoodLog {
  const date = getTodayDateKey(now)
  const all = readAll()
  const current = all[date] ?? loadTodayFoodLog(now)
  const entry = current.entries.find((e) => e.id === entryId)
  if (!entry) return current

  const comboId = entry.recommendationContext?.comboId
  const next: DailyFoodLog = {
    ...current,
    entries: current.entries.filter((e) => {
      if (e.id === entryId) return false
      if (comboId && e.recommendationContext?.comboId === comboId) return false
      return true
    }),
    updatedAt: now.toISOString(),
  }

  all[date] = next
  writeAll(all)
  return next
}

export function clearTodayFoodLog(now = new Date()): DailyFoodLog {
  const date = getTodayDateKey(now)
  const all = readAll()
  const current = all[date] ?? loadTodayFoodLog(now)
  const next: DailyFoodLog = {
    ...current,
    date,
    entries: [],
    updatedAt: now.toISOString(),
  }
  all[date] = next
  writeAll(all)
  return next
}

export function clearMealSlotFoodLogEntries(
  mealSlotId: MealSlotId,
  now = new Date()
): DailyFoodLog {
  const date = getTodayDateKey(now)
  const all = readAll()
  const current = all[date] ?? loadTodayFoodLog(now)
  const next: DailyFoodLog = {
    ...current,
    entries: current.entries.filter((e) => e.mealSlotId !== mealSlotId),
    updatedAt: now.toISOString(),
  }
  all[date] = next
  writeAll(all)
  return next
}

export function restoreTodayFoodLog(
  log: DailyFoodLog,
  now = new Date()
): DailyFoodLog {
  const date = getTodayDateKey(now)
  const all = readAll()
  const next = normalizeDailyLog({
    ...log,
    date,
    updatedAt: now.toISOString(),
  })
  all[date] = next
  writeAll(all)
  return next
}

export function setTodayWaterConsumedL(
  waterL: number,
  now = new Date()
): DailyFoodLog {
  const normalized = normalizeWaterL(waterL)
  const date = getTodayDateKey(now)
  const all = readAll()
  const current = all[date] ?? loadTodayFoodLog(now)
  const next: DailyFoodLog = {
    ...current,
    waterConsumedL: normalized,
    updatedAt: now.toISOString(),
  }
  all[date] = next
  writeAll(all)
  return next
}

export function addTodayWaterConsumedL(
  deltaL: number,
  now = new Date()
): DailyFoodLog {
  const log = loadTodayFoodLog(now)
  return setTodayWaterConsumedL((log.waterConsumedL ?? 0) + deltaL, now)
}

export function getTodayWaterConsumedL(now = new Date()): number {
  return loadTodayFoodLog(now).waterConsumedL ?? 0
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
    getPieceWeightG(food) ??
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
            displayAmount: formatFullFoodPortion(food, nextCount, unitGrams),
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
