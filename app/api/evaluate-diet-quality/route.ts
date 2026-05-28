import { NextResponse } from "next/server"
import {
  generateFoodRecommendations,
  inferMealContext,
  resolveStrategySettings,
} from "@/lib/food-recommendation-engine"
import { groupRecommendationsIntoSections } from "@/lib/diet-quality-recommendations"
import {
  buildNutritionQualityStatus,
} from "@/lib/nutrition-quality-analysis"
import type { RecommendFoodsRequest } from "@/lib/food-recommendation-types"
import {
  hasTrainingToday,
  mealTimingToContext,
} from "@/lib/food-recommendation-strategy"
import {
  getSupabaseServerConfigError,
  getSupabaseServerUserMessage,
  isSupabaseServerConfigured,
} from "@/lib/supabase-env"

const EMPTY_CONSUMED = {
  calories: 0,
  carbsG: 0,
  proteinG: 0,
  fatG: 0,
  sodiumMg: 0,
  sugarG: 0,
  fiberG: 0,
}

/**
 * POST /api/evaluate-diet-quality
 * 식단 질 평가 + Supabase food_items 기반 조합 추천
 */
export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) {
    console.error("[evaluate-diet-quality]", getSupabaseServerConfigError())
    return NextResponse.json(
      {
        error: "supabase_unconfigured",
        message: getSupabaseServerUserMessage(),
        recommendations: [],
        sections: [],
      },
      { status: 503 }
    )
  }

  let body: Partial<RecommendFoodsRequest>
  try {
    body = (await request.json()) as Partial<RecommendFoodsRequest>
  } catch {
    return NextResponse.json({ error: "JSON body가 필요합니다." }, { status: 400 })
  }

  if (!body.targets?.calories || body.targets.calories <= 0) {
    return NextResponse.json(
      { error: "targets.calories가 필요합니다." },
      { status: 400 }
    )
  }

  const req: RecommendFoodsRequest = {
    targets: {
      calories: body.targets.calories,
      proteinG: body.targets.proteinG ?? 0,
      carbsG: body.targets.carbsG ?? 0,
      fatG: body.targets.fatG ?? 0,
      fiberG: body.targets.fiberG,
      sodiumMg: body.targets.sodiumMg,
      sugarG: body.targets.sugarG,
    },
    consumed: body.consumed ?? EMPTY_CONSUMED,
    mealContext: body.mealContext,
    hasTrainingToday: body.hasTrainingToday,
    trainingIntensity: body.trainingIntensity,
    goal: body.goal,
    trainingStatus: body.trainingStatus,
    mealTiming: body.mealTiming,
    intensity: body.intensity,
    recentFoodIds: body.recentFoodIds,
    recentRecommendationIds: body.recentRecommendationIds,
    variantSeed: body.variantSeed ?? 0,
    recommendationFocus: body.recommendationFocus,
  }

  try {
    const result = await generateFoodRecommendations(req)
    const settings = resolveStrategySettings(req)
    const hasTraining =
      req.hasTrainingToday ?? hasTrainingToday(settings.trainingStatus)
    const mealContext =
      req.mealContext ?? mealTimingToContext(settings.mealTiming) ??
      inferMealContext(undefined, hasTraining)

    const quality = buildNutritionQualityStatus(req, settings, mealContext, hasTraining)
    const sections = groupRecommendationsIntoSections(
      result.recommendations,
      result.analysis
    )

    if (result.recommendations.length === 0) {
      return NextResponse.json({
        ...result,
        quality,
        sections,
        message:
          "현재 조건에 맞는 추천을 찾지 못했습니다. 조건을 조금 완화해서 다시 추천해볼게요.",
      })
    }

    return NextResponse.json({
      ...result,
      quality,
      sections,
    })
  } catch (err) {
    console.error("[evaluate-diet-quality]", err)
    return NextResponse.json(
      {
        error: "recommendation_failed",
        message:
          "현재 조건에 맞는 추천을 찾지 못했습니다. 조건을 조금 완화해서 다시 추천해볼게요.",
        recommendations: [],
        sections: [],
      },
      { status: 502 }
    )
  }
}
