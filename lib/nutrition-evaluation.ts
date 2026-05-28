import type { LoggedFoodEntry } from "@/lib/daily-food-log"
import type { DietCoachingMode } from "@/lib/diet-coaching"
import {
  deriveMealRecommendationContext,
  targetRangeToMacroTargets,
  type MealRecommendationContext,
  type MealTargetRange,
} from "@/lib/recommendation-meal-targets"
import type { FoodMealSlotId, MealSlotMacroTargets } from "@/lib/meal-slot-targets"
import type { LoggedNutrition } from "@/lib/food-nutrition-utils"
import {
  evaluateMealNutrition as evaluateMealNutritionDefault,
  type MealEvaluation,
  type MealEvaluationContext,
  type MacroEval,
  type MacroEvalStatus,
  type MealOverallStatus,
} from "@/lib/meal-evaluation"

export type MealNutritionEvaluationContext = {
  mealSlot: FoodMealSlotId
  slotLabel: string
  defaultTargets: MealSlotMacroTargets
  recommendationContext?: MealRecommendationContext | null
  coachingMode?: DietCoachingMode | null
  nextMealLabel?: string
  /** 사용자가 추천 목적과 다른 끼니에 적용한 경우 */
  slotMismatch?: boolean
}

function ratioPct(actual: number, target: number): number {
  if (!target || target <= 0) return 0
  return Math.round((actual / target) * 100)
}

function evalCaloriesWithRange(
  actual: number,
  range: MealTargetRange["calories"],
  recommended: boolean
): MacroEval {
  const mid = (range.min + range.max) / 2
  const ratio = ratioPct(actual, mid)
  let status: MacroEvalStatus = "none"
  let statusLabel = "—"

  if (actual >= range.min && actual <= range.max) {
    status = "ok"
    statusLabel = recommended ? "추천 기준 적합" : "적정"
  } else if (actual < range.min * 0.9) {
    status = "low"
    statusLabel = "부족"
  } else if (actual <= range.max * 1.1) {
    status = "ok"
    statusLabel = recommended ? "추천 기준 적정" : "적정"
  } else if (actual <= range.max * 1.3) {
    status = "high"
    statusLabel = recommended ? "추천 기준 약간 초과" : "초과"
  } else {
    status = "very-high"
    statusLabel = recommended ? "추천 기준 많이 초과" : "많이 초과"
  }

  return {
    key: "calories",
    label: "칼로리",
    actual,
    target: mid,
    ratio,
    status,
    statusLabel,
  }
}

function evalProteinWithRange(
  actual: number,
  range: MealTargetRange["protein"],
  trainingFriendly: boolean,
  recommended: boolean
): MacroEval {
  const target = range.max ?? range.min * 1.15
  const ratio = ratioPct(actual, target)

  let status: MacroEvalStatus = "none"
  let statusLabel = "—"

  if (actual >= range.min && (!range.max || actual <= range.max * 1.15)) {
    status = trainingFriendly && actual > (range.max ?? range.min) ? "good" : "ok"
    statusLabel = recommended
      ? trainingFriendly
        ? "회복식 기준 적정"
        : "추천 기준 적합"
      : trainingFriendly
        ? "충분"
        : "적정"
  } else if (actual >= range.min * 0.85) {
    status = "ok"
    statusLabel = recommended ? "추천 기준 적정" : "적정"
  } else if (actual < range.min * 0.85) {
    status = "low"
    statusLabel = "부족"
  } else if (trainingFriendly && actual > (range.max ?? range.min) * 1.3) {
    status = "good"
    statusLabel = "고단백 · 양호"
  } else {
    status = "high"
    statusLabel = recommended ? "추천 기준 초과" : "과다"
  }

  return {
    key: "protein",
    label: "단백질",
    actual,
    target,
    ratio,
    status,
    statusLabel,
  }
}

function evalMaxWithRange(
  key: string,
  label: string,
  actual: number,
  max: number | undefined,
  strict: boolean,
  recommended: boolean
): MacroEval {
  if (max == null || max <= 0) {
    return { key, label, actual, target: 0, ratio: 0, status: "none", statusLabel: "—" }
  }

  const ratio = ratioPct(actual, max)
  let status: MacroEvalStatus = "ok"
  let statusLabel = recommended ? "추천 기준 적합" : "적정"

  const highAt = strict ? 100 : 110
  const veryHighAt = strict ? 120 : 130

  if (ratio <= highAt) {
    status = "ok"
    statusLabel = recommended ? "추천 기준 적합" : "적정"
  } else if (ratio <= veryHighAt) {
    status = "high"
    statusLabel = recommended ? `${label} 주의` : "과다"
  } else {
    status = "very-high"
    statusLabel = recommended ? `${label} 많이 초과` : "많이 과다"
  }

  return { key, label, actual, target: max, ratio, status, statusLabel }
}

function evalMinWithRange(
  key: string,
  label: string,
  actual: number,
  min: number | undefined,
  recommended: boolean
): MacroEval {
  if (min == null || min <= 0) {
    return { key, label, actual, target: 0, ratio: 0, status: "none", statusLabel: "—" }
  }

  const ratio = ratioPct(actual, min)
  let status: MacroEvalStatus = "ok"
  let statusLabel = recommended ? "추천 기준 적합" : "적정"

  if (ratio >= 100) {
    status = "good"
    statusLabel = recommended ? "추천 기준 충족" : "좋음"
  } else if (ratio >= 80) {
    status = "ok"
    statusLabel = "보통"
  } else {
    status = "low"
    statusLabel = "부족"
  }

  return { key, label, actual, target: min, ratio, status, statusLabel }
}

function computeRecommendedOverallStatus(
  macros: MacroEval[],
  slotMismatch: boolean,
  criteriaLabel: string
): MealOverallStatus {
  if (slotMismatch) return "caution"

  const cal = macros.find((m) => m.key === "calories")
  const sodium = macros.find((m) => m.key === "sodium")
  const fat = macros.find((m) => m.key === "fat")
  const sugar = macros.find((m) => m.key === "sugar")

  if (
    cal?.status === "very-high" ||
    sodium?.status === "very-high" ||
    fat?.status === "very-high"
  ) {
    return "bad"
  }

  if (cal?.status === "ok" || cal?.status === "good") {
    const badMacro = macros.some(
      (m) =>
        (m.key === "sodium" || m.key === "fat" || m.key === "sugar") &&
        (m.status === "very-high" || m.status === "high")
    )
    if (!badMacro) return "good"
  }

  if (criteriaLabel.includes("회복") && cal?.status !== "very-high") {
    return "good"
  }

  if (cal?.status === "high") return "caution"
  return cal?.status === "ok" ? "good" : "caution"
}

function evaluateWithRecommendationContext(
  nutrition: LoggedNutrition & { count: number },
  entries: LoggedFoodEntry[],
  ctx: MealNutritionEvaluationContext,
  rec: MealRecommendationContext
): MealEvaluation {
  const range = rec.targetRange
  const trainingFriendly =
    rec.purpose.includes("회복") ||
    rec.purpose.includes("고단백") ||
    rec.intendedMealSlot === "postWorkout" ||
    rec.intendedMealSlot === "recoveryMeal"

  const slotMismatch =
    ctx.slotMismatch ??
    (rec.applyMealSlotId !== ctx.mealSlot && nutrition.count > 0)

  const macros: MacroEval[] = [
    evalCaloriesWithRange(nutrition.calories, range.calories, true),
    evalMaxWithRange(
      "carbs",
      "탄수화물",
      nutrition.carbsG,
      range.carbs?.max,
      false,
      true
    ),
    evalMaxWithRange(
      "sugar",
      "당류",
      nutrition.sugarG,
      range.sugar?.max,
      true,
      true
    ),
    evalMinWithRange("fiber", "식이섬유", nutrition.fiberG, range.fiber?.min, true),
    evalProteinWithRange(nutrition.proteinG, range.protein, trainingFriendly, true),
    evalMaxWithRange("fat", "지방", nutrition.fatG, range.fat.max, true, true),
    evalMaxWithRange(
      "sodium",
      "나트륨",
      nutrition.sodiumMg,
      range.sodium?.max,
      true,
      true
    ),
  ]

  const overallStatus = computeRecommendedOverallStatus(
    macros,
    slotMismatch,
    rec.evaluationCriteriaLabel
  )

  const messages: string[] = []
  if (slotMismatch) {
    messages.push("현재 끼니와 추천 목적이 다릅니다. 추천 기준과 기본 끼니 목표가 함께 표시됩니다.")
  } else {
    messages.push(`현재 평가는 ${rec.evaluationCriteriaLabel}으로 계산되었습니다.`)
  }

  const statusLabel =
    slotMismatch
      ? "목적·끼니 불일치"
      : overallStatus === "good"
        ? rec.evaluationCriteriaLabel.replace(" 기준", " 적정")
        : overallStatus === "caution"
          ? "주의"
          : "개선 필요"

  return {
    overallStatus,
    macros,
    messages,
    foodAlerts: [],
    foodTags: [],
    nextMealRecommendation: null,
    refinedCarbLevel: null,
    qualityMismatch: false,
    coachingSummary: statusLabel,
  }
}

export function evaluateMealNutrition(
  nutrition: LoggedNutrition & { count: number },
  entries: LoggedFoodEntry[],
  context: MealNutritionEvaluationContext
): MealEvaluation & {
  usesRecommendationCriteria: boolean
  recommendationContext?: MealRecommendationContext | null
  displayStatusLabel?: string
} {
  const recFromEntries = deriveMealRecommendationContext(entries)
  const rec = context.recommendationContext ?? recFromEntries

  if (rec && nutrition.count > 0) {
    const slotMismatch =
      context.slotMismatch ?? rec.applyMealSlotId !== context.mealSlot
    const result = evaluateWithRecommendationContext(nutrition, entries, context, {
      ...rec,
    })
    const displayStatusLabel = slotMismatch
      ? "현재 끼니와 추천 목적 불일치"
      : result.overallStatus === "good"
        ? result.coachingSummary ?? rec.evaluationCriteriaLabel
        : result.overallStatus === "caution"
          ? "추천 기준 주의"
          : "개선 필요"

    return {
      ...result,
      usesRecommendationCriteria: !slotMismatch,
      recommendationContext: rec,
      displayStatusLabel,
    }
  }

  const legacyCtx: MealEvaluationContext = {
    coachingMode: context.coachingMode ?? null,
  }

  const defaultEval = evaluateMealNutritionDefault(
    nutrition,
    context.defaultTargets,
    entries,
    context.mealSlot,
    context.slotLabel,
    context.nextMealLabel,
    legacyCtx
  )

  return {
    ...defaultEval,
    usesRecommendationCriteria: false,
    recommendationContext: null,
    displayStatusLabel:
      defaultEval.overallStatus === "good"
        ? "양호"
        : defaultEval.overallStatus === "caution"
          ? "주의"
          : defaultEval.overallStatus === "bad"
            ? "개선 필요"
            : "기록 없음",
  }
}

export { targetRangeToMacroTargets }
