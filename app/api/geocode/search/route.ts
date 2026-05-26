import { NextResponse } from "next/server"
import {
  isNaverGeocodeConfigured,
  naverGeocodeFirst,
  searchPlacesCombined,
} from "@/lib/naver-map-api"

const NAVER_SETUP_HINT =
  ".env.local에 NEXT_PUBLIC_NAVER_MAP_CLIENT_ID와 NAVER_MAP_API_KEY를 설정하면 네이버 지도 검색이 작동합니다."

function parseCoordinate(searchParams: URLSearchParams) {
  const lat = Number(searchParams.get("lat"))
  const lng = Number(searchParams.get("lng"))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined
  return { lat, lng }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim()
  const list = searchParams.get("list") === "1"
  const coordinate = parseCoordinate(searchParams)

  if (!q) {
    return NextResponse.json({ error: "검색어가 필요합니다." }, { status: 400 })
  }

  if (!isNaverGeocodeConfigured()) {
    return NextResponse.json(
      list ? { results: [], error: NAVER_SETUP_HINT } : { error: NAVER_SETUP_HINT },
      { status: list ? 200 : 503 }
    )
  }

  if (list) {
    const results = await searchPlacesCombined(q, { coordinate })
    return NextResponse.json({ results })
  }

  const first = await naverGeocodeFirst(q, { coordinate })
  if (first) return NextResponse.json(first)

  return NextResponse.json({ error: "검색 결과가 없습니다." }, { status: 404 })
}
