import type { LoggedNutrition } from "@/lib/food-nutrition-utils"
import type { NutritionDataQuality } from "@/lib/food-nutrition-quality"
import type { FoodMealSlotId } from "@/lib/meal-slot-targets"
import type {
  IntendedMealSlot,
  MealTargetRange,
} from "@/lib/recommendation-meal-targets"
import type {
  MealTiming,
  NutritionGoal,
  RecommendationIntensity,
  TrainingStatus,
} from "@/lib/food-recommendation-strategy"

export type MealContext =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack"
  | "pre_workout"
  | "post_workout"

export type TrainingIntensity = "low" | "medium" | "high" | "none"

export type RecommendFoodsRequest = {
  targets: {
    calories: number
    proteinG: number
    carbsG: number
    fatG: number
    fiberG?: number
    sodiumMg?: number
    sugarG?: number
  }
  consumed: LoggedNutrition
  /** @deprecated mealTiming 사용 권장 */
  mealContext?: MealContext
  hasTrainingToday?: boolean
  trainingIntensity?: TrainingIntensity
  goal?: NutritionGoal
  trainingStatus?: TrainingStatus
  mealTiming?: MealTiming
  intensity?: RecommendationIntensity
  recentFoodIds?: string[]
  recentRecommendationIds?: string[]
  variantSeed?: number
  /** 태그 클릭 시 해당 영양소 맞춤 추천 우선 */
  recommendationFocus?:
    | "protein-low"
    | "fiber-low"
    | "calorie-low"
    | "carbs-low"
    | "sugar-warn"
    | "fat-warn"
    | "sodium-warn"
    | "calorie-high"
    | "excess_control"
    | "deficit_fill"
}

export type RecommendFoodItem = {
  id: string
  nameKo: string
  category: string
  amountG: number
  calories: number
  protein: number
  carbs: number | null
  fat: number | null
  fiber: number
  sodium: number | null
  sugar: number | null
  dataQuality?: NutritionDataQuality
}

export type RecommendFoodCombo = {
  id: string
  title: string
  reason: string
  type: "meal_combo"
  level: string
  situation: string
  recommendedPurpose: string
  intendedMealSlot: IntendedMealSlot
  applyMealSlotId: FoodMealSlotId
  recommendedSlotLabel: string
  evaluationCriteria: {
    label: string
    badge: string
  }
  targetRange: MealTargetRange
  goalMode?: string
  tags: string[]
  items: RecommendFoodItem[]
  total: {
    calories: number
    protein: number
    carbs: number | null
    fat: number | null
    fiber: number
    sodium: number | null
  }
}

export type NutritionDeficitAnalysis = {
  calorieGap: number
  proteinGap: number
  carbsGap: number
  fatGap: number
  fiberGap: number
  sodiumExcess: number
  sugarExcess: number
  flags: string[]
}

export type DeficitChip = {
  label: string
  severity: "warn" | "caution" | "ok" | "good"
}

export type RecommendationPipelineStats = {
  totalFoodItems: number
  baseCandidateCount: number
  afterHardFilterCount: number
  afterQualityFilterCount?: number
  afterScoringCount: number
  finalCandidateCount: number
  selectedRecommendationCount: number
  appliedFilters: string[]
  fetchMethods?: string[]
  relaxed: boolean
  relaxationNotes?: string[]
}

export type RecommendationSection = {
  id: string
  title: string
  description: string
  combos: RecommendFoodCombo[]
}

export type NutritionQualityStatus = import("@/lib/nutrition-quality-analysis").NutritionQualityStatus

export type DietQualityEvaluationResponse = RecommendFoodsResponse & {
  quality: NutritionQualityStatus
  sections: RecommendationSection[]
}

export type RecommendFoodsResponse = {
  recommendations: RecommendFoodCombo[]
  analysis: NutritionDeficitAnalysis
  mealContext: MealContext
  /** @deprecated pipeline.afterScoringCount 사용 권장 */
  candidateCount: number
  relaxed?: boolean
  pipeline?: RecommendationPipelineStats
  pipelineMessages?: string[]
  mode: string
  trainingStatus: string
  mealTiming: string
  intensity: string
  summary: string
  strategy: {
    title: string
    guidance: string
  }
  deficits: DeficitChip[]
}

export type FoodCandidate = {
  id: string
  nameKo: string
  category: string
  representativeName: string | null
  pieceWeightG: number
  per100g: {
    calories: number | null
    carbsG: number | null
    proteinG: number | null
    fatG: number | null
    sodiumMg: number | null
    sugarG?: number | null
    fiberG?: number | null
  }
  bucket: RecommendationBucket
  proteinVariant?: string
  dataQuality: NutritionDataQuality
  dataQualityReasons?: string[]
}

export type RecommendationBucket =
  | "korean_meal"
  | "high_protein"
  | "fish_seafood"
  | "egg_tofu_bean"
  | "carbs_starch"
  | "soup_stew"
  | "salad_veggie"
  | "convenience"
  | "post_workout"
  | "light_dinner"
  | "fiber"
  | "fruit"
  | "dairy_yogurt"

export type ScoredCandidate = FoodCandidate & {
  score: number
  role: "protein" | "carb" | "veg" | "fat" | "side" | "any"
}
