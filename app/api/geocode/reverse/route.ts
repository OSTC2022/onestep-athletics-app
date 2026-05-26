import { NextResponse } from "next/server"
import {
  isNaverGeocodeConfigured,
  naverReverseGeocode,
} from "@/lib/naver-map-api"

export const dynamic = "force-dynamic"

const NAVER_SETUP_HINT =
  ".env.local에 NEXT_PUBLIC_NAVER_MAP_CLIENT_ID와 NAVER_MAP_API_KEY를 설정하면 네이버 지도 검색이 작동합니다."

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = Number(searchParams.get("lat"))
  const lng = Number(searchParams.get("lng"))

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "유효하지 않은 좌표입니다." }, { status: 400 })
  }

  if (!isNaverGeocodeConfigured()) {
    return NextResponse.json({ error: NAVER_SETUP_HINT }, { status: 503 })
  }

  const naver = await naverReverseGeocode(lat, lng)
  if (naver) return NextResponse.json(naver)

  return NextResponse.json(
    { error: "해당 위치의 주소를 찾지 못했습니다." },
    { status: 404 }
  )
}
