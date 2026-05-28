import type { FoodNutritionPer100g } from "@/lib/food-database"

export type NutritionDataQuality = "complete" | "partial" | "suspicious" | "invalid"

export type NutritionQualityAssessment = {
  quality: NutritionDataQuality
  reasons: string[]
  macroCalories: number | null
  calorieGap: number | null
}

/** 엄격한 감량식 대표 추천에서 제외할 음식명 키워드 */
export const STRICT_DIET_EXCLUDE_KEYWORDS = [
  "피자",
  "치킨",
  "튀김",
  "돈까스",
  "돈가스",
  "버거",
  "케이크",
  "디저트",
  "쿠키",
  "초콜릿",
  "초코",
  "라면",
  "짜장",
  "크림",
  "치즈",
  "마요",
  "마요네즈",
  "갈비",
  "삼겹",
  "소시지",
  "햄",
  "베이컨",
  "핫도그",
  "떡볶",
  "순대",
  "호떡",
  "붕어빵",
  "와플",
  "도넛",
  "아이스크림",
  "푸딩",
  "마카롱",
  "타코",
  "나초",
] as const

/** 현실적 다이어트에서도 단독 대표 추천은 피할 키워드 (조합 조절식만 허용) */
export const INDULGENT_FOOD_KEYWORDS = [...STRICT_DIET_EXCLUDE_KEYWORDS] as const

export function isPresentMacro(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value)
}

export function macroCaloriesFromMacros(
  proteinG: number | null | undefined,
  carbsG: number | null | undefined,
  fatG: number | null | undefined
): number | null {
  const p = isPresentMacro(proteinG) ? proteinG : 0
  const c = isPresentMacro(carbsG) ? carbsG : 0
  const f = isPresentMacro(fatG) ? fatG : 0
  if (!isPresentMacro(proteinG) && !isPresentMacro(carbsG) && !isPresentMacro(fatG)) {
    return null
  }
  return p * 4 + c * 4 + f * 9
}

export function matchesFoodKeyword(name: string, keywords: readonly string[]): boolean {
  const normalized = name.replace(/\s+/g, "").toLowerCase()
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))
}

export function isStrictDietExcludedFood(nameKo: string, category = ""): boolean {
  const text = `${nameKo} ${category}`
  return matchesFoodKeyword(text, STRICT_DIET_EXCLUDE_KEYWORDS)
}

export function isIndulgentFood(nameKo: string, category = ""): boolean {
  const text = `${nameKo} ${category}`
  return matchesFoodKeyword(text, INDULGENT_FOOD_KEYWORDS)
}

export function assessNutritionDataQuality(
  per100g: FoodNutritionPer100g,
  nameKo: string,
  category = ""
): NutritionQualityAssessment {
  const reasons: string[] = []
  const calories = per100g.calories
  const carbsG = per100g.carbsG
  const proteinG = per100g.proteinG
  const fatG = per100g.fatG
  const sodiumMg = per100g.sodiumMg

  const hasCalories = isPresentMacro(calories) && calories > 0
  const hasProtein = isPresentMacro(proteinG)
  const hasCarbs = isPresentMacro(carbsG)
  const hasFat = isPresentMacro(fatG)
  const hasSodium = isPresentMacro(sodiumMg)

  if (!hasCalories) {
    return {
      quality: "invalid",
      reasons: ["칼로리 없음"],
      macroCalories: null,
      calorieGap: null,
    }
  }

  const carbsZero = hasCarbs && carbsG === 0
  const fatZero = hasFat && fatG === 0
  const carbsMissing = !hasCarbs
  const fatMissing = !hasFat
  const indulgent = isIndulgentFood(nameKo, category)

  const macroCalories = macroCaloriesFromMacros(proteinG, carbsG, fatG)
  const calorieGap =
    macroCalories != null && hasCalories ? Math.abs(calories - macroCalories) : null

  if (calories > 900) {
    reasons.push("칼로리 비정상(900kcal/100g 초과)")
    return { quality: "invalid", reasons, macroCalories, calorieGap }
  }

  if (
    calories > 250 &&
    (carbsZero || carbsMissing) &&
    (fatZero || fatMissing)
  ) {
    reasons.push("고칼로리인데 탄수·지방 정보 없음/0")
    return { quality: "invalid", reasons, macroCalories, calorieGap }
  }

  if (calories > 150 && carbsZero && fatZero) {
    reasons.push("탄수·지방 모두 0g인데 칼로리 높음")
    return { quality: "suspicious", reasons, macroCalories, calorieGap }
  }

  if (indulgent && (carbsZero || fatZero || carbsMissing || fatMissing)) {
    reasons.push("가공/간식류인데 탄수·지방 데이터 이상")
    return { quality: "suspicious", reasons, macroCalories, calorieGap }
  }

  if (macroCalories != null && hasCalories) {
    if (calories >= 200 && macroCalories < 80) {
      reasons.push("탄단지 합산 칼로리가 표시 칼로리 대비 너무 낮음")
      return { quality: "suspicious", reasons, macroCalories, calorieGap }
    }
    if (calorieGap != null && calorieGap > Math.max(120, calories * 0.45)) {
      reasons.push("탄단지-칼로리 불일치")
      return { quality: "suspicious", reasons, macroCalories, calorieGap }
    }
  }

  const missingCore = [hasProtein, hasCarbs, hasFat].filter((v) => !v).length
  if (missingCore >= 2) {
    reasons.push("핵심 영양소(단백·탄수·지방) 정보 부족")
    return { quality: "partial", reasons, macroCalories, calorieGap }
  }

  if (!hasSodium) {
    reasons.push("나트륨 정보 없음")
    return { quality: "partial", reasons, macroCalories, calorieGap }
  }

  if (missingCore === 1) {
    reasons.push("일부 영양소 정보 없음")
    return { quality: "partial", reasons, macroCalories, calorieGap }
  }

  return { quality: "complete", reasons, macroCalories, calorieGap }
}

export function shouldExcludeFromRecommendationPool(
  assessment: NutritionQualityAssessment,
  options: {
    intensity?: string
    strictData?: boolean
  } = {}
): boolean {
  if (assessment.quality === "invalid") return true
  if (assessment.quality === "suspicious") return true
  if (options.strictData && assessment.quality === "partial") return true
  if (
    options.intensity === "strict_loss" &&
    assessment.quality === "partial"
  ) {
    return true
  }
  return false
}

export function strictDietFoodPenalty(
  nameKo: string,
  category: string,
  intensity: string | undefined
): number {
  if (!isIndulgentFood(nameKo, category)) return 0
  if (intensity === "strict_loss" || intensity === "aggressive_diet") {
    return -500
  }
  if (intensity === "realistic_diet") {
    return -80
  }
  return -35
}
