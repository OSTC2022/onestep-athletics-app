import type { MacroTargets, MealMacroTargets } from "@/lib/user-profile"
import { buildMealSlotTargets } from "@/lib/meal-slot-targets"
import {
  getSelectedMealMacros,
  type FoodOption,
  type MacroNutrientKey,
  type MealMenuSelection,
  type MealMenuSelectionEntry,
  type MenuSelectionScope,
} from "@/lib/food-alternatives"

export const MEAL_MENU_EVENT = "meal-menu-updated"

const STORAGE_KEY = "one-step-coach-meal-menu-selection"

function getTodayDateKey(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function normalizeSelectionEntry(
  raw: unknown
): MealMenuSelectionEntry | undefined {
  if (typeof raw === "string") {
    return { optionId: raw, scope: "meal" }
  }
  if (
    raw &&
    typeof raw === "object" &&
    "optionId" in raw &&
    typeof (raw as MealMenuSelectionEntry).optionId === "string"
  ) {
    const entry = raw as MealMenuSelectionEntry
    return {
      optionId: entry.optionId,
      scope: entry.scope === "daily" ? "daily" : "meal",
    }
  }
  return undefined
}

function normalizeSelection(raw: unknown): MealMenuSelection {
  if (!raw || typeof raw !== "object") return {}
  const result: MealMenuSelection = {}
  for (const [key, value] of Object.entries(raw)) {
    const entry = normalizeSelectionEntry(value)
    if (entry) result[key as MacroNutrientKey] = entry
  }
  return result
}

function readAll(): Record<string, MealMenuSelection> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const result: Record<string, MealMenuSelection> = {}
    for (const [date, value] of Object.entries(parsed)) {
      result[date] = normalizeSelection(value)
    }
    return result
  } catch {
    return {}
  }
}

function writeAll(data: Record<string, MealMenuSelection>): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  window.dispatchEvent(new CustomEvent(MEAL_MENU_EVENT))
}

export function loadMealMenuSelection(now = new Date()): MealMenuSelection {
  return readAll()[getTodayDateKey(now)] ?? {}
}

export function saveMealMenuSelection(
  key: MacroNutrientKey,
  optionId: string | null,
  scope: MenuSelectionScope = "meal",
  now = new Date()
): MealMenuSelection {
  const date = getTodayDateKey(now)
  const all = readAll()
  const current = { ...(all[date] ?? {}) }

  if (optionId) current[key] = { optionId, scope }
  else delete current[key]

  all[date] = current
  writeAll(all)
  return current
}

export function clearMealMenuSelection(now = new Date()): void {
  const date = getTodayDateKey(now)
  const all = readAll()
  delete all[date]
  writeAll(all)
}

export interface AdjustedMealPlan {
  perMeal: MealMacroTargets
  daily: {
    calories: number
    carbsG: number
    proteinG: number
    fatG: number
    waterL: number
    sodiumMg: number
  }
  selectedOptions: Partial<
    Record<MacroNutrientKey, FoodOption & { scope: MenuSelectionScope }>
  >
  hasSelections: boolean
}

export function applyMealMenuSelection(
  targets: MacroTargets,
  selection: MealMenuSelection = loadMealMenuSelection()
): AdjustedMealPlan {
  const { perMeal: adjustedPerMeal, selectedOptions } = getSelectedMealMacros(
    targets,
    selection
  )
  const n = targets.mealsPerDay

  return {
    perMeal: adjustedPerMeal,
    daily: {
      calories: adjustedPerMeal.calories * n,
      carbsG: Math.round(adjustedPerMeal.carbsG * n * 10) / 10,
      proteinG: Math.round(adjustedPerMeal.proteinG * n * 10) / 10,
      fatG: Math.round(adjustedPerMeal.fatG * n * 10) / 10,
      waterL: Math.round(((adjustedPerMeal.waterMl * n) / 1000) * 10) / 10,
      sodiumMg: Math.round(adjustedPerMeal.sodiumMg * n),
    },
    selectedOptions,
    hasSelections: Object.keys(selectedOptions).length > 0,
  }
}

export function mergeTargetsWithSelection(
  targets: MacroTargets,
  selection: MealMenuSelection = loadMealMenuSelection()
): MacroTargets {
  const plan = applyMealMenuSelection(targets, selection)
  const daily = {
    calories: plan.daily.calories,
    carbsG: plan.daily.carbsG,
    proteinG: plan.daily.proteinG,
    fatG: plan.daily.fatG,
    sugarG: targets.sugarG,
    fiberG: targets.fiberG,
    waterL: plan.daily.waterL,
    sodiumMg: plan.daily.sodiumMg,
  }
  return {
    ...targets,
    ...daily,
    perMeal: plan.perMeal,
    perMealBySlot: buildMealSlotTargets(
      daily,
      targets.breakdown.coachingMode,
      targets.breakdown.snackCalorieMax
    ),
  }
}
