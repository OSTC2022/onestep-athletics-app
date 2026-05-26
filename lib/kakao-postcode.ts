const KAKAO_POSTCODE_SCRIPT =
  "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"

export interface KakaoPostcodeData {
  zonecode: string
  roadAddress: string
  jibunAddress: string
  buildingName: string
  apartment: string
  bname: string
  userSelectedType: "R" | "J"
}

export interface AddressSearchResult {
  name: string
  address: string
  zonecode: string
  lat?: number
  lng?: number
}

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: KakaoPostcodeData) => void
        onclose?: (state: "FORCE_CLOSE" | "COMPLETE_CLOSE") => void
        width?: string | number
        height?: string | number
      }) => {
        open: (options?: { popupKey?: string; popupTitle?: string }) => void
        embed: (element: HTMLElement, options?: { q?: string }) => void
      }
    }
  }
}

let scriptPromise: Promise<void> | null = null

export function loadKakaoPostcodeScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("브라우저에서만 주소 검색을 사용할 수 있습니다."))
  }
  if (window.daum?.Postcode) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${KAKAO_POSTCODE_SCRIPT}"]`
    )
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true })
      existing.addEventListener(
        "error",
        () => reject(new Error("주소 검색 스크립트를 불러오지 못했습니다.")),
        { once: true }
      )
      return
    }

    const script = document.createElement("script")
    script.src = KAKAO_POSTCODE_SCRIPT
    script.async = true
    script.onload = () => resolve()
    script.onerror = () =>
      reject(new Error("주소 검색 스크립트를 불러오지 못했습니다."))
    document.head.appendChild(script)
  })

  return scriptPromise
}

export function parseKakaoPostcodeData(
  data: KakaoPostcodeData
): AddressSearchResult {
  const address =
    data.userSelectedType === "R" && data.roadAddress
      ? data.roadAddress
      : data.jibunAddress || data.roadAddress

  const name =
    data.buildingName?.trim() ||
    data.apartment?.trim() ||
    data.bname?.trim() ||
    ""

  return {
    name,
    address,
    zonecode: data.zonecode,
  }
}

export function openKakaoPostcodePopup(
  onComplete: (result: AddressSearchResult) => void
): Promise<void> {
  return loadKakaoPostcodeScript().then(() => {
    if (!window.daum?.Postcode) {
      throw new Error("주소 검색을 초기화하지 못했습니다.")
    }
    new window.daum.Postcode({
      oncomplete: (data) => onComplete(parseKakaoPostcodeData(data)),
    }).open({ popupTitle: "주소 검색" })
  })
}

export function embedKakaoPostcode(
  element: HTMLElement,
  onComplete: (result: AddressSearchResult) => void
): Promise<void> {
  return loadKakaoPostcodeScript().then(() => {
    if (!window.daum?.Postcode) {
      throw new Error("주소 검색을 초기화하지 못했습니다.")
    }
    element.innerHTML = ""
    new window.daum.Postcode({
      oncomplete: (data) => onComplete(parseKakaoPostcodeData(data)),
      width: "100%",
      height: "100%",
    }).embed(element)
  })
}
