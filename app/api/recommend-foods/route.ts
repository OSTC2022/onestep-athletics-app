import { NextResponse } from "next/server"
import { generateFoodRecommendations } from "@/lib/food-recommendation-engine"
import type { RecommendFoodsRequest } from "@/lib/food-recommendation-types"
import {
  getSupabaseServerConfigError,
  getSupabaseServerUserMessage,
  isSupabaseReadConfigured,
} from "@/lib/supabase-env"
import { isSupabaseServerConfigured } from "@/lib/supabase-server"

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
 * POST /api/recommend-foods
 * 목표·훈련·식사 타이밍 기반 영양 전략 추천 (Supabase food_items, 서버 전용)
 */
export async function POST(request: Request) {
  if (!isSupabaseReadConfigured()) {
    console.error("[recommend-foods]", getSupabaseServerConfigError())
    return NextResponse.json(
      {
        error: "supabase_unconfigured",
        message: getSupabaseServerUserMessage(),
        recommendations: [],
      },
      { status: 503 }
    )
  }

  if (!isSupabaseServerConfigured()) {
    console.warn(
      "[recommend-foods] SUPABASE_SERVICE_ROLE_KEY 없음 — anon/publishable 키로 읽기 시도"
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
  }

  try {
    const result = await generateFoodRecommendations(req)

    if (result.recommendations.length === 0) {
      return NextResponse.json({
        ...result,
        message:
          "현재 조건에 맞는 추천을 찾지 못했습니다. 조건을 조금 완화해서 다시 추천해볼게요.",
      })
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error("[recommend-foods]", err)
    return NextResponse.json(
      {
        error: "recommendation_failed",
        message:
          "현재 조건에 맞는 추천을 찾지 못했습니다. 조건을 조금 완화해서 다시 추천해볼게요.",
        recommendations: [],
      },
      { status: 502 }
    )
  }
}
