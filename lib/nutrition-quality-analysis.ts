import type { LoggedNutrition } from "@/lib/food-nutrition-utils"
import {
  buildStrategyProfile,
  buildStrategySummary,
  labelForGoal,
  labelForMealTiming,
  labelForTraining,
  type NutritionStrategySettings,
} from "@/lib/food-recommendation-strategy"
import type {
  MealContext,
  NutritionDeficitAnalysis,
  RecommendFoodsRequest,
} from "@/lib/food-recommendation-types"
import { analyzeNutritionState } from "@/lib/nutrition-deficit-analysis"

export type NutrientStatusKind =
  | "deficit"
  | "adequate"
  | "excess"
  | "warning"
  | "sufficient"

export type NutrientStatusCard = {
  key: string
  label: string
  status: NutrientStatusKind
  detail: string
}

export type NutritionQualityStatus = {
  deficits: string[]
  excesses: string[]
  warnings: string[]
  adequate: string[]
  goalMode: string
  trainingStatus: string
  mealTiming: string
  coachSummary: string
  strategySummary: string
  statusCards: NutrientStatusCard[]
}

function statusForGap(
  gap: number,
  lowThreshold: number,
  highThreshold?: number
): NutrientStatusKind {
  if (gap > lowThreshold) return "deficit"
  if (highThreshold !== undefined && gap < -highThreshold) return "excess"
  if (gap >= -highThreshold! && gap <= lowThreshold) return "adequate"
  return "adequate"
}

function statusForExcess(excess: number, threshold: number): NutrientStatusKind {
  if (excess > threshold) return "warning"
  if (excess > threshold * 0.5) return "warning"
  return "adequate"
}

export function buildCoachSummary(
  analysis: NutritionDeficitAnalysis,
  settings: NutritionStrategySettings
): string {
  const parts: string[] = []

  if (analysis.flags.includes("protein_low")) parts.push("단백질")
  if (analysis.flags.includes("fiber_low")) parts.push("식이섬유")
  if (analysis.flags.includes("calorie_low")) parts.push("칼로리")
  if (analysis.flags.includes("carbs_low")) parts.push("탄수화물")

  const caution: string[] = []
  if (analysis.flags.includes("fat_high")) caution.push("지방")
  if (analysis.flags.includes("sodium_high")) caution.push("나트륨")
  if (analysis.flags.includes("sugar_high")) caution.push("당류")
  if (analysis.flags.includes("calorie_high")) caution.push("칼로리")

  if (parts.length > 0 && caution.length > 0) {
    return `오늘은 ${parts.join(", ")}이 부족하지만 ${caution.join(", ")}은 높은 편입니다. 부족한 영양소는 채우고, 과한 영양소는 낮추는 방향으로 식사 조합을 제안합니다.`
  }
  if (parts.length > 0) {
    return `오늘 ${parts.join(", ")} 섭취가 부족합니다. 부족한 영양소를 보완하는 식사 조합을 우선 추천합니다.`
  }
  if (caution.length > 0) {
    return `오늘 ${caution.join(", ")} 섭취에 주의가 필요합니다. 추가 고칼로리·고지방·국물류보다 가벼운 정리식을 추천합니다.`
  }
  return "오늘 영양 균형이 비교적 양호합니다. 훈련과 목표에 맞는 균형 식사를 제안합니다."
}

export function buildNutritionQualityStatus(
  req: RecommendFoodsRequest,
  settings: NutritionStrategySettings,
  mealContext: MealContext,
  hasTraining: boolean
): NutritionQualityStatus {
  const analysis = analyzeNutritionState(req, mealContext, hasTraining, settings)
  const t = req.targets
  const c = req.consumed

  const statusCards: NutrientStatusCard[] = [
    {
      key: "calories",
      label: "칼로리",
      status: analysis.flags.includes("calorie_low")
        ? "deficit"
        : analysis.flags.includes("calorie_high")
          ? "excess"
          : "adequate",
      detail: `${Math.round(c.calories)}/${Math.round(t.calories)}kcal`,
    },
    {
      key: "protein",
      label: "단백질",
      status: analysis.flags.includes("protein_low")
        ? "deficit"
        : analysis.proteinGap <= 5
          ? "sufficient"
          : "adequate",
      detail: `${Math.round(c.proteinG)}g / 목표 ${Math.round(t.proteinG)}g`,
    },
    {
      key: "carbs",
      label: "탄수화물",
      status: analysis.flags.includes("carbs_low")
        ? "deficit"
        : analysis.flags.includes("carbs_high")
          ? "excess"
          : "adequate",
      detail: `${Math.round(c.carbsG)}g / 목표 ${Math.round(t.carbsG)}g`,
    },
    {
      key: "fat",
      label: "지방",
      status: analysis.flags.includes("fat_high") ? "excess" : statusForGap(analysis.fatGap, 10, 15),
      detail: `${Math.round(c.fatG)}g / 목표 ${Math.round(t.fatG)}g`,
    },
    {
      key: "fiber",
      label: "식이섬유",
      status: analysis.flags.includes("fiber_low") ? "deficit" : analysis.fiberGap <= 2 ? "adequate" : "deficit",
      detail: `${Math.round(c.fiberG)}g / 목표 ${Math.round(t.fiberG ?? 25)}g`,
    },
    {
      key: "sugar",
      label: "당류",
      status: statusForExcess(analysis.sugarExcess, 15),
      detail: `${Math.round(c.sugarG)}g / 목표 ${Math.round(t.sugarG ?? 50)}g`,
    },
    {
      key: "sodium",
      label: "나트륨",
      status: statusForExcess(analysis.sodiumExcess, 400),
      detail: `${Math.round(c.sodiumMg)}mg / 목표 ${Math.round(t.sodiumMg ?? 2000)}mg`,
    },
  ]

  const deficits = statusCards
    .filter((c) => c.status === "deficit")
    .map((c) => c.key)
  const excesses = statusCards
    .filter((c) => c.status === "excess")
    .map((c) => c.key)
  const warnings = statusCards
    .filter((c) => c.status === "warning")
    .map((c) => c.key)
  const adequate = statusCards
    .filter((c) => c.status === "adequate" || c.status === "sufficient")
    .map((c) => c.key)

  const profile = buildStrategyProfile(settings)
  return {
    deficits,
    excesses,
    warnings,
    adequate,
    goalMode: labelForGoal(settings.goal),
    trainingStatus: labelForTraining(settings.trainingStatus),
    mealTiming: labelForMealTiming(settings.mealTiming),
    coachSummary: buildCoachSummary(analysis, settings),
    strategySummary: buildStrategySummary(settings, profile, analysis),
    statusCards,
  }
}
