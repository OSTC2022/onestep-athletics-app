import type { FoodNutritionPer100g } from "@/lib/food-database"
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
}

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
  return {
    id: row.id,
    nameKo: row.name_ko,
    category: row.category,
    representativeName: row.representative_name,
    pieceWeightG: row.piece_weight_g ?? 100,
    per100g: {
      calories: row.per100g.calories ?? 0,
      carbsG: row.per100g.carbsG ?? 0,
      proteinG: row.per100g.proteinG ?? 0,
      fatG: row.per100g.fatG ?? 0,
      sodiumMg: row.per100g.sodiumMg ?? 0,
      sugarG: row.per100g.sugarG,
      fiberG: row.per100g.fiberG,
    },
    bucket,
    proteinVariant: proteinVariant(row.name_ko),
  }
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
    .select(
      "id, name_ko, category, representative_name, piece_weight_g, per100g"
    )
    .or(filters)
    .limit(limit)

  if (error || !data) {
    console.error("[fetchFoodCandidates]", error?.message)
    return []
  }

  return data as FoodItemRow[]
}

/** Supabase food_items에서 추천 후보 수집 (서버 전용) */
export async function fetchRecommendationCandidates(
  buckets: RecommendationBucket[],
  limitPerBucket = 35
): Promise<FoodCandidate[]> {
  const seen = new Set<string>()
  const results: FoodCandidate[] = []

  for (const bucket of buckets) {
    const keywords = BUCKET_KEYWORDS[bucket] ?? []
    const rows = await fetchByKeywords(keywords.slice(0, 6), limitPerBucket)
    for (const row of rows) {
      if (seen.has(row.id)) continue
      if ((row.per100g?.calories ?? 0) <= 0) continue
      seen.add(row.id)
      const assigned = classifyBucket(row.name_ko, row.category)
      results.push(rowToCandidate(row, assigned))
    }
  }

  return results
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
