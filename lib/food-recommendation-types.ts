import type { LoggedNutrition } from "@/lib/food-nutrition-utils"
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
}

export type RecommendFoodItem = {
  id: string
  nameKo: string
  category: string
  amountG: number
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sodium: number
  sugar: number
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
    carbs: number
    fat: number
    fiber: number
    sodium: number
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

export type RecommendFoodsResponse = {
  recommendations: RecommendFoodCombo[]
  analysis: NutritionDeficitAnalysis
  mealContext: MealContext
  candidateCount: number
  relaxed?: boolean
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
    calories: number
    carbsG: number
    proteinG: number
    fatG: number
    sodiumMg: number
    sugarG?: number
    fiberG?: number
  }
  bucket: RecommendationBucket
  proteinVariant?: string
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
