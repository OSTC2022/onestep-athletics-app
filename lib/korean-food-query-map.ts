import { normalizeFoodSearchQuery } from "@/lib/korean-food-search-normalizer"

export type KoreanFoodQueryMapEntry = {
  /** DB에서 찾을 음식명 (우선순위 순) */
  targets: string[]
  /** USDA 등 외부 API 검색어 */
  externalQueries?: string[]
  /** 복합 검색어 분해 토큰 */
  tokens?: string[]
}

/**
 * 한국어 음식 백과사전형 fallback/query map
 * 키: 정규화된 검색어
 */
export const KOREAN_FOOD_QUERY_MAP: Record<string, KoreanFoodQueryMapEntry> = {
  빠네: {
    targets: ["빠네파스타", "크림파스타", "파스타", "스파게티(삶은)"],
    externalQueries: ["cream pasta", "bread bowl pasta", "pasta"],
  },
  ppane: {
    targets: ["빠네파스타", "크림파스타", "파스타", "스파게티(삶은)"],
    externalQueries: ["cream pasta", "bread bowl pasta", "pasta"],
  },
  pane: {
    targets: ["빠네파스타", "크림파스타", "파스타"],
    externalQueries: ["cream pasta", "pasta"],
  },
  능이백숙: {
    targets: ["백숙", "닭백숙", "한방백숙"],
    externalQueries: ["boiled chicken soup", "samgyetang"],
    tokens: ["능이", "백숙"],
  },
  오리백숙: {
    targets: ["오리백숙", "백숙"],
    externalQueries: ["duck soup", "duck baeksuk"],
    tokens: ["오리", "백숙"],
  },
  한방백숙: {
    targets: ["한방백숙", "백숙", "닭백숙"],
    externalQueries: ["herbal chicken soup"],
  },
  참치김치찌개: {
    targets: ["참치김치찌개", "김치찌개"],
    externalQueries: ["kimchi stew", "tuna kimchi jjigae"],
    tokens: ["참치", "김치찌개"],
  },
  돼지고기김치찌개: {
    targets: ["돼지고기김치찌개", "김치찌개"],
    externalQueries: ["pork kimchi stew", "kimchi jjigae"],
    tokens: ["돼지고기", "김치찌개"],
  },
  차돌된장찌개: {
    targets: ["된장찌개", "차돌된장찌개"],
    externalQueries: ["soybean paste stew", "doenjang jjigae"],
    tokens: ["차돌", "된장찌개"],
  },
  소고기미역국: {
    targets: ["소고기미역국", "미역국"],
    externalQueries: ["seaweed soup", "miyeok guk"],
    tokens: ["소고기", "미역국"],
  },
  새우볶음밥: {
    targets: ["새우볶음밥", "볶음밥"],
    externalQueries: ["fried rice", "shrimp fried rice"],
    tokens: ["새우", "볶음밥"],
  },
  치즈라면: {
    targets: ["치즈라면", "라면", "컵라면"],
    externalQueries: ["instant noodles", "cheese ramen"],
    tokens: ["치즈", "라면"],
  },
  순대국밥: {
    targets: ["순대국밥", "국밥"],
    externalQueries: ["sundae gukbap", "pork soup"],
    tokens: ["순대", "국밥"],
  },
  돼지국밥: {
    targets: ["국밥", "국밥(돼지)", "돼지국밥"],
    externalQueries: ["pork gukbap", "pork soup"],
  },
  제육볶음: {
    targets: ["제육볶음", "제육덮밥"],
    externalQueries: ["spicy pork", "stir fried pork", "jeyuk bokkeum"],
  },
  제육: {
    targets: ["제육볶음", "제육덮밥"],
    externalQueries: ["spicy pork", "stir fried pork"],
  },
  감자탕: {
    targets: ["감자탕"],
    externalQueries: ["pork backbone soup", "gamjatang"],
  },
  떡볶이: {
    targets: ["떡볶이", "즉석떡볶이", "국물떡볶이"],
    externalQueries: ["tteokbokki", "spicy rice cake"],
  },
  닭가슴살샐러드: {
    targets: ["닭가슴살 샐러드", "닭가슴살(삶은)", "샐러드", "시저샐러드"],
    externalQueries: ["chicken breast salad", "grilled chicken salad"],
    tokens: ["닭가슴살", "샐러드"],
  },
  닭가슴살: {
    targets: ["닭가슴살(삶은)", "닭가슴살 샐러드"],
    externalQueries: ["chicken breast", "grilled chicken breast"],
  },
  샐러드: {
    targets: ["닭가슴살 샐러드", "시저샐러드"],
    externalQueries: ["salad", "green salad"],
  },
  크림리조또: {
    targets: ["크림리조또", "리조또", "크림파스타"],
    externalQueries: ["cream risotto", "risotto"],
    tokens: ["크림", "리조또"],
  },
  리조또: {
    targets: ["리조또", "크림리조또"],
    externalQueries: ["risotto", "cream risotto"],
  },
}

/** 한국어 → 영어 음식명 (외부 API용) */
export const KO_TO_EN_FOOD: Record<string, string> = {
  빠네: "cream pasta",
  파스타: "pasta",
  크림파스타: "cream pasta",
  빠네파스타: "cream pasta",
  백숙: "boiled chicken soup",
  김치찌개: "kimchi stew",
  된장찌개: "soybean paste stew",
  미역국: "seaweed soup",
  볶음밥: "fried rice",
  라면: "instant noodles",
  국밥: "korean gukbap soup",
  제육볶음: "spicy stir fried pork",
  감자탕: "pork backbone soup",
  떡볶이: "tteokbokki",
  닭가슴살: "chicken breast",
  샐러드: "salad",
  리조또: "risotto",
  크림리조또: "cream risotto",
  닭가슴살샐러드: "chicken breast salad",
}

/** 복합어 접미사 → 기본형 */
export const KOREAN_FOOD_BASE_SUFFIXES = [
  "김치볶음밥",
  "김치찌개",
  "된장찌개",
  "순두부찌개",
  "부대찌개",
  "청국장찌개",
  "미역국",
  "순대국밥",
  "국밥",
  "볶음밥",
  "백숙",
  "리조또",
  "샐러드",
  "라면",
  "파스타",
  "비빔밥",
  "덮밥",
  "칼국수",
  "삼계탕",
  "갈비탕",
  "설렁탕",
].sort((a, b) => b.length - a.length)

/** 토큰 분해용 음식 단어 */
export const KOREAN_FOOD_SEARCH_TOKENS = [
  ...Object.keys(KO_TO_EN_FOOD),
  ...KOREAN_FOOD_BASE_SUFFIXES,
  "닭가슴살",
  "돼지고기",
  "소고기",
  "닭고기",
  "참치",
  "새우",
  "치즈",
  "크림",
  "능이",
  "오리",
  "한방",
  "차돌",
  "순대",
  "감자",
  "제육",
  "시저",
]

export function getKoreanFoodQueryMapEntry(
  rawQuery: string
): KoreanFoodQueryMapEntry | null {
  const q = normalizeFoodSearchQuery(rawQuery)
  if (!q) return null

  if (KOREAN_FOOD_QUERY_MAP[q]) return KOREAN_FOOD_QUERY_MAP[q]

  for (const [key, entry] of Object.entries(KOREAN_FOOD_QUERY_MAP)) {
    const nk = normalizeFoodSearchQuery(key)
    if (q.includes(nk) || nk.includes(q)) return entry
  }

  return null
}

export function getExternalSearchQueries(rawQuery: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const add = (value?: string) => {
    const v = value?.trim()
    if (!v) return
    const key = v.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push(v)
  }

  const entry = getKoreanFoodQueryMapEntry(rawQuery)
  entry?.externalQueries?.forEach(add)

  const q = normalizeFoodSearchQuery(rawQuery)
  add(KO_TO_EN_FOOD[q])

  for (const [ko, en] of Object.entries(KO_TO_EN_FOOD)) {
    if (q.includes(normalizeFoodSearchQuery(ko))) add(en)
  }

  if (isLatinQuery(rawQuery)) add(rawQuery.trim())

  return out
}

function isLatinQuery(text: string): boolean {
  return /[a-zA-Z]/.test(text) && !/[\uAC00-\uD7A3]/.test(text)
}
