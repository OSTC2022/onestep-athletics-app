import type { DietMode, UserProfile } from "@/lib/user-profile"
import type { TrainingNutritionCategory } from "@/lib/user-profile"

/** 체지방 1kg 감량에 필요한 칼로리 적자 (kcal) */
export const KCAL_PER_KG_FAT = 7700
/** 체중 1kg 증가에 필요한 칼로리 잉여 (kcal) */
export const KCAL_PER_KG_GAIN = 7000

export type TargetPeriodAdvice = {
  headline: string
  detail: string
  recommendedWeeks: number
}

export type TargetPeriodDietPlan = {
  weeklyWeightGoalKg: number
  dailyCalorieAdjustment: number
  requestedDailyAdjustment: number
  wasClamped: boolean
  warning: string | null
  advice: TargetPeriodAdvice | null
  usesTargetPeriod: boolean
}

/** 권장·현실적인 주당 감량 속도 (kg) */
export const REALISTIC_WEEKLY_LOSS_KG = 0.5
export const FAST_WEEKLY_LOSS_KG = 0.7
export const MIN_REALISTIC_WEEKLY_LOSS_KG = 0.3

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export function formatTargetPeriodChangeRange(weeklyWeightGoalKg: number): string {
  const abs = round1(Math.abs(weeklyWeightGoalKg))
  if (weeklyWeightGoalKg < -0.05) {
    return `주 ${abs}kg 감량 (목표 기간 기준)`
  }
  if (weeklyWeightGoalKg > 0.05) {
    return `주 ${abs}kg 증량 (목표 기간 기준)`
  }
  return "체중 유지"
}

export function calculateTargetPeriodDietPlan(
  profile: Pick<
    UserProfile,
    | "currentWeightKg"
    | "targetWeightKg"
    | "targetWeeks"
    | "dietMode"
    | "goalType"
  >
): TargetPeriodDietPlan {
  const empty: TargetPeriodDietPlan = {
    weeklyWeightGoalKg: 0,
    dailyCalorieAdjustment: 0,
    requestedDailyAdjustment: 0,
    wasClamped: false,
    warning: null,
    advice: null,
    usesTargetPeriod: false,
  }

  if (profile.targetWeeks <= 0) return empty

  const totalDelta = profile.targetWeightKg - profile.currentWeightKg
  if (Math.abs(totalDelta) < 0.1) return empty

  const weeklyWeightGoalKg = round1(totalDelta / profile.targetWeeks)
  const requestedDailyAdjustment =
    weeklyWeightGoalKg < 0
      ? round1((weeklyWeightGoalKg * KCAL_PER_KG_FAT) / 7)
      : round1((weeklyWeightGoalKg * KCAL_PER_KG_GAIN) / 7)

  let dailyCalorieAdjustment = requestedDailyAdjustment
  let wasClamped = false

  if (weeklyWeightGoalKg < -0.05) {
    const maxDeficit =
      profile.dietMode === "fast_loss"
        ? 750
        : profile.dietMode === "performance_loss"
          ? 400
          : 550
    const minDeficit = 150
    if (dailyCalorieAdjustment < -maxDeficit) {
      dailyCalorieAdjustment = -maxDeficit
      wasClamped = true
    } else if (dailyCalorieAdjustment > -minDeficit) {
      dailyCalorieAdjustment = -minDeficit
    }
  } else if (weeklyWeightGoalKg > 0.05) {
    const maxSurplus = 400
    if (dailyCalorieAdjustment > maxSurplus) {
      dailyCalorieAdjustment = maxSurplus
      wasClamped = true
    }
  }

  const advice = buildTargetPeriodAdvice(
    profile,
    weeklyWeightGoalKg,
    wasClamped,
    requestedDailyAdjustment,
    dailyCalorieAdjustment
  )

  return {
    weeklyWeightGoalKg,
    dailyCalorieAdjustment,
    requestedDailyAdjustment,
    wasClamped,
    warning: advice ? `${advice.headline} ${advice.detail}` : null,
    advice,
    usesTargetPeriod: true,
  }
}

function formatMonthsFromWeeks(weeks: number): string {
  const months = Math.max(1, Math.round(weeks / 4))
  return `약 ${months}개월`
}

function weeklyRateFromDailyAdjustment(dailyAdjustment: number): number {
  return round1(Math.abs((dailyAdjustment * 7) / KCAL_PER_KG_FAT))
}

export function getRecommendedTargetWeeks(
  profile: Pick<UserProfile, "currentWeightKg" | "targetWeightKg" | "targetWeeks">
): number | null {
  const totalDelta = profile.targetWeightKg - profile.currentWeightKg
  if (Math.abs(totalDelta) < 0.1 || profile.targetWeeks <= 0) return null

  if (totalDelta < -0.1) {
    const lossKg = round1(Math.abs(totalDelta))
    const recommended = Math.max(
      profile.targetWeeks + 1,
      Math.ceil(lossKg / REALISTIC_WEEKLY_LOSS_KG)
    )
    return recommended > profile.targetWeeks ? recommended : null
  }

  if (totalDelta > 0.1) {
    const gainKg = round1(totalDelta)
    const recommended = Math.max(
      profile.targetWeeks + 1,
      Math.ceil(gainKg / 0.35)
    )
    return recommended > profile.targetWeeks ? recommended : null
  }

  return null
}

function buildTargetPeriodAdvice(
  profile: Pick<
    UserProfile,
    "currentWeightKg" | "targetWeightKg" | "targetWeeks"
  >,
  weeklyWeightGoalKg: number,
  wasClamped: boolean,
  requestedDailyAdjustment: number,
  dailyCalorieAdjustment: number
): TargetPeriodAdvice | null {
  const totalDeltaKg = profile.targetWeightKg - profile.currentWeightKg
  const absWeekly = round1(Math.abs(weeklyWeightGoalKg))
  const lossKg = round1(Math.abs(Math.min(0, totalDeltaKg)))
  const recommendedWeeks = getRecommendedTargetWeeks(profile)
  const fastestWeeks = Math.max(
    profile.targetWeeks + 1,
    Math.ceil(lossKg / FAST_WEEKLY_LOSS_KG)
  )
  const plannedWeeklyKg = weeklyRateFromDailyAdjustment(dailyCalorieAdjustment)
  const dailyDeficit = Math.abs(Math.round(dailyCalorieAdjustment))

  if (!recommendedWeeks) return null

  if (weeklyWeightGoalKg < -0.05) {
    if (absWeekly >= 1) {
      return {
        headline: `주 ${absWeekly}kg 감량은 현실적으로 매우 어려워요`,
        detail: `대부분 주 ${MIN_REALISTIC_WEEKLY_LOSS_KG}~${REALISTIC_WEEKLY_LOSS_KG}kg이 적당합니다. ${lossKg}kg 감량이라면 ${recommendedWeeks}주(${formatMonthsFromWeeks(recommendedWeeks)}) 정도가 현실적이에요. 지금은 식단을 하루 ${dailyDeficit}kcal 적자(주 약 ${plannedWeeklyKg}kg)로 맞춰 드릴게요.`,
        recommendedWeeks,
      }
    }

    if (absWeekly >= 0.7) {
      return {
        headline: `주 ${absWeekly}kg은 다소 빠른 목표예요`,
        detail: `훈련·회복을 고려하면 주 ${REALISTIC_WEEKLY_LOSS_KG}kg 전후가 좋아요. ${recommendedWeeks}주(${formatMonthsFromWeeks(recommendedWeeks)}) 정도로 기간을 늘리면 무리 없이 갈 수 있어요.`,
        recommendedWeeks,
      }
    }
  }

  if (weeklyWeightGoalKg > 0.05 && absWeekly >= 0.5) {
    return {
      headline: `주 ${absWeekly}kg 증량은 너무 빠를 수 있어요`,
      detail: `근육 위주로 늘리려면 주 0.2~0.35kg이 현실적입니다. ${recommendedWeeks}주 정도가 더 안전해요.`,
      recommendedWeeks,
    }
  }

  if (
    wasClamped &&
    Math.abs(requestedDailyAdjustment) > Math.abs(dailyCalorieAdjustment) + 20
  ) {
    return {
      headline: `현재 ${profile.targetWeeks}주로는 주 약 ${plannedWeeklyKg}kg만 가능해요`,
      detail: `설정하신 속도를 맞추려면 최소 ${fastestWeeks}주, 권장 ${recommendedWeeks}주(${formatMonthsFromWeeks(recommendedWeeks)})가 필요해요. 기간을 늘리면 식단과 목표가 잘 맞습니다.`,
      recommendedWeeks,
    }
  }

  return null
}

/** 다이어트 코칭 모드 (감량 전용) */
export type DietCoachingMode = "normal_loss" | "fast_loss"

export const COACHING_DIET_MODE_OPTIONS: {
  value: DietCoachingMode
  label: string
  description: string
}[] = [
  {
    value: "normal_loss",
    label: "일반 감량",
    description: "유지칼로리 -400~500kcal · 단백질 1.6~2.2g/kg",
  },
  {
    value: "fast_loss",
    label: "강한 감량",
    description: "유지칼로리 -600~700kcal · 탄수·정제탄수·간식 엄격",
  },
]

export const PROFILE_INCOMPLETE_MESSAGE =
  "프로필 정보를 입력하면 더 정확한 목표가 설정돼요"

export type DietCoachingMacroPlan = {
  calories: number
  proteinG: number
  fatG: number
  carbsG: number
  sugarG: number
  fiberG: number
  sodiumMg: number
  proteinPerKg: number
  fatCaloriePct: number
  snackCalorieMax: number
  deficitKcal: number
}

export function resolveCoachingMode(dietMode: DietMode): DietCoachingMode | null {
  if (dietMode === "fast_loss") return "fast_loss"
  if (dietMode === "normal_loss" || dietMode === "performance_loss") {
    return "normal_loss"
  }
  return null
}

export function calculateCoachingMacroPlan(
  mode: DietCoachingMode,
  weightKg: number,
  maintenanceCalories: number,
  trainingCategory: TrainingNutritionCategory,
  minCalories: number,
  deficitKcalOverride?: number
): DietCoachingMacroPlan {
  const defaultDeficit = mode === "fast_loss" ? 650 : 450
  const deficitKcal = Math.max(
    150,
    Math.round(deficitKcalOverride ?? defaultDeficit)
  )
  let calories = Math.round(maintenanceCalories - deficitKcal)

  if (trainingCategory === "high" && mode === "normal_loss") {
    calories += 100
  } else if (trainingCategory === "rest" && mode === "fast_loss") {
    calories -= 50
  }

  calories = Math.max(minCalories, calories)

  const proteinPerKg = mode === "fast_loss" ? 2.0 : 1.9
  const proteinG = Math.round(weightKg * proteinPerKg)

  const fatCaloriePct = mode === "fast_loss" ? 0.22 : 0.25
  let fatG = Math.round((calories * fatCaloriePct) / 9)
  let carbsG = Math.round((calories - proteinG * 4 - fatG * 9) / 4)

  const minCarbsG = Math.round(weightKg * (mode === "fast_loss" ? 1.5 : 2))
  if (carbsG < minCarbsG) {
    fatG = Math.max(
      Math.round(weightKg * 0.6),
      Math.round((calories - proteinG * 4 - minCarbsG * 4) / 9)
    )
    carbsG = Math.round((calories - proteinG * 4 - fatG * 9) / 4)
  }

  if (mode === "fast_loss") {
    carbsG = Math.max(minCarbsG, Math.round(carbsG * 0.88))
    if (trainingCategory === "rest") {
      carbsG = Math.max(minCarbsG, Math.round(carbsG * 0.92))
    }
  }

  const sugarG = mode === "fast_loss" ? 30 : 40
  const fiberG = 25
  const sodiumMg = mode === "fast_loss" ? 2000 : 2150
  const snackCalorieMax = mode === "fast_loss" ? 180 : Math.round(calories * 0.12)

  return {
    calories,
    proteinG,
    fatG,
    carbsG,
    sugarG,
    fiberG,
    sodiumMg,
    proteinPerKg,
    fatCaloriePct,
    snackCalorieMax,
    deficitKcal,
  }
}

export function getCoachingModeLabel(mode: DietCoachingMode): string {
  return mode === "fast_loss" ? "강한 감량 모드" : "일반 감량 모드"
}
