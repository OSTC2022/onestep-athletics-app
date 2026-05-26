const NAVER_MAPS_SCRIPT = "https://oapi.map.naver.com/openapi/v3/maps.js"

declare global {
  interface Window {
    naver?: {
      maps: {
        Map: new (
          element: HTMLElement,
          options: {
            center: unknown
            zoom: number
            zoomControl?: boolean
            zoomControlOptions?: { position: number }
          }
        ) => {
          setCenter: (center: unknown) => void
          getZoom: () => number
          setZoom: (zoom: number) => void
          relayout?: () => void
        }
        LatLng: new (lat: number, lng: number) => unknown
        Marker: new (options: { position: unknown; map: unknown; icon?: unknown; zIndex?: number }) => {
          setPosition: (position: unknown) => void
          setMap: (map: unknown | null) => void
          setIcon?: (icon: unknown) => void
          setZIndex?: (z: number) => void
        }
        InfoWindow: new (options: {
          content: string | HTMLElement
          borderWidth?: number
          anchorSize?: unknown
          anchorSkew?: boolean
          backgroundColor?: string
          borderColor?: string
          pixelOffset?: unknown
        }) => {
          open: (map: unknown, anchor: unknown) => void
          close: () => void
          getMap: () => unknown
          setContent: (content: string | HTMLElement) => void
        }
        Event: {
          addListener: (
            target: unknown,
            event: string,
            handler: (e: { coord: { lat: () => number; lng: () => number } }) => void
          ) => void
        }
        Position: { TOP_RIGHT: number }
        Point: new (x: number, y: number) => unknown
        Service: {
          Status: { OK: number; ERROR: number }
          geocode: (
            options: { query: string },
            callback: (
              status: number,
              response: {
                v2?: {
                  addresses?: Array<{
                    roadAddress?: string
                    jibunAddress?: string
                    x?: string
                    y?: string
                  }>
                }
              }
            ) => void
          ) => void
          reverseGeocode: (
            options: { coords: unknown; orders?: string },
            callback: (
              status: number,
              response: {
                v2?: {
                  address?: { roadAddress?: string; jibunAddress?: string }
                  results?: Array<{
                    name?: string
                    region?: { area3?: { name?: string }; area4?: { name?: string } }
                    land?: Record<
                      string,
                      { type?: string; value?: string } | undefined
                    >
                  }>
                }
              }
            ) => void
          ) => void
        }
      }
    }
  }
}

let scriptPromise: Promise<void> | null = null

function isGeocoderReady(): boolean {
  const service = window.naver?.maps?.Service
  return Boolean(service?.geocode && service?.reverseGeocode)
}

function waitForGeocoder(resolve: () => void, reject: (err: Error) => void) {
  if (isGeocoderReady()) {
    resolve()
    return
  }

  let attempts = 0
  const timer = window.setInterval(() => {
    if (isGeocoderReady()) {
      window.clearInterval(timer)
      resolve()
      return
    }
    if (++attempts >= 40) {
      window.clearInterval(timer)
      if (window.naver?.maps?.Service) resolve()
      else reject(new Error("네이버 지도 geocoder를 불러오지 못했습니다."))
    }
  }, 50)
}

export function getNaverMapClientId(): string | undefined {
  return process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
}

export function isNaverMapConfigured(): boolean {
  return Boolean(getNaverMapClientId())
}

export function loadNaverMapsScript(): Promise<void> {
  const clientId = getNaverMapClientId()
  if (typeof window === "undefined") {
    return Promise.reject(new Error("브라우저에서만 지도를 사용할 수 있습니다."))
  }
  if (!clientId) {
    return Promise.reject(
      new Error("NEXT_PUBLIC_NAVER_MAP_CLIENT_ID가 설정되지 않았습니다.")
    )
  }
  if (isGeocoderReady()) return Promise.resolve()

  const src = `${NAVER_MAPS_SCRIPT}?ncpKeyId=${encodeURIComponent(clientId)}&submodules=geocoder`

  const stale = document.querySelector<HTMLScriptElement>(
    `script[src^="${NAVER_MAPS_SCRIPT}"]`
  )
  if (stale && !stale.src.includes("submodules=geocoder")) {
    stale.remove()
    scriptPromise = null
  }

  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src^="${NAVER_MAPS_SCRIPT}"]`
    )
    if (existing) {
      waitForGeocoder(resolve, reject)
      existing.addEventListener(
        "load",
        () => waitForGeocoder(resolve, reject),
        { once: true }
      )
      existing.addEventListener(
        "error",
        () => reject(new Error("네이버 지도를 불러오지 않았습니다.")),
        { once: true }
      )
      return
    }

    const script = document.createElement("script")
    script.src = src
    script.async = true
    script.onload = () => waitForGeocoder(resolve, reject)
    script.onerror = () => reject(new Error("네이버 지도를 불러오지 않았습니다."))
    document.head.appendChild(script)
  })

  return scriptPromise
}

export function createNaverMarkerIcon(dimmed = false) {
  const naver = window.naver!
  const size = dimmed ? 14 : 18
  const anchor = size / 2
  const opacity = dimmed ? 0.55 : 1
  return {
    content: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#03C75A;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.25);opacity:${opacity}"></div>`,
    anchor: new naver.maps.Point(anchor, anchor),
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** 클릭 위치 마커 + 장소명/주소 라벨 (InfoWindow 대신 사용 — 지도 이동 없음) */
export function createNaverPickMarkerIcon(options: {
  name?: string
  address?: string
  loading?: boolean
}): { content: string; anchor: unknown } {
  const naver = window.naver!

  let bubbleInner: string
  if (options.loading) {
    bubbleInner = `<p style="margin:0;font-size:12px;color:#666;text-align:center;white-space:nowrap;">주소 확인 중…</p>`
  } else {
    const name = options.name?.trim() || "선택한 위치"
    const address = options.address?.trim() || ""
    bubbleInner = `<p style="margin:0 0 3px;font-size:13px;font-weight:700;color:#03C75A;line-height:1.35;word-break:keep-all;">${escapeHtml(name)}</p>${
      address
        ? `<p style="margin:0;font-size:11px;color:#555;line-height:1.4;word-break:keep-all;">${escapeHtml(address)}</p>`
        : ""
    }`
  }

  const content = `<div style="display:flex;flex-direction:column;align-items:center;font-family:system-ui,sans-serif;pointer-events:none;">
    <div style="min-width:140px;max-width:240px;padding:8px 10px;margin-bottom:6px;background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.18);border:1px solid #e8e8e8;">${bubbleInner}</div>
    <div style="width:18px;height:18px;border-radius:50%;background:#03C75A;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.25);"></div>
  </div>`

  return {
    content,
    anchor: new naver.maps.Point(80, 64),
  }
}

/** @deprecated InfoWindow용 — createNaverPickMarkerIcon 사용 */
export function createNaverPickInfoHtml(options: {
  name?: string
  address?: string
  loading?: boolean
}): string {
  if (options.loading) {
    return `<div style="min-width:140px;max-width:220px;padding:10px 12px;font-family:system-ui,sans-serif;">
      <p style="margin:0;font-size:12px;color:#666;text-align:center;">주소 확인 중…</p>
    </div>`
  }

  const name = options.name?.trim() || "선택한 위치"
  const address = options.address?.trim() || ""

  return `<div style="min-width:160px;max-width:240px;padding:10px 12px;font-family:system-ui,sans-serif;">
    <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#03C75A;line-height:1.35;word-break:keep-all;">${escapeHtml(name)}</p>
    ${address ? `<p style="margin:0;font-size:11px;color:#555;line-height:1.4;word-break:keep-all;">${escapeHtml(address)}</p>` : ""}
  </div>`
}
