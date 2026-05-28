import { NextResponse } from "next/server"
import type { ExternalFoodCacheInput } from "@/lib/external-food-types"
import {
  touchExternalFoodCache,
  upsertExternalFoodCache,
} from "@/lib/external-food-cache-db"
import { isSupabaseConfigured, getSupabaseServerConfigError } from "@/lib/supabase-server"

/**
 * POST /api/search-food/cache
 * 사용자가 선택한 외부 음식을 Supabase external_food_cache에 저장합니다.
 * SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY는 서버 전용 환경변수입니다.
 * (클라이언트는 NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY 사용)
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          getSupabaseServerConfigError() ??
          "Supabase가 설정되지 않았습니다.",
      },
      { status: 503 }
    )
  }

  const body = (await request.json()) as Partial<ExternalFoodCacheInput>

  if (!body.name?.trim() || !body.per100g || !body.searchQuery?.trim()) {
    return NextResponse.json(
      { error: "name, per100g, searchQuery가 필요합니다." },
      { status: 400 }
    )
  }

  const cached = await upsertExternalFoodCache({
    name: body.name,
    nameEn: body.nameEn,
    category: body.category,
    aliases: body.aliases,
    per100g: body.per100g,
    source: body.source ?? "usda",
    externalId: body.externalId,
    searchQuery: body.searchQuery,
    servingLabel: body.servingLabel,
    pieceWeightG: body.pieceWeightG,
  })

  if (!cached) {
    return NextResponse.json(
      { error: "캐시 저장에 실패했습니다." },
      { status: 500 }
    )
  }

  return NextResponse.json({ food: cached })
}

/** PATCH /api/search-food/cache — 캐시 항목 last_used_at 갱신 */
export async function PATCH(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 })
  }

  const body = (await request.json()) as { id?: string }
  if (!body.id?.startsWith("external-")) {
    return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 })
  }

  await touchExternalFoodCache(body.id)
  return NextResponse.json({ ok: true })
}
