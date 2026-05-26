import { loadNaverMapsScript } from "@/lib/naver-maps"

export interface AddressSearchHit {
  name: string
  address: string
  roadAddress?: string
  jibunAddress?: string
  lat: number
  lng: number
  kind?: "place" | "address"
}

/** 브라우저 네이버 지도 SDK geocoder — Client ID만 필요 */
export async function clientGeocodeSearch(
  query: string,
  coordinate?: { lat: number; lng: number }
): Promise<AddressSearchHit[]> {
  const q = query.trim()
  if (!q) return []

  await loadNaverMapsScript()
  const naver = window.naver
  if (!naver?.maps?.Service) return []

  return new Promise((resolve) => {
    const options: { query: string; coordinate?: string } = { query: q }
    if (coordinate) {
      options.coordinate = `${coordinate.lng},${coordinate.lat}`
    }

    naver.maps.Service.geocode(options, (status, response) => {
      if (status !== naver.maps.Service.Status.OK) {
        resolve([])
        return
      }

      const hits = (response.v2?.addresses ?? [])
        .map((item) => {
          const lng = Number(item.x)
          const lat = Number(item.y)
          const road = item.roadAddress?.trim() ?? ""
          const jibun = item.jibunAddress?.trim() ?? ""
          const address = road || jibun
          if (!Number.isFinite(lat) || !Number.isFinite(lng) || !address) return null

          return {
            name: "",
            address,
            roadAddress: road || undefined,
            jibunAddress: jibun || undefined,
            lat,
            lng,
            kind: "address" as const,
          }
        })
        .filter((hit): hit is AddressSearchHit => hit !== null)

      resolve(hits)
    })
  })
}

export function buildRelatedSearchTerms(
  query: string,
  hits: AddressSearchHit[]
): string[] {
  const q = query.trim()
  if (!q || hits.length === 0) return []

  const terms = new Set<string>()

  for (const hit of hits) {
    if (hit.name.trim()) terms.add(hit.name.trim())

    const addr = hit.roadAddress || hit.address
    const parts = addr.split(/\s+/).filter(Boolean)

    for (let i = 1; i <= Math.min(parts.length, 4); i++) {
      const slice = parts.slice(0, i).join(" ")
      if (slice.length >= q.length) terms.add(slice)
    }
  }

  return [...terms]
    .filter((term) => term !== q)
    .sort((a, b) => {
      const aStarts = a.startsWith(q) ? 0 : 1
      const bStarts = b.startsWith(q) ? 0 : 1
      if (aStarts !== bStarts) return aStarts - bStarts
      return a.length - b.length
    })
    .slice(0, 8)
}

export interface ReverseGeocodeHit {
  name: string
  address: string
  roadAddress?: string
  jibunAddress?: string
}

/** 브라우저 네이버 지도 SDK — 지도 클릭 역지오코딩 */
export async function clientReverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeHit | null> {
  await loadNaverMapsScript()
  const naver = window.naver
  if (!naver?.maps?.Service?.reverseGeocode) return null

  return new Promise((resolve) => {
    naver.maps.Service.reverseGeocode(
      {
        coords: new naver.maps.LatLng(lat, lng),
        orders: "roadaddr,addr",
      },
      (status, response) => {
        if (status !== naver.maps.Service.Status.OK) {
          resolve(null)
          return
        }

        const v2 = response.v2
        const road = v2?.address?.roadAddress?.trim() ?? ""
        const jibun = v2?.address?.jibunAddress?.trim() ?? ""
        const address = road || jibun
        if (!address) {
          resolve(null)
          return
        }

        const results = v2?.results ?? []
        const roadResult = results.find((r) => r.name === "roadaddr")
        let name = ""
        for (const key of ["addition0", "addition1", "addition2"] as const) {
          const addition = roadResult?.land?.[key]
          const value = addition?.value?.trim()
          const type = addition?.type?.toLowerCase() ?? ""
          if (!value || type === "zipcode" || type === "roadgroupcode") continue
          if (type === "building" || (value.length >= 2 && !/^\d{5}$/.test(value))) {
            name = value
            break
          }
        }
        if (!name) {
          name =
            roadResult?.region?.area4?.name?.trim() ||
            roadResult?.region?.area3?.name?.trim() ||
            address.split(" ").slice(-1)[0] ||
            ""
        }

        resolve({
          name,
          address,
          roadAddress: road || undefined,
          jibunAddress: jibun && jibun !== road ? jibun : undefined,
        })
      }
    )
  })
}

export function mergeSearchHits(...lists: AddressSearchHit[][]): AddressSearchHit[] {
  const seen = new Set<string>()
  const merged: AddressSearchHit[] = []

  for (const list of lists) {
    for (const hit of list) {
      const key = `${hit.lat.toFixed(5)}|${hit.lng.toFixed(5)}|${hit.address}`
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(hit)
    }
  }

  return merged
}
