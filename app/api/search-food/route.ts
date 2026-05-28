import { NextResponse } from "next/server"
import { searchFoodItems } from "@/lib/food-items-db"
import { searchExternalFoodCache } from "@/lib/external-food-cache-db"
import { isUsdaConfigured, searchUsdaFoods } from "@/lib/usda-food-api"
import { isSupabaseConfigured } from "@/lib/supabase-server"

const NOT_FOUND_MESSAGE =
  "공식 DB와 외부 API에서 찾지 못했습니다. 직접 추가해 주세요."
const API_KEY_MESSAGE = "외부 음식 API 키가 설정되지 않았습니다"
const RESULT_LIMIT = 20

/**
 * GET /api/search-food?query=검색어
 *
 * 1) Supabase food_items (공식 DB)
 * 2) 없을 때만 external_food_cache + USDA API
 *
 * 서버 전용: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FOOD_DATA_CENTRAL_API_KEY
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("query")?.trim()

  if (!query || query.length < 2) {
    return NextResponse.json({ error: "검색어가 필요합니다." }, { status: 400 })
  }

  try {
    if (isSupabaseConfigured()) {
      const officialResults = await searchFoodItems(query, RESULT_LIMIT)
      if (officialResults.length > 0) {
        return NextResponse.json({ results: officialResults })
      }
    }

    const cached = isSupabaseConfigured()
      ? await searchExternalFoodCache(query, RESULT_LIMIT)
      : []

    const cachedIds = new Set(
      cached.map((item) => item.externalId).filter(Boolean) as string[]
    )

    let apiResults: Awaited<ReturnType<typeof searchUsdaFoods>> = []

    if (isUsdaConfigured()) {
      const remaining = Math.max(RESULT_LIMIT - cached.length, 0)
      if (remaining > 0) {
        apiResults = await searchUsdaFoods(query, remaining)
        apiResults = apiResults.filter(
          (item) => !item.externalId || !cachedIds.has(item.externalId)
        )
      }
    }

    const results = [...cached, ...apiResults].slice(0, RESULT_LIMIT)

    if (results.length > 0) {
      return NextResponse.json({ results })
    }

    if (!isSupabaseConfigured() && !isUsdaConfigured()) {
      return NextResponse.json({
        results: [],
        message: NOT_FOUND_MESSAGE,
      })
    }

    if (!isUsdaConfigured() && cached.length === 0) {
      return NextResponse.json({
        results: [],
        message: isSupabaseConfigured() ? NOT_FOUND_MESSAGE : API_KEY_MESSAGE,
      })
    }

    return NextResponse.json({
      results: [],
      message: NOT_FOUND_MESSAGE,
      error: "not_found",
    })
  } catch (err) {
    console.error("[search-food]", err)
    return NextResponse.json(
      { results: [], message: NOT_FOUND_MESSAGE, error: "search_failed" },
      { status: 502 }
    )
  }
}
