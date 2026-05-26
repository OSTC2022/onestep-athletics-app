import type { NaverGeocodeHit } from "@/lib/naver-map-api"

const USER_AGENT = "one-step-coach-app/1.0 (training location search)"
const CACHE_MS = 60_000
const MIN_INTERVAL_MS = 1100

const cache = new Map<string, { at: number; hits: NaverGeocodeHit[] }>()
let lastRequestAt = 0

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatNominatimAddress(displayName: string): string {
  const parts = displayName
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length <= 1) return displayName.trim()
  const country = parts[parts.length - 1]
  if (country === "대한민국" || country === "South Korea") parts.pop()
  const postcode = parts[parts.length - 1]
  if (/^\d{5}$/.test(postcode ?? "")) parts.pop()
  return parts.reverse().join(" ")
}

/** 장소명 검색 fallback — Naver Geocoding/Local Search 보완 */
export async function nominatimPlaceSearch(
  query: string,
  options?: { coordinate?: { lat: number; lng: number } }
): Promise<NaverGeocodeHit[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const cacheKey = q.toLowerCase()
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return sortByDistance(cached.hits, options?.coordinate)
  }

  const waitMs = MIN_INTERVAL_MS - (Date.now() - lastRequestAt)
  if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs))
  lastRequestAt = Date.now()

  const url = new URL("https://nominatim.openstreetmap.org/search")
  url.searchParams.set("q", q)
  url.searchParams.set("format", "json")
  url.searchParams.set("limit", "10")
  url.searchParams.set("countrycodes", "kr")
  url.searchParams.set("addressdetails", "1")

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      next: { revalidate: 0 },
    })
    if (!res.ok) return []

    const data = (await res.json()) as Array<{
      name?: string
      display_name?: string
      lat?: string
      lon?: string
    }>

    const hits = data
      .map((item) => {
        const lat = Number(item.lat)
        const lng = Number(item.lon)
        const display = item.display_name?.trim() ?? ""
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || !display) return null

        const name = item.name?.trim() || q
        const address = formatNominatimAddress(display)

        return {
          name,
          address,
          lat,
          lng,
          kind: "place" as const,
        } satisfies NaverGeocodeHit
      })
      .filter((hit): hit is NaverGeocodeHit => hit !== null)

    cache.set(cacheKey, { at: Date.now(), hits })
    return sortByDistance(hits, options?.coordinate)
  } catch {
    return []
  }
}

function sortByDistance(
  hits: NaverGeocodeHit[],
  coordinate?: { lat: number; lng: number }
): NaverGeocodeHit[] {
  if (!coordinate || hits.length <= 1) return hits
  return [...hits].sort(
    (a, b) =>
      haversineMeters(coordinate.lat, coordinate.lng, a.lat, a.lng) -
      haversineMeters(coordinate.lat, coordinate.lng, b.lat, b.lng)
  )
}
