import type { ExternalFoodSearchResult } from "@/lib/external-food-types"
import type { ExternalFoodItem } from "@/lib/external-food-store"
import {
  saveExternalFoodFromSearchResult,
  searchResultToExternalFoodItem,
} from "@/lib/external-food-store"
import { localizeExternalFoodSearchResult } from "@/lib/food-name-localize"

type ExternalSearchResponse = {
  results?: ExternalFoodSearchResult[]
  error?: string
  message?: string
}

type CacheFoodResponse = {
  food?: ExternalFoodSearchResult
  error?: string
}

/**
 * 외부 음식 검색 — 반드시 서버 API route(/api/search-food)를 통해서만 호출합니다.
 * API KEY는 서버 환경변수에서만 읽히며 클라이언트에 노출되지 않습니다.
 */
export async function fetchExternalFoodSearch(
  query: string,
  fallbackQueries: string[] = []
): Promise<{
  results: ExternalFoodSearchResult[]
  displayMessage?: string
}> {
  const tried = new Set<string>()
  const queries: string[] = []

  for (const q of [query.trim(), ...fallbackQueries.map((s) => s.trim())]) {
    if (!q) continue
    const key = q.toLowerCase()
    if (tried.has(key)) continue
    tried.add(key)
    queries.push(q)
  }

  let lastMessage: string | undefined

  for (const q of queries) {
    const res = await fetch(
      `/api/search-food?query=${encodeURIComponent(q)}`
    )

    const data = (await res.json()) as ExternalSearchResponse

    if (!res.ok) {
      lastMessage =
        data.message ??
        "공식 DB와 외부 API에서 찾지 못했습니다. 직접 추가해 주세요."
      continue
    }

    const results = (data.results ?? []).map(localizeExternalFoodSearchResult)

    if (results.length > 0) {
      return { results }
    }

    if (data.message) {
      lastMessage = data.message
    } else if (data.error === "not_found") {
      lastMessage =
        "공식 DB와 외부 API에서 찾지 못했습니다. 직접 추가해 주세요."
    }
  }

  return {
    results: [],
    displayMessage:
      lastMessage ??
      "공식 DB와 외부 API에서 찾지 못했습니다. 직접 추가해 주세요.",
  }
}

/**
 * 외부 검색 결과 선택 시 Supabase external_food_cache에 저장하고
 * 로컬 localStorage에도 미러링합니다.
 */
export async function cacheAndSaveExternalFood(
  result: ExternalFoodSearchResult,
  searchQuery: string
): Promise<ExternalFoodItem> {
  if (result.source === "official") {
    const local = searchResultToExternalFoodItem(result)
    saveExternalFoodFromSearchResult(result)
    return local
  }

  if (result.id && result.source === "cache") {
    const local = searchResultToExternalFoodItem(result)
    saveExternalFoodFromSearchResult(result)
    void fetch("/api/search-food/cache", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: result.id }),
    })
    return local
  }

  const res = await fetch("/api/search-food/cache", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: result.name,
      nameEn: result.nameEn,
      category: result.category,
      aliases: result.aliases,
      per100g: result.per100g,
      source: result.source,
      externalId: result.externalId,
      searchQuery,
      servingLabel: result.servingLabel,
      pieceWeightG: result.pieceWeightG,
    }),
  })

  const data = (await res.json()) as CacheFoodResponse

  if (!res.ok || !data.food) {
    return saveExternalFoodFromSearchResult(result)
  }

  return saveExternalFoodFromSearchResult(data.food)
}
