/** Kakao Local API — server-side only */

import { suggestPlaceName } from "@/lib/place-name"

export interface KakaoGeocodeHit {
  name: string
  address: string
  roadAddress?: string
  jibunAddress?: string
  lat: number
  lng: number
}

function getKakaoRestKey(): string | undefined {
  return process.env.KAKAO_REST_API_KEY
}

export function isKakaoGeocodeConfigured(): boolean {
  return Boolean(getKakaoRestKey())
}

async function kakaoFetch<T>(path: string, query: Record<string, string>): Promise<T | null> {
  const key = getKakaoRestKey()
  if (!key) return null

  const url = new URL(`https://dapi.kakao.com${path}`)
  for (const [k, v] of Object.entries(query)) {
    url.searchParams.set(k, v)
  }

  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${key}` },
    next: { revalidate: 0 },
  })
  if (!res.ok) return null
  return res.json() as Promise<T>
}

export async function kakaoKeywordSearch(query: string): Promise<KakaoGeocodeHit[]> {
  const data = await kakaoFetch<{
    documents?: Array<{
      place_name?: string
      address_name?: string
      road_address_name?: string
      x?: string
      y?: string
    }>
  }>("/v2/local/search/keyword.json", { query, size: "10" })

  return (data?.documents ?? [])
    .map((doc) => {
      const lat = Number(doc.y)
      const lng = Number(doc.x)
      const road = doc.road_address_name?.trim()
      const jibun = doc.address_name?.trim()
      const address = road || jibun || ""
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !address) return null

      return {
        name: doc.place_name?.trim() ?? "",
        address,
        roadAddress: road,
        jibunAddress: jibun !== road ? jibun : undefined,
        lat,
        lng,
      } satisfies KakaoGeocodeHit
    })
    .filter((hit): hit is KakaoGeocodeHit => hit !== null)
}

export async function kakaoAddressSearch(query: string): Promise<KakaoGeocodeHit[]> {
  const data = await kakaoFetch<{
    documents?: Array<{
      address_name?: string
      road_address?: { address_name?: string }
      x?: string
      y?: string
    }>
  }>("/v2/local/search/address.json", { query, size: "10" })

  return (data?.documents ?? [])
    .map((doc) => {
      const lat = Number(doc.y)
      const lng = Number(doc.x)
      const road = doc.road_address?.address_name?.trim()
      const jibun = doc.address_name?.trim()
      const address = road || jibun || ""
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !address) return null

      return {
        name: "",
        address,
        roadAddress: road,
        jibunAddress: jibun !== road ? jibun : undefined,
        lat,
        lng,
      } satisfies KakaoGeocodeHit
    })
    .filter((hit): hit is KakaoGeocodeHit => hit !== null)
}

export async function searchPlacesCombined(query: string): Promise<KakaoGeocodeHit[]> {
  const [keyword, address] = await Promise.all([
    kakaoKeywordSearch(query),
    kakaoAddressSearch(query),
  ])

  const seen = new Set<string>()
  const merged: KakaoGeocodeHit[] = []

  for (const hit of [...keyword, ...address]) {
    const key = `${hit.lat.toFixed(5)}|${hit.lng.toFixed(5)}|${hit.address}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push({
      ...hit,
      name: hit.name || suggestPlaceName(query, hit.address),
    })
    if (merged.length >= 8) break
  }

  return merged
}

export async function kakaoGeocodeFirst(
  query: string
): Promise<{ lat: number; lng: number } | null> {
  const hits = await searchPlacesCombined(query)
  const first = hits[0]
  if (!first) return null
  return { lat: first.lat, lng: first.lng }
}

export async function kakaoReverseGeocode(
  lat: number,
  lng: number
): Promise<{ name: string; address: string } | null> {
  const data = await kakaoFetch<{
    documents?: Array<{
      road_address?: { address_name?: string; building_name?: string }
      address?: { address_name?: string; region_3depth_name?: string }
    }>
  }>("/v2/local/geo/coord2address.json", {
    x: String(lng),
    y: String(lat),
  })

  const doc = data?.documents?.[0]
  if (!doc) return null

  const road = doc.road_address
  const jibun = doc.address
  const address = road?.address_name ?? jibun?.address_name ?? ""
  const name =
    road?.building_name?.trim() || jibun?.region_3depth_name?.trim() || ""

  if (!address) return null
  return { address, name }
}
