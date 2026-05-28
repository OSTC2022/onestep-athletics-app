import type {
  RecommendFoodsRequest,
  RecommendFoodsResponse,
} from "@/lib/food-recommendation-types"
import {
  inferDefaultStrategySettings,
  type NutritionStrategySettings,
} from "@/lib/food-recommendation-strategy"
import { SUPABASE_RECOMMENDATION_USER_MESSAGE } from "@/lib/supabase-env"

type ApiResponse = RecommendFoodsResponse & {
  error?: string
  message?: string
}

export function recommendItemToFoodDatabaseItem(
  item: import("@/lib/food-recommendation-types").RecommendFoodItem
): import("@/lib/food-database").FoodDatabaseItem {
  const factor = 100 / Math.max(item.amountG, 1)
  return {
    id: item.id,
    name: item.nameKo,
    category: item.category,
    pieceWeightG: item.amountG,
    servingGrams: item.amountG,
    servingLabel: "1회",
    per100g: {
      calories: Math.round(item.calories * factor),
      carbsG: Math.round(item.carbs * factor * 10) / 10,
      proteinG: Math.round(item.protein * factor * 10) / 10,
      fatG: Math.round(item.fat * factor * 10) / 10,
      sodiumMg: Math.round(item.sodium * factor),
      sugarG: Math.round(item.sugar * factor * 10) / 10,
      fiberG: Math.round(item.fiber * factor * 10) / 10,
    },
  }
}

export async function fetchFoodRecommendations(
  payload: RecommendFoodsRequest
): Promise<{
  data: RecommendFoodsResponse | null
  message?: string
}> {
  const res = await fetch("/api/recommend-foods", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const json = (await res.json()) as ApiResponse

  if (!res.ok) {
    const message =
      json.message ??
      (json.error === "supabase_unconfigured" || res.status === 503
        ? SUPABASE_RECOMMENDATION_USER_MESSAGE
        : undefined) ??
      (typeof json.error === "string" &&
      !json.error.includes("SUPABASE") &&
      !json.error.includes(".env")
        ? json.error
        : undefined) ??
      "현재 조건에 맞는 추천을 찾지 못했습니다. 조건을 조금 완화해서 다시 추천해볼게요."
    return {
      data: null,
      message,
    }
  }

  if (!json.recommendations?.length) {
    return {
      data: json,
      message:
        json.message ??
        "현재 조건에 맞는 추천을 찾지 못했습니다. 조건을 조금 완화해서 다시 추천해볼게요.",
    }
  }

  return { data: json }
}

const STRATEGY_PREFS_KEY = "one-step-coach-nutrition-strategy"

export function loadStrategySettings(): NutritionStrategySettings {
  if (typeof window === "undefined") return inferDefaultStrategySettings()
  try {
    const raw = localStorage.getItem(STRATEGY_PREFS_KEY)
    if (!raw) return inferDefaultStrategySettings()
    const parsed = JSON.parse(raw) as Partial<NutritionStrategySettings>
    const defaults = inferDefaultStrategySettings()
    return {
      goal: parsed.goal ?? defaults.goal,
      trainingStatus: parsed.trainingStatus ?? defaults.trainingStatus,
      mealTiming: parsed.mealTiming ?? defaults.mealTiming,
      intensity: parsed.intensity ?? defaults.intensity,
    }
  } catch {
    return inferDefaultStrategySettings()
  }
}

export function saveStrategySettings(settings: NutritionStrategySettings): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STRATEGY_PREFS_KEY, JSON.stringify(settings))
}

const RECENT_RECOMMEND_KEY = "one-step-coach-recent-recommendations"

export function loadRecentRecommendationIds(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(RECENT_RECOMMEND_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed.slice(0, 40) : []
  } catch {
    return []
  }
}

export function saveRecentRecommendationIds(ids: string[]): void {
  if (typeof window === "undefined") return
  const merged = [...new Set([...ids, ...loadRecentRecommendationIds()])].slice(
    0,
    40
  )
  localStorage.setItem(RECENT_RECOMMEND_KEY, JSON.stringify(merged))
}

export function loadRecentRecommendedFoodIds(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(`${RECENT_RECOMMEND_KEY}-foods`)
    if (!raw) return []
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed.slice(0, 60) : []
  } catch {
    return []
  }
}

export function saveRecentRecommendedFoodIds(ids: string[]): void {
  if (typeof window === "undefined") return
  const merged = [...new Set([...ids, ...loadRecentRecommendedFoodIds()])].slice(
    0,
    60
  )
  localStorage.setItem(`${RECENT_RECOMMEND_KEY}-foods`, JSON.stringify(merged))
}
