import type { AddressSearchResult } from "@/lib/kakao-postcode"

export interface MapCoordinates {
  lat: number
  lng: number
}

export interface ReverseGeocodeResult {
  name: string
  address: string
  roadAddress?: string
  jibunAddress?: string
}

/** 서울 잠실 기본 중심 (러닝 앱 기본값) */
export const DEFAULT_MAP_CENTER: MapCoordinates = {
  lat: 37.5133,
  lng: 127.1028,
}

export async function reverseGeocodeCoordinates(
  coords: MapCoordinates
): Promise<ReverseGeocodeResult> {
  const params = new URLSearchParams({
    lat: String(coords.lat),
    lng: String(coords.lng),
  })

  try {
    const res = await fetch(`/api/geocode/reverse?${params}`, { cache: "no-store" })
    if (res.ok) {
      return (await res.json()) as ReverseGeocodeResult
    }
  } catch {
    /* 서버 실패 시 브라우저 SDK로 폴백 */
  }

  if (typeof window !== "undefined") {
    const { clientReverseGeocode } = await import("@/lib/naver-geocode-client")
    const client = await clientReverseGeocode(coords.lat, coords.lng)
    if (client) return client
  }

  throw new Error("해당 위치의 주소를 찾지 못했습니다.")
}

export async function forwardGeocodeAddress(
  address: string
): Promise<MapCoordinates | null> {
  const query = address.trim()
  if (!query) return null

  const params = new URLSearchParams({ q: query })
  const res = await fetch(`/api/geocode/search?${params}`)
  if (!res.ok) return null
  const data = (await res.json()) as { lat?: number; lng?: number }
  if (typeof data.lat !== "number" || typeof data.lng !== "number") return null
  return { lat: data.lat, lng: data.lng }
}

export async function searchAddressList(query: string) {
  const q = query.trim()
  if (!q) return []

  const params = new URLSearchParams({ q, list: "1" })
  const res = await fetch(`/api/geocode/search?${params}`)
  if (!res.ok) return []
  const data = (await res.json()) as {
    results?: Array<{
      name: string
      address: string
      lat: number
      lng: number
    }>
  }
  return data.results ?? []
}

export function mergeAddressPreview(
  current: AddressSearchResult | null,
  next: Partial<AddressSearchResult>
): AddressSearchResult {
  return {
    name: next.name ?? current?.name ?? "",
    address: next.address ?? current?.address ?? "",
    zonecode: next.zonecode ?? current?.zonecode ?? "",
    lat: next.lat ?? current?.lat,
    lng: next.lng ?? current?.lng,
  }
}
