import { NextResponse } from "next/server"
import {
  isNaverGeocodeConfigured,
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

/** 입력 중 연관 검색·자동완성용 (가벼운 응답) */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim()
  const coordinate = parseCoordinate(searchParams)

  if (!q) {
    return NextResponse.json({ results: [], related: [] })
  }

  if (!isNaverGeocodeConfigured()) {
    return NextResponse.json({
      results: [],
      related: [],
      error: NAVER_SETUP_HINT,
    })
  }

  const results = await searchPlacesCombined(q, { coordinate })

  const related = new Set<string>()
  for (const hit of results) {
    if (hit.name.trim()) related.add(hit.name.trim())
    const addr = hit.roadAddress || hit.address
    const parts = addr.split(/\s+/).filter(Boolean)
    for (let i = 1; i <= Math.min(parts.length, 3); i++) {
      const term = parts.slice(0, i).join(" ")
      if (term.length >= q.length && term !== q) related.add(term)
    }
  }

  return NextResponse.json({
    results: results.slice(0, 10),
    related: [...related].slice(0, 8),
  })
}
