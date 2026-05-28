import type { FoodNutritionPer100g } from "@/lib/food-database"
import {
  assessNutritionDataQuality,
  type NutritionDataQuality,
} from "@/lib/food-nutrition-quality"
import type {
  FoodCandidate,
  RecommendationBucket,
} from "@/lib/food-recommendation-types"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { proteinVariant } from "@/lib/food-recommendation-strategy"

type FoodItemRow = {
  id: string
  name_ko: string
  category: string
  representative_name: string | null
  piece_weight_g: number | null
  per100g: FoodNutritionPer100g
  metadata?: Record<string, unknown> | null
}

export type CandidateFetchStats = {
  totalFoodItems: number
  baseCandidateCount: number
  afterHardFilterCount: number
  appliedFilters: string[]
  fetchMethods: string[]
}

export type CandidateFetchResult = {
  candidates: FoodCandidate[]
  stats: CandidateFetchStats
}

const FOOD_SELECT =
  "id, name_ko, category, representative_name, piece_weight_g, per100g, metadata"

const ALL_BUCKETS: RecommendationBucket[] = [
  "korean_meal",
  "high_protein",
  "fish_seafood",
  "egg_tofu_bean",
  "carbs_starch",
  "soup_stew",
  "salad_veggie",
  "convenience",
  "post_workout",
  "light_dinner",
  "fiber",
  "fruit",
  "dairy_yogurt",
]

const BUCKET_KEYWORDS: Record<RecommendationBucket, string[]> = {
  korean_meal: ["밥", "덮밥", "비빔", "볶음", "제육", "불고기", "김치", "된장", "국밥"],
  egg_tofu_bean: ["계란", "달걀", "두부", "콩", "두유", "순두부", "렌틸", "병아리"],
  carbs_starch: ["현미", "밥", "고구마", "감자", "오트", "귀리", "빵", "면", "국수", "잡곡"],
  soup_stew: ["국", "찌개", "탕", "전골", "미역", "된장"],
  salad_veggie: ["샐러드", "채소", "야채", "나물", "브로콜리", "시금치", "상추"],
  convenience: ["삼각", "김밥", "도시락", "편의", "프로틴", "바", "삶은계란"],
  post_workout: ["바나나", "우유", "요거트", "프로틴", "쉐이크", "초코"],
  light_dinner: ["두부", "샐러드", "계란", "고구마", "야채", "닭가슴"],
  fiber: ["현미", "귀리", "보리", "콩", "브로콜리", "사과", "배", "김치", "고구마"],
  fruit: ["사과", "바나나", "베리", "과일", "키위", "블루"],
  dairy_yogurt: ["그릭", "요거트", "우유", "치즈"],
  high_protein: [
    "닭가슴",
    "닭",
    "소고기",
    "돼지",
    "안심",
    "육",
    "치킨",
    "스테이크",
    "훈제",
  ],
  fish_seafood: ["연어", "고등어", "참치", "새우", "오징어", "생선", "회", "명태"],
}

/** DB 전체 페이지 샘플 — 키워드에 안 걸리는 음식도 포함 */
const PAGINATED_SLICES: Array<{ offset: number; limit: number }> = [
  { offset: 0, limit: 1200 },
  { offset: 12000, limit: 1200 },
  { offset: 28000, limit: 1200 },
  { offset: 45000, limit: 1200 },
]

const RELAXED_PAGINATED_SLICES: Array<{ offset: number; limit: number }> = [
  { offset: 0, limit: 1500 },
  { offset: 8000, limit: 1500 },
  { offset: 18000, limit: 1500 },
  { offset: 32000, limit: 1500 },
  { offset: 48000, limit: 1500 },
  { offset: 62000, limit: 1500 },
]

const HARD_FILTER_LABELS = [
  "칼로리 0 이하",
  "핵심 영양값 없음",
  "이름 분석 불가",
  "1회 제공량 비정상",
  "칼로리 비정상(900kcal/100g 초과)",
  "영양 데이터 invalid/suspicious",
]

function normalizePer100g(raw: FoodNutritionPer100g | null | undefined): FoodCandidate["per100g"] {
  const p = raw ?? ({} as FoodNutritionPer100g)
  return {
    calories: p.calories ?? null,
    carbsG: p.carbsG ?? null,
    proteinG: p.proteinG ?? null,
    fatG: p.fatG ?? null,
    sodiumMg: p.sodiumMg ?? null,
    sugarG: p.sugarG ?? null,
    fiberG: p.fiberG ?? null,
  }
}

function qualityFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): NutritionDataQuality | null {
  const q = metadata?.nutritionDataQuality
  if (q === "complete" || q === "partial" || q === "suspicious" || q === "invalid") {
    return q
  }
  return null
}

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, "")
}

function classifyBucket(name: string, category: string): RecommendationBucket {
  const text = `${name} ${category}`
  for (const [bucket, keywords] of Object.entries(BUCKET_KEYWORDS) as Array<
    [RecommendationBucket, string[]]
  >) {
    if (keywords.some((k) => text.includes(k))) return bucket
  }
  if (category.includes("육") || category.includes("고기")) return "high_protein"
  if (category.includes("어") || category.includes("해")) return "fish_seafood"
  if (category.includes("채소") || category.includes("나물")) return "salad_veggie"
  return "korean_meal"
}

function rowToCandidate(row: FoodItemRow, bucket: RecommendationBucket): FoodCandidate {
  const per100g = normalizePer100g(row.per100g)
  const cachedQuality = qualityFromMetadata(row.metadata)
  const assessment =
    cachedQuality != null
      ? {
          quality: cachedQuality,
          reasons: Array.isArray(row.metadata?.nutritionQualityReasons)
            ? (row.metadata!.nutritionQualityReasons as string[])
            : [],
        }
      : assessNutritionDataQuality(per100g, row.name_ko, row.category)

  return {
    id: row.id,
    nameKo: row.name_ko,
    category: row.category,
    representativeName: row.representative_name,
    pieceWeightG: row.piece_weight_g ?? 100,
    per100g,
    bucket,
    proteinVariant: proteinVariant(row.name_ko),
    dataQuality: assessment.quality,
    dataQualityReasons: assessment.reasons,
  }
}

export function passesHardFilter(row: FoodItemRow): boolean {
  const name = row.name_ko?.trim() ?? ""
  if (name.length < 2) return false
  if (/^[\d\s\-_.·]+$/.test(name)) return false

  const p = normalizePer100g(row.per100g)
  const calories = p.calories ?? 0
  const protein = p.proteinG
  const carbs = p.carbsG
  const fat = p.fatG

  const hasAnyNutrient =
    calories > 0 ||
    (protein != null && protein > 0) ||
    (carbs != null && carbs > 0) ||
    (fat != null && fat > 0)
  if (!hasAnyNutrient) return false
  if (calories <= 0) return false
  if (calories > 900) return false

  const pieceWeight = row.piece_weight_g ?? 100
  if (pieceWeight <= 0 || pieceWeight > 5000) return false

  const assessment = assessNutritionDataQuality(p, row.name_ko, row.category)
  if (assessment.quality === "invalid" || assessment.quality === "suspicious") {
    return false
  }

  return true
}

export async function countTotalFoodItems(): Promise<number> {
  const supabase = getSupabaseAdmin()
  if (!supabase) return 0

  const { count, error } = await supabase
    .from("food_items")
    .select("id", { count: "exact", head: true })

  if (error) {
    console.error("[countTotalFoodItems]", error.message)
    return 0
  }
  return count ?? 0
}

async function fetchByKeywords(
  keywords: string[],
  limit: number
): Promise<FoodItemRow[]> {
  const supabase = getSupabaseAdmin()
  if (!supabase || keywords.length === 0) return []

  const filters = keywords
    .flatMap((k) => {
      const p = `%${escapeIlike(k)}%`
      return [`name_ko.ilike.${p}`, `category.ilike.${p}`]
    })
    .join(",")

  const { data, error } = await supabase
    .from("food_items")
    .select(FOOD_SELECT)
    .or(filters)
    .limit(limit)

  if (error) {
    console.error("[fetchByKeywords]", error.message)
    return []
  }

  return data as FoodItemRow[]
}

async function fetchPaginatedBatch(
  offset: number,
  limit: number
): Promise<FoodItemRow[]> {
  const supabase = getSupabaseAdmin()
  if (!supabase) return []

  const end = offset + limit - 1
  const { data, error } = await supabase
    .from("food_items")
    .select(FOOD_SELECT)
    .order("id", { ascending: true })
    .range(offset, end)

  if (error) {
    console.error("[fetchPaginatedBatch]", error.message, { offset, limit })
    return []
  }

  return data as FoodItemRow[]
}

async function fetchByNutrientMin(
  nutrientKey: "proteinG" | "carbsG" | "fiberG",
  minValue: number,
  limit: number
): Promise<FoodItemRow[]> {
  const supabase = getSupabaseAdmin()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("food_items")
    .select(FOOD_SELECT)
    .filter("per100g->>calories", "gt", "0")
    .filter(`per100g->>${nutrientKey}`, "gte", String(minValue))
    .limit(limit)

  if (error) {
    console.warn(`[fetchByNutrientMin:${nutrientKey}]`, error.message)
    return []
  }

  return data as FoodItemRow[]
}

function mergeRows(
  seen: Set<string>,
  rows: FoodItemRow[],
  results: FoodCandidate[]
): number {
  let added = 0
  for (const row of rows) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    const assigned = classifyBucket(row.name_ko, row.category)
    results.push(rowToCandidate(row, assigned))
    added++
  }
  return added
}

export type FetchRecommendationOptions = {
  limitPerBucket?: number
  paginatedSlices?: Array<{ offset: number; limit: number }>
  includeNutrientQueries?: boolean
  includePaginated?: boolean
}

/** Supabase food_items에서 넓은 추천 후보 수집 (서버 전용) */
export async function fetchRecommendationCandidatesWide(
  buckets: RecommendationBucket[],
  options: FetchRecommendationOptions = {}
): Promise<CandidateFetchResult> {
  const limitPerBucket = options.limitPerBucket ?? 700
  const paginatedSlices =
    options.paginatedSlices ??
    (options.includePaginated === false ? [] : PAGINATED_SLICES)
  const includeNutrientQueries = options.includeNutrientQueries !== false

  const fetchMethods: string[] = []
  const [totalFoodItems, ...fetchGroups] = await Promise.all([
    countTotalFoodItems(),
    ...buckets.map((bucket) =>
      fetchByKeywords(BUCKET_KEYWORDS[bucket] ?? [], limitPerBucket).then(
        (rows) => ({ type: `bucket:${bucket}`, rows })
      )
    ),
    ...(paginatedSlices.length > 0
      ? paginatedSlices.map((slice) =>
          fetchPaginatedBatch(slice.offset, slice.limit).then((rows) => ({
            type: `paginated:${slice.offset}`,
            rows,
          }))
        )
      : []),
    ...(includeNutrientQueries
      ? [
          fetchByNutrientMin("proteinG", 8, 900).then((rows) => ({
            type: "nutrient:protein",
            rows,
          })),
          fetchByNutrientMin("carbsG", 12, 900).then((rows) => ({
            type: "nutrient:carbs",
            rows,
          })),
          fetchByNutrientMin("fiberG", 2, 700).then((rows) => ({
            type: "nutrient:fiber",
            rows,
          })),
        ]
      : []),
  ])

  const seen = new Set<string>()
  const rawMerged: FoodCandidate[] = []
  let baseCandidateCount = 0

  for (const group of fetchGroups) {
    const added = mergeRows(seen, group.rows, rawMerged)
    if (added > 0) fetchMethods.push(group.type)
    baseCandidateCount += group.rows.length
  }

  const candidates = rawMerged.filter((c) => {
    const row: FoodItemRow = {
      id: c.id,
      name_ko: c.nameKo,
      category: c.category,
      representative_name: c.representativeName,
      piece_weight_g: c.pieceWeightG,
      per100g: c.per100g,
    }
    return passesHardFilter(row)
  })

  return {
    candidates,
    stats: {
      totalFoodItems,
      baseCandidateCount,
      afterHardFilterCount: candidates.length,
      appliedFilters: HARD_FILTER_LABELS,
      fetchMethods,
    },
  }
}

/** @deprecated fetchRecommendationCandidatesWide 사용 */
export async function fetchRecommendationCandidates(
  buckets: RecommendationBucket[],
  limitPerBucket = 35
): Promise<FoodCandidate[]> {
  const result = await fetchRecommendationCandidatesWide(buckets, {
    limitPerBucket,
    includePaginated: false,
    includeNutrientQueries: false,
    paginatedSlices: [],
  })
  return result.candidates
}

export function getAllRecommendationBuckets(): RecommendationBucket[] {
  return [...ALL_BUCKETS]
}

export async function fetchRelaxedRecommendationCandidates(
  buckets: RecommendationBucket[]
): Promise<CandidateFetchResult> {
  return fetchRecommendationCandidatesWide(buckets, {
    limitPerBucket: 900,
    paginatedSlices: RELAXED_PAGINATED_SLICES,
    includeNutrientQueries: true,
    includePaginated: true,
  })
}

/** 부족 영양소에 맞는 버킷 우선순위 */
export function bucketsForFlags(flags: string[]): RecommendationBucket[] {
  const set = new Set<RecommendationBucket>([
    "korean_meal",
    "high_protein",
    "carbs_starch",
    "salad_veggie",
  ])

  if (flags.includes("protein_low")) {
    set.add("high_protein")
    set.add("egg_tofu_bean")
    set.add("fish_seafood")
  }
  if (flags.includes("calorie_low") || flags.includes("carbs_low")) {
    set.add("carbs_starch")
    set.add("korean_meal")
  }
  if (flags.includes("fiber_low")) {
    set.add("fiber")
    set.add("fruit")
    set.add("salad_veggie")
  }
  if (flags.includes("sodium_high")) {
    set.add("salad_veggie")
    set.add("fruit")
  }
  if (flags.includes("fat_high")) {
    set.add("salad_veggie")
    set.add("light_dinner")
  }
  if (flags.includes("post_workout")) {
    set.add("post_workout")
    set.add("carbs_starch")
    set.add("high_protein")
  }
  if (flags.includes("light_dinner")) {
    set.add("light_dinner")
    set.add("soup_stew")
  }
  if (flags.includes("convenience")) {
    set.add("convenience")
  }

  return [...set]
}
