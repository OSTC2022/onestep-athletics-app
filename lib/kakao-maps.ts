const KAKAO_MAPS_SCRIPT = "https://dapi.kakao.com/v2/maps/sdk.js"

declare global {
  interface Window {
    kakao?: {
      maps: {
        load: (callback: () => void) => void
        Map: new (
          container: HTMLElement,
          options: { center: unknown; level: number }
        ) => {
          setCenter: (center: unknown) => void
          getLevel: () => number
          setLevel: (level: number) => void
          relayout: () => void
        }
        LatLng: new (lat: number, lng: number) => {
          getLat: () => number
          getLng: () => number
        }
        CustomOverlay: new (options: {
          position: unknown
          content: string
          yAnchor?: number
          xAnchor?: number
        }) => {
          setPosition: (position: unknown) => void
          setMap: (map: unknown | null) => void
        }
        event: {
          addListener: (
            target: unknown,
            type: string,
            handler: (e: { latLng: { getLat: () => number; getLng: () => number } }) => void
          ) => void
        }
      }
    }
  }
}

let scriptPromise: Promise<void> | null = null

export function getKakaoJavascriptKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY ??
    process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY
  )
}

export function isKakaoMapConfigured(): boolean {
  return Boolean(getKakaoJavascriptKey())
}

export function loadKakaoMapsScript(): Promise<void> {
  const appKey = getKakaoJavascriptKey()
  if (typeof window === "undefined") {
    return Promise.reject(new Error("브라우저에서만 지도를 사용할 수 있습니다."))
  }
  if (!appKey) {
    return Promise.reject(
      new Error("NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY가 설정되지 않았습니다.")
    )
  }
  if (window.kakao?.maps) {
    return new Promise((resolve) => {
      window.kakao!.maps.load(() => resolve())
    })
  }
  if (scriptPromise) return scriptPromise

  const src = `${KAKAO_MAPS_SCRIPT}?appkey=${encodeURIComponent(appKey)}&autoload=false`

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src^="${KAKAO_MAPS_SCRIPT}"]`
    )
    if (existing) {
      existing.addEventListener(
        "load",
        () => {
          window.kakao?.maps.load(() => resolve())
        },
        { once: true }
      )
      existing.addEventListener(
        "error",
        () => reject(new Error("카카오맵을 불러오지 못했습니다.")),
        { once: true }
      )
      return
    }

    const script = document.createElement("script")
    script.src = src
    script.async = true
    script.onload = () => {
      window.kakao?.maps.load(() => resolve())
    }
    script.onerror = () => reject(new Error("카카오맵을 불러오지 못했습니다."))
    document.head.appendChild(script)
  })

  return scriptPromise
}

export function createKakaoMarkerHtml(): string {
  return `<div style="width:16px;height:16px;border-radius:50%;background:#64b869;border:2px solid #fff;box-shadow:0 0 10px #64b869"></div>`
}

/** 카카오 level 3 ≈ zoom 16 */
export const KAKAO_MAP_LEVEL = 3
