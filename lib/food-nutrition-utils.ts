import type { FoodDatabaseItem } from "@/lib/food-database"

export type LoggedNutrition = {
  calories: number
  carbsG: number
  proteinG: number
  fatG: number
  sodiumMg: number
  sugarG: number
  fiberG: number
}

export type NutritionTotals = LoggedNutrition & { count: number }

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function sugarEstimateRatio(category: string, carbsG: number): number {
  if (carbsG <= 0) return 0
  if (category === "과일" || category === "음료") return 0.65
  if (category === "간식") return 0.45
  if (category === "탄수" || category === "곡물") return 0.08
  if (category === "채소") return 0.2
  return 0.15
}

function fiberEstimateRatio(category: string): number {
  if (category === "채소") return 0.35
  if (category === "과일") return 0.18
  if (category === "곡물" || category === "탄수") return 0.12
  if (category === "잡곡") return 0.15
  return 0.05
}

export function resolveSugarFiber(
  food: Pick<FoodDatabaseItem, "category" | "per100g">,
  grams: number
): { sugarG: number; fiberG: number } {
  const factor = grams / 100
  const { per100g, category } = food

  const sugarG =
    typeof per100g.sugarG === "number"
      ? round1(per100g.sugarG * factor)
      : round1(per100g.carbsG * factor * sugarEstimateRatio(category, per100g.carbsG))

  const fiberG =
    typeof per100g.fiberG === "number"
      ? round1(per100g.fiberG * factor)
      : round1(per100g.carbsG * factor * fiberEstimateRatio(category))

  return { sugarG, fiberG }
}

export function getFiberPer100g(
  food: Pick<FoodDatabaseItem, "category" | "per100g">
): number {
  return resolveSugarFiber(food, 100).fiberG
}

export function toLoggedNutrition(
  food: FoodDatabaseItem,
  grams: number
): LoggedNutrition {
  const factor = grams / 100
  const { per100g } = food
  const { sugarG, fiberG } = resolveSugarFiber(food, grams)

  return {
    calories: Math.round(per100g.calories * factor),
    carbsG: round1(per100g.carbsG * factor),
    proteinG: round1(per100g.proteinG * factor),
    fatG: round1(per100g.fatG * factor),
    sodiumMg: Math.round(per100g.sodiumMg * factor),
    sugarG,
    fiberG,
  }
}

export function sumLoggedNutrition(
  entries: { nutrition: Partial<LoggedNutrition> & Pick<LoggedNutrition, "calories"> }[]
): NutritionTotals {
  return entries.reduce(
    (acc, entry) => {
      const n = entry.nutrition
      return {
        calories: acc.calories + (n.calories ?? 0),
        carbsG: round1(acc.carbsG + (n.carbsG ?? 0)),
        proteinG: round1(acc.proteinG + (n.proteinG ?? 0)),
        fatG: round1(acc.fatG + (n.fatG ?? 0)),
        sodiumMg: acc.sodiumMg + (n.sodiumMg ?? 0),
        sugarG: round1(acc.sugarG + (n.sugarG ?? 0)),
        fiberG: round1(acc.fiberG + (n.fiberG ?? 0)),
        count: acc.count + 1,
      }
    },
    {
      calories: 0,
      carbsG: 0,
      proteinG: 0,
      fatG: 0,
      sodiumMg: 0,
      sugarG: 0,
      fiberG: 0,
      count: 0,
    }
  )
}

export function calculateMacroCalories(
  carbsG: number,
  proteinG: number,
  fatG: number
): number {
  return Math.round(carbsG * 4 + proteinG * 4 + fatG * 9)
}

const CALORIE_MISMATCH_RATIO = 0.15
const CALORIE_MISMATCH_MIN_KCAL = 30

export function validateMacroCalories(
  nutrition: Pick<LoggedNutrition, "calories" | "carbsG" | "proteinG" | "fatG">,
  context?: string
): void {
  if (typeof window === "undefined") return

  const calculated = calculateMacroCalories(
    nutrition.carbsG,
    nutrition.proteinG,
    nutrition.fatG
  )
  const diff = Math.abs(nutrition.calories - calculated)
  const ratio = nutrition.calories > 0 ? diff / nutrition.calories : 0

  if (ratio > CALORIE_MISMATCH_RATIO && diff > CALORIE_MISMATCH_MIN_KCAL) {
    console.warn(
      `[nutrition] 칼로리·매크로 불일치${context ? ` (${context})` : ""}`,
      {
        actualKcal: nutrition.calories,
        calculatedKcal: calculated,
        diffKcal: diff,
        diffPct: Math.round(ratio * 100),
        macros: {
          carbsG: nutrition.carbsG,
          proteinG: nutrition.proteinG,
          fatG: nutrition.fatG,
        },
      }
    )
  }
}

export function nutritionPercent(actual: number, target: number): number {
  if (!target || target <= 0) return 0
  return Math.min(100, Math.round((actual / target) * 100))
}

export type DietJudgmentTone = "ok" | "warn" | "caution" | "neutral"

export type DietJudgmentKind =
  | "calorie-ok"
  | "calorie-low"
  | "calorie-high"
  | "protein-low"
  | "protein-ok"
  | "sugar-warn"
  | "fiber-low"
  | "fiber-ok"
  | "none"

export type DietJudgmentTag = {
  label: string
  tone: DietJudgmentTone
  kind: DietJudgmentKind
  actionable: boolean
}

export type NutritionTargetSlice = {
  calories: number
  carbsG: number
  proteinG: number
  fatG: number
  sodiumMg: number
  sugarG: number
  fiberG: number
}

/** 감량 판정에서 '주의'(warn)로 표시된 항목 — 추천 순위 조정에 사용 */
export type DietWarningContext = {
  sugarWarn: boolean
  calorieHigh: boolean
}

export function buildDietWarningContext(
  tags: Pick<DietJudgmentTag, "kind" | "tone">[]
): DietWarningContext {
  const warnKinds = new Set(
    tags.filter((tag) => tag.tone === "warn").map((tag) => tag.kind)
  )
  return {
    sugarWarn: warnKinds.has("sugar-warn"),
    calorieHigh: warnKinds.has("calorie-high"),
  }
}

export function buildDietWarningContextFromTotals(
  totals: LoggedNutrition,
  targets: NutritionTargetSlice
): DietWarningContext {
  return buildDietWarningContext(buildDietJudgmentSummary(totals, targets))
}

export function buildDietJudgmentSummary(
  totals: LoggedNutrition,
  targets: NutritionTargetSlice
): DietJudgmentTag[] {
  const tags: DietJudgmentTag[] = []
  const caloriePct = nutritionPercent(totals.calories, targets.calories)
  const proteinPct = nutritionPercent(totals.proteinG, targets.proteinG)
  const sugarPct = nutritionPercent(totals.sugarG, targets.sugarG)
  const fiberPct = nutritionPercent(totals.fiberG, targets.fiberG)

  if (caloriePct >= 85 && caloriePct <= 110) {
    tags.push({
      label: "칼로리 적정",
      tone: "ok",
      kind: "calorie-ok",
      actionable: false,
    })
  } else if (caloriePct > 110) {
    tags.push({
      label: "칼로리 초과",
      tone: "warn",
      kind: "calorie-high",
      actionable: true,
    })
  } else if (caloriePct > 0) {
    tags.push({
      label: "칼로리 부족",
      tone: "caution",
      kind: "calorie-low",
      actionable: true,
    })
  }

  if (proteinPct < 30) {
    tags.push({
      label: "단백질 부족",
      tone: "warn",
      kind: "protein-low",
      actionable: true,
    })
  } else if (proteinPct >= 80) {
    tags.push({
      label: "단백질 충분",
      tone: "ok",
      kind: "protein-ok",
      actionable: false,
    })
  }

  if (sugarPct >= 80) {
    tags.push({
      label: "당류 주의",
      tone: "warn",
      kind: "sugar-warn",
      actionable: true,
    })
  }

  if (fiberPct < 70) {
    tags.push({
      label: "식이섬유 부족",
      tone: "caution",
      kind: "fiber-low",
      actionable: true,
    })
  } else if (fiberPct >= 90) {
    tags.push({
      label: "식이섬유 충분",
      tone: "ok",
      kind: "fiber-ok",
      actionable: false,
    })
  }

  if (tags.length === 0) {
    tags.push({
      label: "기록 없음",
      tone: "neutral",
      kind: "none",
      actionable: false,
    })
  }

  return tags
}

export function buildNutritionFeedbacks(
  totals: LoggedNutrition,
  targets: NutritionTargetSlice
): string[] {
  const messages: string[] = []
  const caloriePct = nutritionPercent(totals.calories, targets.calories)
  const proteinPct = nutritionPercent(totals.proteinG, targets.proteinG)
  const sugarPct = nutritionPercent(totals.sugarG, targets.sugarG)
  const carbsPct = nutritionPercent(totals.carbsG, targets.carbsG)

  const calorieOk = caloriePct >= 85 && caloriePct <= 110
  const qualityBad =
    proteinPct < 70 ||
    sugarPct >= 100 ||
    carbsPct > 110

  if (calorieOk && qualityBad) {
    messages.push("칼로리만 보면 괜찮지만 다이어트 구성은 아쉬워요.")
  }

  if (proteinPct < 30) {
    messages.push(
      "단백질이 부족해요. 다음 식사에 단백질 식품을 추가하세요."
    )
  }

  if (sugarPct >= 80) {
    messages.push("오늘 당류 섭취가 높은 편이에요.")
  }

  if (calorieOk && carbsPct > 110 && sugarPct >= 80) {
    messages.push("칼로리는 적정하지만 탄수화물과 당류가 높아요.")
  }

  return [...new Set(messages)]
}

export function formatMacroG(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}
