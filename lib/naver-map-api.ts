/** Naver Maps Geocoding API — server-side only */

import { nominatimPlaceSearch } from "@/lib/nominatim-search"
import { suggestPlaceName } from "@/lib/place-name"

export { suggestPlaceName }

export interface NaverGeocodeHit {
  name: string
  address: string
  roadAddress?: string
  jibunAddress?: string
  lat: number
  lng: number
  kind?: "place" | "address"
}

export interface NaverReverseGeocodeResult {
  name: string
  address: string
  roadAddress?: string
  jibunAddress?: string
}

type ReverseResultItem = {
  name?: string
  region?: {
    area1?: { name?: string }
    area2?: { name?: string }
    area3?: { name?: string }
    area4?: { name?: string }
  }
  land?: {
    name?: string
    number1?: string
    number2?: string
    addition0?: { type?: string; value?: string }
    addition1?: { type?: string; value?: string }
    addition2?: { type?: string; value?: string }
  }
}

function getNaverMapCredentials() {
  const keyId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
  const key = process.env.NAVER_MAP_API_KEY

  if (!keyId || !key) return null
  return { keyId, key }
}

function getNaverSearchCredentials() {
  const clientId = process.env.NAVER_SEARCH_CLIENT_ID?.trim()
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret }
}

export function isNaverLocalSearchConfigured(): boolean {
  return getNaverSearchCredentials() != null
}

export function isNaverGeocodeConfigured(): boolean {
  return getNaverMapCredentials() != null
}

function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ")
}

function searchQueryVariants(query: string): string[] {
  const base = normalizeQuery(query)
  if (!base) return []

  const variants = new Set<string>([base])
  if (base.includes(" ")) {
    variants.add(base.replace(/\s/g, ""))
  }
  return [...variants]
}

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

const REVERSE_META_TYPES = new Set(["zipcode", "roadgroupcode"])

function extractBuildingName(r?: ReverseResultItem): string {
  if (!r?.land) return ""

  for (const key of ["addition0", "addition1", "addition2"] as const) {
    const addition = r.land[key]
    const value = addition?.value?.trim()
    const type = addition?.type?.toLowerCase() ?? ""
    if (!value || REVERSE_META_TYPES.has(type)) continue
    if (type === "building") return value
  }

  for (const key of ["addition0", "addition1", "addition2"] as const) {
    const addition = r.land[key]
    const value = addition?.value?.trim()
    const type = addition?.type?.toLowerCase() ?? ""
    if (!value || REVERSE_META_TYPES.has(type) || /^\d{5}$/.test(value)) continue
    if (value.length >= 2) return value
  }

  return ""
}

function formatNaverReverseResult(r: ReverseResultItem): string {
  const parts = [
    r.region?.area1?.name,
    r.region?.area2?.name,
    r.region?.area3?.name,
    r.region?.area4?.name,
  ].filter(Boolean)

  if (r.land) {
    if (r.name === "roadaddr") {
      const road = [r.land.name, r.land.number1, r.land.number2 ? `-${r.land.number2}` : ""]
        .filter(Boolean)
        .join(" ")
      if (road) parts.push(road)
      const building = extractBuildingName(r)
      if (building) parts.push(building)
    } else {
      const lot = [r.land.number1, r.land.number2 ? `-${r.land.number2}` : ""]
        .filter(Boolean)
        .join("")
      if (lot) parts.push(lot)
      else if (r.land.name) parts.push(r.land.name)
    }
  }

  return parts.join(" ").trim()
}

function derivePlaceName(
  road?: ReverseResultItem,
  addr?: ReverseResultItem,
  roadAddress?: string
): string {
  return (
    extractBuildingName(road) ||
    extractBuildingName(addr) ||
    road?.region?.area4?.name?.trim() ||
    road?.region?.area3?.name?.trim() ||
    addr?.region?.area3?.name?.trim() ||
    ""
  )
}

export async function naverGeocodeSearch(
  query: string,
  options?: { coordinate?: { lat: number; lng: number }; count?: number }
): Promise<NaverGeocodeHit[]> {
  const creds = getNaverMapCredentials()
  if (!creds) return []

  const url = new URL("https://maps.apigw.ntruss.com/map-geocode/v2/geocode")
  url.searchParams.set("query", query)
  url.searchParams.set("count", String(options?.count ?? 15))
  url.searchParams.set("language", "kor")

  if (options?.coordinate) {
    url.searchParams.set(
      "coordinate",
      `${options.coordinate.lng},${options.coordinate.lat}`
    )
  }

  const res = await fetch(url, {
    headers: {
      "X-NCP-APIGW-API-KEY-ID": creds.keyId,
      "X-NCP-APIGW-API-KEY": creds.key,
    },
    next: { revalidate: 0 },
  })

  if (!res.ok) return []

  const data = (await res.json()) as {
    status?: string
    errorMessage?: string
    addresses?: Array<{
      roadAddress?: string
      jibunAddress?: string
      x?: string
      y?: string
    }>
  }

  if (data.status && data.status !== "OK") return []

  return (data.addresses ?? [])
    .map((item) => {
      const lng = Number(item.x)
      const lat = Number(item.y)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

      const road = item.roadAddress?.trim() ?? ""
      const jibun = item.jibunAddress?.trim() ?? ""
      const address = road || jibun
      if (!address) return null

      return {
        name: "",
        address,
        roadAddress: road || undefined,
        jibunAddress: jibun || undefined,
        lat,
        lng,
        kind: "address",
      } satisfies NaverGeocodeHit
    })
    .filter((hit): hit is NaverGeocodeHit => hit !== null)
}

export async function naverLocalSearch(query: string): Promise<NaverGeocodeHit[]> {
  const creds = getNaverSearchCredentials()
  if (!creds) return []

  const url = new URL("https://openapi.naver.com/v1/search/local.json")
  url.searchParams.set("query", query)
  url.searchParams.set("display", "15")
  url.searchParams.set("start", "1")
  url.searchParams.set("sort", "sim")

  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": creds.clientId,
      "X-Naver-Client-Secret": creds.clientSecret,
    },
    next: { revalidate: 0 },
  })

  if (!res.ok) return []

  const data = (await res.json()) as {
    items?: Array<{
      title?: string
      category?: string
      address?: string
      roadAddress?: string
      mapx?: string
      mapy?: string
    }>
  }

  return (data.items ?? [])
    .map((item) => {
      const lng = Number(item.mapx) / 1e7
      const lat = Number(item.mapy) / 1e7
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

      const title = item.title?.replace(/<[^>]+>/g, "").trim() ?? ""
      const road = item.roadAddress?.trim() ?? ""
      const land = item.address?.trim() ?? ""
      const address = road || land
      if (!address && !title) return null

      return {
        name: title,
        address: address || title,
        roadAddress: road || undefined,
        jibunAddress: land || undefined,
        lat,
        lng,
        kind: "place",
      } satisfies NaverGeocodeHit
    })
    .filter((hit): hit is NaverGeocodeHit => hit !== null)
}

async function findNearbyPlaceName(
  lat: number,
  lng: number,
  hints: string[]
): Promise<string> {
  const uniqueHints = [...new Set(hints.map((h) => h.trim()).filter((h) => h.length >= 2))]

  for (const hint of uniqueHints.slice(0, 3)) {
    const hits = await naverLocalSearch(hint)
    let best: { name: string; dist: number } | null = null

    for (const hit of hits) {
      if (!hit.name) continue
      const dist = haversineMeters(lat, lng, hit.lat, hit.lng)
      if (dist > 250) continue
      if (!best || dist < best.dist) {
        best = { name: hit.name, dist }
      }
    }

    if (best) return best.name
  }

  return ""
}

export async function naverReverseGeocode(
  lat: number,
  lng: number
): Promise<NaverReverseGeocodeResult | null> {
  const creds = getNaverMapCredentials()
  if (!creds) return null

  const url = new URL("https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc")
  url.searchParams.set("coords", `${lng},${lat}`)
  url.searchParams.set("output", "json")
  url.searchParams.set("orders", "roadaddr,addr,admcode")

  const res = await fetch(url, {
    headers: {
      "X-NCP-APIGW-API-KEY-ID": creds.keyId,
      "X-NCP-APIGW-API-KEY": creds.key,
    },
    next: { revalidate: 0 },
  })

  if (!res.ok) return null

  const data = (await res.json()) as {
    status?: { code?: number; name?: string }
    results?: ReverseResultItem[]
  }
  if (data.status?.code !== 0 && data.status?.name !== "ok") return null
  const results = data.results ?? []
  const road = results.find((r) => r.name === "roadaddr")
  const addr = results.find((r) => r.name === "addr")

  const roadAddress = road ? formatNaverReverseResult(road) : ""
  const jibunAddress = addr ? formatNaverReverseResult(addr) : ""
  const address = roadAddress || jibunAddress

  if (!address.trim()) return null

  let name = derivePlaceName(road, addr, roadAddress)

  if (!name) {
    name = await findNearbyPlaceName(lat, lng, [
      extractBuildingName(road),
      road?.region?.area3?.name ?? "",
      road?.region?.area4?.name ?? "",
      address.split(" ").slice(-2).join(" "),
    ])
  }

  if (!name) {
    name =
      road?.region?.area4?.name?.trim() ||
      road?.region?.area3?.name?.trim() ||
      suggestPlaceName("", address)
  }

  return {
    name: name.trim(),
    address: address.trim(),
    roadAddress: roadAddress || undefined,
    jibunAddress: jibunAddress !== roadAddress ? jibunAddress : undefined,
  }
}

export async function searchPlacesCombined(
  query: string,
  options?: { coordinate?: { lat: number; lng: number } }
): Promise<NaverGeocodeHit[]> {
  const variants = searchQueryVariants(query)
  const seen = new Set<string>()
  const merged: NaverGeocodeHit[] = []

  for (const variant of variants) {
    const [local, geocode] = await Promise.all([
      naverLocalSearch(variant),
      naverGeocodeSearch(variant, { coordinate: options?.coordinate, count: 15 }),
    ])

    for (const hit of [...local, ...geocode]) {
      const key = `${hit.lat.toFixed(5)}|${hit.lng.toFixed(5)}|${hit.address}`
      if (seen.has(key)) continue
      seen.add(key)
      merged.push({
        ...hit,
        name: hit.name || suggestPlaceName(query, hit.address),
      })
      if (merged.length >= 15) break
    }

    if (merged.length >= 8) break
  }

  if (options?.coordinate && merged.length > 1) {
    merged.sort(
      (a, b) =>
        haversineMeters(options.coordinate!.lat, options.coordinate!.lng, a.lat, a.lng) -
        haversineMeters(options.coordinate!.lat, options.coordinate!.lng, b.lat, b.lng)
    )
  }

  if (merged.length === 0) {
    const fallback = await nominatimPlaceSearch(query, options)
    for (const hit of fallback) {
      const key = `${hit.lat.toFixed(5)}|${hit.lng.toFixed(5)}|${hit.address}`
      if (seen.has(key)) continue
      seen.add(key)
      merged.push({
        ...hit,
        name: hit.name || suggestPlaceName(query, hit.address),
      })
      if (merged.length >= 15) break
    }
  }

  return merged.slice(0, 15)
}

export async function naverGeocodeFirst(
  query: string,
  options?: { coordinate?: { lat: number; lng: number } }
): Promise<{ lat: number; lng: number } | null> {
  const hits = await searchPlacesCombined(query, options)
  const first = hits[0]
  if (!first) return null
  return { lat: first.lat, lng: first.lng }
}
