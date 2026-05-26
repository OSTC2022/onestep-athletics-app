import { getFoodById, getRefinedCarbLevel, type RefinedCarbLevel } from "@/lib/food-database"
import { getMealFoodTagSummaries, type FoodCoachingTag } from "@/lib/food-coaching-tags"
import type { DietCoachingMode } from "@/lib/diet-coaching"
import { formatMacroG } from "@/lib/food-nutrition-utils"
import type { LoggedFoodEntry } from "@/lib/daily-food-log"
import type { FoodMealSlotId, MealSlotMacroTargets } from "@/lib/meal-slot-targets"
import type { LoggedNutrition } from "@/lib/food-nutrition-utils"

export type MacroEvalStatus =
  | "none"
  | "ok"
  | "good"
  | "low"
  | "high"
  | "very-high"

export type MacroEval = {
  key: string
  label: string
  actual: number
  target: number
  ratio: number
  status: MacroEvalStatus
  statusLabel: string
}

export type MealOverallStatus = "good" | "caution" | "bad" | "empty"

export type MealFoodTagSummary = {
  name: string
  tags: FoodCoachingTag[]
  hint: string | null
}

export type MealEvaluation = {
  overallStatus: MealOverallStatus
  macros: MacroEval[]
  messages: string[]
  foodAlerts: string[]
  foodTags: MealFoodTagSummary[]
  nextMealRecommendation: string | null
  refinedCarbLevel: RefinedCarbLevel | null
  qualityMismatch: boolean
  coachingSummary: string | null
}

export type MealEvaluationContext = {
  coachingMode?: DietCoachingMode | null
}

const GIMBAP_IDS = new Set([
  "gimbap",
  "triangle-kimbap",
  "kimbap-tuna",
  "sushi-roll",
])

function ratioPct(actual: number, target: number): number {
  if (!target || target <= 0) return 0
  return Math.round((actual / target) * 100)
}

function evalHigherIsBad(
  key: string,
  label: string,
  actual: number,
  target: number,
  labels: { ok: string; high: string; veryHigh: string },
  thresholds?: { high: number; veryHigh: number }
): MacroEval {
  const ratio = ratioPct(actual, target)
  const highAt = thresholds?.high ?? 110
  const veryHighAt = thresholds?.veryHigh ?? 130
  let status: MacroEvalStatus = "none"
  let statusLabel = "—"

  if (target <= 0) {
    return { key, label, actual, target, ratio, status, statusLabel }
  }

  if (ratio <= highAt) {
    status = "ok"
    statusLabel = labels.ok
  } else if (ratio <= veryHighAt) {
    status = "high"
    statusLabel = labels.high
  } else {
    status = "very-high"
    statusLabel = labels.veryHigh
  }

  return { key, label, actual, target, ratio, status, statusLabel }
}

function evalLowerIsBad(
  key: string,
  label: string,
  actual: number,
  target: number,
  labels: { good: string; ok: string; low: string },
  thresholds?: { good: number; ok: number }
): MacroEval {
  const ratio = ratioPct(actual, target)
  const goodAt = thresholds?.good ?? 90
  const okAt = thresholds?.ok ?? 70
  let status: MacroEvalStatus = "none"
  let statusLabel = "—"

  if (target <= 0) {
    return { key, label, actual, target, ratio, status, statusLabel }
  }

  if (ratio >= goodAt) {
    status = "good"
    statusLabel = labels.good
  } else if (ratio >= okAt) {
    status = "ok"
    statusLabel = labels.ok
  } else {
    status = "low"
    statusLabel = labels.low
  }

  return { key, label, actual, target, ratio, status, statusLabel }
}

function evalCalories(actual: number, target: number): MacroEval {
  const ratio = ratioPct(actual, target)
  let status: MacroEvalStatus = "none"
  let statusLabel = "—"

  if (target <= 0) {
    return {
      key: "calories",
      label: "칼로리",
      actual,
      target,
      ratio,
      status,
      statusLabel,
    }
  }

  if (ratio >= 85 && ratio <= 110) {
    status = "ok"
    statusLabel = "적정"
  } else if (ratio < 85) {
    status = "low"
    statusLabel = "부족"
  } else if (ratio <= 130) {
    status = "high"
    statusLabel = "초과"
  } else {
    status = "very-high"
    statusLabel = "많이 초과"
  }

  return {
    key: "calories",
    label: "칼로리",
    actual,
    target,
    ratio,
    status,
    statusLabel,
  }
}

function countFruitServings(entries: LoggedFoodEntry[]): number {
  let count = 0
  for (const entry of entries) {
    const food = getFoodById(entry.foodId)
    if (food?.category === "과일" && entry.nutrition.calories >= 20) count += 1
  }
  return count
}

function analyzeRefinedCarbs(entries: LoggedFoodEntry[]) {
  let totalCarbs = 0
  let highCarbs = 0
  let mediumCarbs = 0
  const highFoodNames: string[] = []
  let hasGimbap = false

  for (const entry of entries) {
    const food = getFoodById(entry.foodId)
    if (!food) continue

    const carbs = entry.nutrition.carbsG
    if (carbs <= 0) continue

    totalCarbs += carbs
    const level = getRefinedCarbLevel(food)

    if (GIMBAP_IDS.has(food.id)) hasGimbap = true

    if (level === "high") {
      highCarbs += carbs
      if (!highFoodNames.includes(food.name)) highFoodNames.push(food.name)
    } else if (level === "medium") {
      mediumCarbs += carbs
    }
  }

  if (totalCarbs <= 0) {
    return {
      weightedLevel: null as RefinedCarbLevel | null,
      highSharePct: 0,
      highFoodNames,
      hasGimbap,
    }
  }

  const highSharePct = Math.round((highCarbs / totalCarbs) * 100)
  const mediumSharePct = Math.round((mediumCarbs / totalCarbs) * 100)

  let weightedLevel: RefinedCarbLevel | null = null
  if (highSharePct >= 40) weightedLevel = "high"
  else if (highSharePct >= 20 || mediumSharePct >= 50) weightedLevel = "medium"
  else if (highSharePct > 0 || mediumSharePct > 0) weightedLevel = "low"

  return { weightedLevel, highSharePct, highFoodNames, hasGimbap }
}

function buildFoodAlerts(
  refined: ReturnType<typeof analyzeRefinedCarbs>,
  foodTags: MealFoodTagSummary[]
): string[] {
  const alerts: string[] = []

  if (refined.hasGimbap) {
    alerts.push(
      "김밥은 먹을 수 있지만 흰쌀밥 기반이라 정제 탄수화물 비중이 높아요. 단백질 식품을 함께 추가하거나 과일 양을 줄이면 더 좋아요."
    )
  }

  for (const item of foodTags) {
    if (item.name.includes("김밥")) continue
    const hasRefined = item.tags.some((t) => t.id === "refined-carb-high")
    if (hasRefined && !alerts.some((a) => a.includes(item.name))) {
      alerts.push(`${item.name}은(는) 정제 탄수화물 비중이 높아요.`)
    }
  }

  return [...new Set(alerts)]
}

function composeMacroIssueSentence(macros: MacroEval[]): string | null {
  const highItems: string[] = []
  const lowItems: string[] = []

  const carbs = macros.find((m) => m.key === "carbs")
  const sugar = macros.find((m) => m.key === "sugar")
  const protein = macros.find((m) => m.key === "protein")
  const fiber = macros.find((m) => m.key === "fiber")
  const fat = macros.find((m) => m.key === "fat")
  const sodium = macros.find((m) => m.key === "sodium")

  if (carbs?.status === "high" || carbs?.status === "very-high") {
    highItems.push("탄수화물")
  }
  if (sugar?.status === "high" || sugar?.status === "very-high") {
    highItems.push("당류")
  }
  if (protein?.status === "low") lowItems.push("단백질")
  if (fiber?.status === "low") lowItems.push("식이섬유")
  if (fat?.status === "high" || fat?.status === "very-high") {
    highItems.push("지방")
  }
  if (fat?.status === "low") lowItems.push("지방")
  if (sodium?.status === "high" || sodium?.status === "very-high") {
    highItems.push("나트륨")
  }

  if (highItems.length === 0 && lowItems.length === 0) return null

  if (highItems.length > 0 && lowItems.length > 0) {
    return `${highItems.join("·")}은(는) 높고 ${lowItems.join("·")}은(는) 부족합니다`
  }
  if (highItems.length > 0) {
    return `${highItems.join("·")}이(가) 높습니다`
  }
  return `${lowItems.join("·")}이(가) 부족합니다`
}

function buildCoachingSummary(
  macros: MacroEval[],
  refined: ReturnType<typeof analyzeRefinedCarbs>,
  foodAlerts: string[],
  nextMeal: string | null,
  qualityMismatch: boolean,
  calorieNearTarget: boolean
): string | null {
  const lines: string[] = []
  const macroSentence = composeMacroIssueSentence(macros)

  if (qualityMismatch) {
    lines.push("칼로리만 보면 괜찮지만 다이어트 구성은 아쉬워요.")
  } else if (calorieNearTarget && macroSentence) {
    lines.push("칼로리는 목표에 가깝지만, " + macroSentence.replace("입니다", "어요.").replace("습니다", "어요."))
  } else if (macroSentence) {
    lines.push(macroSentence.endsWith(".") ? macroSentence : macroSentence + ".")
  }

  if (refined.weightedLevel === "high" && refined.hasGimbap) {
    if (!lines.some((l) => l.includes("김밥"))) {
      lines.push(
        "김밥은 먹을 수 있지만 흰쌀밥 기반이라 정제 탄수화물 비중이 높아요."
      )
    }
  } else if (refined.weightedLevel === "high") {
    lines.push("정제 탄수화물 비중이 높아요.")
  }

  for (const alert of foodAlerts) {
    if (!lines.some((l) => l.includes(alert.slice(0, 12)))) {
      lines.push(alert)
    }
  }

  if (nextMeal) {
    lines.push(nextMeal.endsWith(".") ? nextMeal : nextMeal + ".")
  }

  return lines.length > 0 ? lines.join(" ") : null
}

function buildNextMealRecommendation(
  slotId: FoodMealSlotId,
  nextLabel: string | undefined,
  macros: MacroEval[],
  refined: ReturnType<typeof analyzeRefinedCarbs>
): string | null {
  if (!nextLabel) return null

  const protein = macros.find((m) => m.key === "protein")
  const carbs = macros.find((m) => m.key === "carbs")
  const sugar = macros.find((m) => m.key === "sugar")
  const proteinLow = protein?.status === "low"
  const proteinVeryLow = protein?.status === "low" && (protein?.ratio ?? 100) < 55
  const carbsHigh = carbs?.status === "high" || carbs?.status === "very-high"
  const sugarHigh = sugar?.status === "high" || sugar?.status === "very-high"
  const refinedHigh = refined.weightedLevel === "high"

  if (proteinLow && (carbsHigh || sugarHigh || refinedHigh)) {
    return `${nextLabel}은 밥, 면, 빵보다 단백질과 채소 위주로 구성하세요`
  }

  if (proteinVeryLow) {
    return `${nextLabel}은 닭가슴살, 계란, 두부, 생선 같은 단백질 위주로 드세요`
  }

  if (carbsHigh || sugarHigh || refinedHigh) {
    return `${nextLabel}은 밥 양을 줄이고 닭가슴살, 계란, 두부, 생선 같은 단백질 위주로 드세요`
  }

  if (slotId === "snack") return null

  if (macros.find((m) => m.key === "calories")?.status === "ok") {
    return `${nextLabel}도 목표 칼로리 안에서 단백질·채소 비중을 높여보세요`
  }

  return null
}

function computeOverallStatus(
  macros: MacroEval[],
  refined: ReturnType<typeof analyzeRefinedCarbs>,
  count: number,
  proteinVeryLow: boolean
): MealOverallStatus {
  if (count <= 0) return "empty"

  const cal = macros.find((m) => m.key === "calories")
  const protein = macros.find((m) => m.key === "protein")
  const carbs = macros.find((m) => m.key === "carbs")
  const sugar = macros.find((m) => m.key === "sugar")
  const fiber = macros.find((m) => m.key === "fiber")
  const sodium = macros.find((m) => m.key === "sodium")

  if (
    cal?.status === "very-high" ||
    sugar?.status === "very-high" ||
    carbs?.status === "very-high" ||
    sodium?.status === "very-high" ||
    (proteinVeryLow && refined.weightedLevel === "high")
  ) {
    return "bad"
  }

  if (
    cal?.status === "high" ||
    sugar?.status === "high" ||
    carbs?.status === "high" ||
    refined.highSharePct >= 55
  ) {
    return "bad"
  }

  const calorieOk = cal?.status === "ok"
  const proteinGood =
    protein?.status === "good" || protein?.status === "ok"
  const sugarOk = sugar?.status === "ok" || (sugar?.ratio ?? 0) <= 100
  const refinedOk = refined.weightedLevel !== "high"
  const fiberOk = fiber?.status !== "low"

  if (calorieOk && proteinGood && sugarOk && refinedOk && fiberOk) {
    return "good"
  }

  const sugarHigh = (sugar?.ratio ?? 0) > 110
  const carbsHigh = (carbs?.ratio ?? 0) > 110

  if (
    calorieOk &&
    (protein?.status === "low" || sugarHigh || carbsHigh || refined.weightedLevel === "high")
  ) {
    return "caution"
  }

  if (protein?.status === "low" || refined.weightedLevel === "high") {
    return "caution"
  }

  return calorieOk ? "caution" : "bad"
}

export function evaluateMealNutrition(
  nutrition: LoggedNutrition & { count: number },
  targets: MealSlotMacroTargets,
  entries: LoggedFoodEntry[],
  slotId: FoodMealSlotId,
  slotLabel: string,
  nextMealLabel?: string,
  context?: MealEvaluationContext
): MealEvaluation {
  const coachingMode = context?.coachingMode ?? null
  const proteinLowThreshold = coachingMode === "fast_loss" ? 75 : 70

  const macros: MacroEval[] = [
    evalCalories(nutrition.calories, targets.calories),
    evalHigherIsBad("carbs", "탄수화물", nutrition.carbsG, targets.carbsG, {
      ok: "적정",
      high: "과다",
      veryHigh: "많이 과다",
    }),
    evalHigherIsBad("sugar", "당류", nutrition.sugarG, targets.sugarG, {
      ok: "적정",
      high: "과다",
      veryHigh: "매우 과다",
    }, coachingMode === "fast_loss" ? { high: 100, veryHigh: 120 } : undefined),
    evalLowerIsBad("fiber", "식이섬유", nutrition.fiberG, targets.fiberG, {
      good: "좋음",
      ok: "보통",
      low: "부족",
    }),
    evalLowerIsBad("protein", "단백질", nutrition.proteinG, targets.proteinG, {
      good: "충분",
      ok: "적정",
      low: "부족",
    }, { good: 90, ok: proteinLowThreshold }),
    evalHigherIsBad("fat", "지방", nutrition.fatG, targets.fatG, {
      ok: "적정",
      high: "과다",
      veryHigh: "많이 과다",
    }),
    evalHigherIsBad("sodium", "나트륨", nutrition.sodiumMg, targets.sodiumMg, {
      ok: "적정",
      high: "과다",
      veryHigh: "매우 과다",
    }),
  ]

  const refined = analyzeRefinedCarbs(entries)
  const foodTags = getMealFoodTagSummaries(entries)
  const calorieOk = macros.find((m) => m.key === "calories")?.status === "ok"
  const calorieNear =
    macros.find((m) => m.key === "calories")?.ratio !== undefined &&
    (macros.find((m) => m.key === "calories")?.ratio ?? 0) >= 85 &&
    (macros.find((m) => m.key === "calories")?.ratio ?? 0) <= 115

  const qualityIssues =
    macros.some(
      (m) =>
        (m.key === "protein" && m.status === "low") ||
        (m.key === "sugar" && (m.status === "high" || m.status === "very-high")) ||
        (m.key === "carbs" && (m.status === "high" || m.status === "very-high")) ||
        (m.key === "fiber" && m.status === "low") ||
        (m.key === "sodium" && (m.status === "high" || m.status === "very-high"))
    ) || refined.weightedLevel === "high"

  const qualityMismatch = calorieOk && qualityIssues && nutrition.count > 0
  const protein = macros.find((m) => m.key === "protein")
  const proteinVeryLow = protein?.status === "low" && (protein.ratio ?? 100) < 55

  const messages: string[] = []
  const fruitCount = countFruitServings(entries)
  if (coachingMode === "fast_loss" && fruitCount >= 2 && slotId !== "snack") {
    messages.push("강한 감량 모드에서는 과일은 하루 1~2회분으로 나눠 드세요.")
  }

  if (slotId === "snack" && coachingMode === "fast_loss" && nutrition.calories > targets.calories) {
    messages.push("간식은 100~200kcal 이내로 가볍게 드세요.")
  }

  let hasFruitAndRefined = false
  for (const entry of entries) {
    const food = getFoodById(entry.foodId)
    if (!food) continue
    const isFruit = food.category === "과일" && entry.nutrition.carbsG >= 5
    const isRefined =
      getRefinedCarbLevel(food) === "high" &&
      (GIMBAP_IDS.has(food.id) || food.id === "rice-white")
    if (isFruit && entries.some((e) => {
      const f = getFoodById(e.foodId)
      return f && getRefinedCarbLevel(f) === "high" && (GIMBAP_IDS.has(f.id) || f.id === "rice-white")
    })) {
      hasFruitAndRefined = true
    }
  }
  if (hasFruitAndRefined) {
    messages.push(
      `오늘 ${slotLabel}은(는) 과일과 흰쌀밥·김밥 비중이 높아 혈당 변동이 클 수 있어요.`
    )
  }

  const foodAlerts = buildFoodAlerts(refined, foodTags)
  const nextMealRecommendation = buildNextMealRecommendation(
    slotId,
    nextMealLabel,
    macros,
    refined
  )

  const coachingSummary = buildCoachingSummary(
    macros,
    refined,
    foodAlerts,
    nextMealRecommendation,
    qualityMismatch,
    calorieNear
  )

  if (coachingSummary) {
    messages.unshift(coachingSummary)
  }

  const overallStatus = computeOverallStatus(
    macros,
    refined,
    nutrition.count,
    proteinVeryLow
  )

  return {
    overallStatus,
    macros,
    messages: [...new Set(messages)],
    foodAlerts,
    foodTags,
    nextMealRecommendation,
    refinedCarbLevel: refined.weightedLevel,
    qualityMismatch,
    coachingSummary,
  }
}

export function macroStatusColor(status: MacroEvalStatus): string {
  switch (status) {
    case "good":
    case "ok":
      return "text-accent"
    case "high":
      return "text-amber-400"
    case "very-high":
    case "low":
      return "text-red-400"
    default:
      return "text-muted-foreground"
  }
}

export function mealStatusBorderColor(status: MealOverallStatus): string {
  switch (status) {
    case "good":
      return "border-accent/40 bg-accent/5"
    case "caution":
      return "border-amber-500/40 bg-amber-500/5"
    case "bad":
      return "border-red-500/45 bg-red-500/5"
    default:
      return "border-border/50 bg-background/40"
  }
}
