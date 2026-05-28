import type {
  MealContext,
  NutritionDeficitAnalysis,
  RecommendationBucket,
  TrainingIntensity,
} from "@/lib/food-recommendation-types"

export type NutritionGoal =
  | "fat_loss_priority"
  | "fat_loss_train_maintain"
  | "running_performance"
  | "post_workout_recovery"
  | "muscle_maintain"
  | "race_prep"
  | "light_management"
  | "aggressive_diet"

export type TrainingStatus =
  | "rest"
  | "easy_jog"
  | "moderate_run"
  | "interval_speed"
  | "long_lsd"
  | "weight_training"
  | "race_day"
  | "recovering"

export type MealTiming =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "pre_workout"
  | "post_workout"
  | "late_night_prevention"
  | "snack"
  | "convenience"

export type RecommendationIntensity =
  | "strict_loss"
  | "realistic_diet"
  | "athlete_balanced"
  | "carb_refuel"
  | "high_protein_low_fat"
  | "light_dinner"
  | "satiety_focus"
  | "sodium_control"

export type NutritionStrategySettings = {
  goal: NutritionGoal
  trainingStatus: TrainingStatus
  mealTiming: MealTiming
  intensity: RecommendationIntensity
}

export const NUTRITION_GOAL_OPTIONS: Array<{ id: NutritionGoal; label: string }> = [
  { id: "fat_loss_priority", label: "감량 우선" },
  { id: "fat_loss_train_maintain", label: "체지방 감량 + 훈련 유지" },
  { id: "running_performance", label: "러닝 퍼포먼스 유지" },
  { id: "post_workout_recovery", label: "운동 후 회복" },
  { id: "muscle_maintain", label: "근육량 유지/증가" },
  { id: "race_prep", label: "대회 준비" },
  { id: "light_management", label: "가벼운 식단 관리" },
  { id: "aggressive_diet", label: "강한 다이어트 모드" },
]

export const TRAINING_STATUS_OPTIONS: Array<{ id: TrainingStatus; label: string }> = [
  { id: "rest", label: "휴식일" },
  { id: "easy_jog", label: "가벼운 조깅" },
  { id: "moderate_run", label: "중강도 러닝" },
  { id: "interval_speed", label: "인터벌/스피드 훈련" },
  { id: "long_lsd", label: "장거리 LSD" },
  { id: "weight_training", label: "웨이트 병행" },
  { id: "race_day", label: "경기/대회 당일" },
  { id: "recovering", label: "운동 후 회복 중" },
]

export const MEAL_TIMING_OPTIONS: Array<{ id: MealTiming; label: string }> = [
  { id: "breakfast", label: "아침" },
  { id: "lunch", label: "점심" },
  { id: "dinner", label: "저녁" },
  { id: "pre_workout", label: "운동 전" },
  { id: "post_workout", label: "운동 후" },
  { id: "late_night_prevention", label: "야식 방지용" },
  { id: "snack", label: "간식" },
  { id: "convenience", label: "편의점/외식 대체" },
]

export const RECOMMENDATION_INTENSITY_OPTIONS: Array<{
  id: RecommendationIntensity
  label: string
}> = [
  { id: "strict_loss", label: "엄격한 감량식" },
  { id: "realistic_diet", label: "현실적인 다이어트식" },
  { id: "athlete_balanced", label: "운동하는 사람용 균형식" },
  { id: "carb_refuel", label: "탄수화물 보충식" },
  { id: "high_protein_low_fat", label: "고단백 저지방식" },
  { id: "light_dinner", label: "저녁 가벼운 식사" },
  { id: "satiety_focus", label: "포만감 중심" },
  { id: "sodium_control", label: "나트륨 조절식" },
]

export function labelForGoal(id: NutritionGoal): string {
  return NUTRITION_GOAL_OPTIONS.find((o) => o.id === id)?.label ?? id
}

export function labelForTraining(id: TrainingStatus): string {
  return TRAINING_STATUS_OPTIONS.find((o) => o.id === id)?.label ?? id
}

export function labelForMealTiming(id: MealTiming): string {
  return MEAL_TIMING_OPTIONS.find((o) => o.id === id)?.label ?? id
}

export function labelForIntensity(id: RecommendationIntensity): string {
  return RECOMMENDATION_INTENSITY_OPTIONS.find((o) => o.id === id)?.label ?? id
}

export type StrategyProfile = {
  proteinWeight: number
  carbWeight: number
  fatPenalty: number
  fiberWeight: number
  sodiumPenalty: number
  calorieMaxPer100g: number
  preferLowFat: boolean
  preferHighCarb: boolean
  preferHighProtein: boolean
  preferSatiety: boolean
  guidance: string
  bucketBoost: Partial<Record<RecommendationBucket, number>>
  templatePriority: string[]
}

export function mealTimingToContext(timing: MealTiming): MealContext {
  switch (timing) {
    case "breakfast":
      return "breakfast"
    case "lunch":
      return "lunch"
    case "dinner":
    case "late_night_prevention":
      return "dinner"
    case "pre_workout":
      return "pre_workout"
    case "post_workout":
      return "post_workout"
    case "snack":
    case "convenience":
      return "snack"
    default:
      return "lunch"
  }
}

export function trainingStatusToIntensity(status: TrainingStatus): TrainingIntensity {
  switch (status) {
    case "rest":
    case "recovering":
      return "none"
    case "easy_jog":
      return "low"
    case "moderate_run":
    case "weight_training":
      return "medium"
    case "interval_speed":
    case "long_lsd":
    case "race_day":
      return "high"
    default:
      return "medium"
  }
}

export function hasTrainingToday(status: TrainingStatus): boolean {
  return status !== "rest"
}

export function inferDefaultMealTiming(): MealTiming {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 10) return "breakfast"
  if (hour >= 10 && hour < 15) return "lunch"
  if (hour >= 17 && hour < 22) return "dinner"
  return "snack"
}

export function inferDefaultStrategySettings(): NutritionStrategySettings {
  return {
    goal: "fat_loss_train_maintain",
    trainingStatus: "moderate_run",
    mealTiming: inferDefaultMealTiming(),
    intensity: "realistic_diet",
  }
}

export function buildStrategyProfile(
  settings: NutritionStrategySettings
): StrategyProfile {
  const base: StrategyProfile = {
    proteinWeight: 1,
    carbWeight: 1,
    fatPenalty: 1,
    fiberWeight: 1,
    sodiumPenalty: 1,
    calorieMaxPer100g: 400,
    preferLowFat: false,
    preferHighCarb: false,
    preferHighProtein: false,
    preferSatiety: false,
    guidance: "오늘 훈련량과 섭취량을 기준으로 균형 잡힌 식사를 추천합니다.",
    bucketBoost: {},
    templatePriority: [
      "optimal_meal",
      "fat_loss_realistic",
      "gap_fill",
      "high_protein_low_fat",
      "korean_adjust",
    ],
  }

  switch (settings.goal) {
    case "fat_loss_priority":
      base.preferHighProtein = true
      base.preferLowFat = true
      base.preferSatiety = true
      base.fatPenalty = 1.4
      base.calorieMaxPer100g = 280
      base.guidance =
        "오늘은 칼로리를 엄격히 관리하고, 단백질·포만감을 우선하세요."
      base.bucketBoost.high_protein = 1.3
      base.bucketBoost.salad_veggie = 1.2
      break
    case "fat_loss_train_maintain":
      base.preferHighProtein = true
      base.preferLowFat = true
      base.guidance =
        "오늘은 단백질을 우선하고, 탄수화물은 훈련량에 맞춰 조절하세요."
      base.bucketBoost.high_protein = 1.2
      base.bucketBoost.carbs_starch = 1.1
      break
    case "running_performance":
      base.preferHighCarb = true
      base.carbWeight = 1.4
      base.guidance =
        "러닝 퍼포먼스 유지를 위해 소화 잘 되는 탄수화물과 적정 단백질을 챙기세요."
      base.bucketBoost.carbs_starch = 1.4
      base.bucketBoost.fruit = 1.2
      break
    case "post_workout_recovery":
      base.preferHighCarb = true
      base.preferHighProtein = true
      base.carbWeight = 1.3
      base.proteinWeight = 1.3
      base.guidance = "운동 후 회복을 위해 탄수화물과 단백질을 함께 보충하세요."
      base.bucketBoost.post_workout = 1.5
      base.bucketBoost.carbs_starch = 1.3
      break
    case "muscle_maintain":
      base.preferHighProtein = true
      base.proteinWeight = 1.5
      base.guidance = "근육 유지·증가를 위해 고단백 식품을 분산해서 섭취하세요."
      base.bucketBoost.high_protein = 1.4
      base.bucketBoost.egg_tofu_bean = 1.3
      base.bucketBoost.fish_seafood = 1.2
      break
    case "race_prep":
      base.preferHighCarb = true
      base.carbWeight = 1.5
      base.guidance = "대회 준비 기간에는 탄수화물 충전과 소화 편의성을 우선하세요."
      base.bucketBoost.carbs_starch = 1.5
      base.bucketBoost.fruit = 1.3
      break
    case "light_management":
      base.calorieMaxPer100g = 320
      base.guidance = "무리하지 않는 범위에서 영양 균형을 맞추는 식단을 추천합니다."
      break
    case "aggressive_diet":
      base.preferHighProtein = true
      base.preferLowFat = true
      base.preferSatiety = true
      base.fatPenalty = 1.6
      base.calorieMaxPer100g = 220
      base.guidance = "강한 감량 모드 — 저칼로리·고단백·고포만감 식단을 우선합니다."
      base.bucketBoost.salad_veggie = 1.4
      base.bucketBoost.high_protein = 1.3
      break
  }

  switch (settings.trainingStatus) {
    case "rest":
      base.carbWeight *= 0.85
      base.templatePriority.unshift("light_dinner", "fat_loss_realistic")
      break
    case "easy_jog":
      base.carbWeight *= 0.95
      break
    case "moderate_run":
      base.carbWeight *= 1.1
      break
    case "interval_speed":
      base.preferHighCarb = true
      base.carbWeight *= 1.25
      base.templatePriority.unshift("pre_run_energy")
      break
    case "long_lsd":
      base.preferHighCarb = true
      base.carbWeight *= 1.35
      base.templatePriority.unshift("post_workout", "pre_run_energy")
      break
    case "weight_training":
      base.proteinWeight *= 1.2
      base.bucketBoost.high_protein = (base.bucketBoost.high_protein ?? 1) * 1.2
      break
    case "race_day":
      base.preferHighCarb = true
      base.carbWeight *= 1.4
      base.templatePriority.unshift("pre_run_energy", "optimal_meal")
      break
    case "recovering":
      base.templatePriority.unshift("post_workout", "gap_fill")
      base.proteinWeight *= 1.15
      base.carbWeight *= 1.15
      break
  }

  switch (settings.mealTiming) {
    case "pre_workout":
      base.preferHighCarb = true
      base.preferLowFat = true
      base.fatPenalty *= 1.3
      base.calorieMaxPer100g = Math.min(base.calorieMaxPer100g, 300)
      base.templatePriority.unshift("pre_run_energy")
      break
    case "post_workout":
      base.templatePriority.unshift("post_workout", "optimal_meal")
      break
    case "late_night_prevention":
      base.preferSatiety = true
      base.preferLowFat = true
      base.fatPenalty *= 1.3
      base.templatePriority.unshift("satiety", "light_dinner")
      break
    case "convenience":
      base.bucketBoost.convenience = 1.5
      base.templatePriority.unshift("convenience")
      break
    case "dinner":
      base.templatePriority.unshift("light_dinner")
      break
  }

  switch (settings.intensity) {
    case "strict_loss":
      base.calorieMaxPer100g = Math.min(base.calorieMaxPer100g, 250)
      base.fatPenalty *= 1.3
      break
    case "realistic_diet":
      break
    case "athlete_balanced":
      base.carbWeight *= 1.1
      base.proteinWeight *= 1.1
      break
    case "carb_refuel":
      base.preferHighCarb = true
      base.carbWeight *= 1.4
      base.bucketBoost.carbs_starch = (base.bucketBoost.carbs_starch ?? 1) * 1.3
      break
    case "high_protein_low_fat":
      base.preferHighProtein = true
      base.preferLowFat = true
      base.proteinWeight *= 1.4
      base.fatPenalty *= 1.4
      base.templatePriority.unshift("high_protein_low_fat")
      break
    case "light_dinner":
      base.preferLowFat = true
      base.fatPenalty *= 1.3
      base.templatePriority.unshift("light_dinner")
      break
    case "satiety_focus":
      base.preferSatiety = true
      base.fiberWeight *= 1.4
      base.bucketBoost.fiber = 1.4
      base.bucketBoost.salad_veggie = 1.3
      base.templatePriority.unshift("satiety")
      break
    case "sodium_control":
      base.sodiumPenalty *= 1.6
      base.bucketBoost.soup_stew = 0.3
      base.bucketBoost.convenience = 0.7
      break
  }

  return base
}

export function bucketsForStrategy(
  flags: string[],
  profile: StrategyProfile,
  settings: NutritionStrategySettings
): RecommendationBucket[] {
  const set = new Set<RecommendationBucket>([
    "korean_meal",
    "high_protein",
    "carbs_starch",
    "salad_veggie",
    "egg_tofu_bean",
    "fish_seafood",
  ])

  if (flags.includes("protein_low") || profile.preferHighProtein) {
    set.add("high_protein")
    set.add("egg_tofu_bean")
    set.add("fish_seafood")
  }
  if (flags.includes("carbs_low") || profile.preferHighCarb) {
    set.add("carbs_starch")
    set.add("fruit")
    set.add("post_workout")
  }
  if (flags.includes("fiber_low") || profile.preferSatiety) {
    set.add("fiber")
    set.add("fruit")
    set.add("salad_veggie")
  }
  if (flags.includes("sodium_high") || settings.intensity === "sodium_control") {
    set.add("salad_veggie")
    set.add("fruit")
  } else if (flags.includes("light_dinner")) {
    set.add("light_dinner")
    set.add("soup_stew")
  }
  if (
    flags.includes("post_workout") ||
    settings.mealTiming === "post_workout" ||
    settings.trainingStatus === "recovering" ||
    settings.trainingStatus === "long_lsd"
  ) {
    set.add("post_workout")
    set.add("carbs_starch")
    set.add("high_protein")
  }
  if (
    settings.mealTiming === "pre_workout" ||
    settings.trainingStatus === "interval_speed"
  ) {
    set.add("carbs_starch")
    set.add("fruit")
  }
  if (settings.mealTiming === "convenience" || flags.includes("convenience")) {
    set.add("convenience")
  }
  if (profile.preferHighProtein) {
    set.add("egg_tofu_bean")
    set.add("fish_seafood")
  }

  for (const [bucket, boost] of Object.entries(profile.bucketBoost) as Array<
    [RecommendationBucket, number]
  >) {
    if (boost >= 1.2) set.add(bucket)
  }

  return [...set]
}

export type DeficitChip = {
  label: string
  severity: "warn" | "caution" | "ok" | "good"
}

export function buildDeficitChips(analysis: NutritionDeficitAnalysis): DeficitChip[] {
  const chips: DeficitChip[] = []

  if (analysis.flags.includes("calorie_low")) {
    chips.push({ label: "칼로리 부족", severity: "warn" })
  } else if (analysis.calorieGap < -200) {
    chips.push({ label: "칼로리 여유 있음", severity: "caution" })
  }

  if (analysis.flags.includes("protein_low")) {
    chips.push({ label: "단백질 부족", severity: "warn" })
  }

  if (analysis.flags.includes("fiber_low")) {
    chips.push({ label: "식이섬유 부족", severity: "warn" })
  }

  if (analysis.flags.includes("sodium_high")) {
    chips.push({ label: "나트륨 주의", severity: "caution" })
  }

  if (analysis.flags.includes("fat_high")) {
    chips.push({ label: "지방 과다", severity: "caution" })
  }

  if (analysis.carbsGap > 40 && !analysis.flags.includes("carbs_low")) {
    chips.push({ label: "탄수화물 여유 있음", severity: "good" })
  } else if (analysis.flags.includes("carbs_low")) {
    chips.push({ label: "탄수화물 부족", severity: "warn" })
  }

  if (chips.length === 0) {
    chips.push({ label: "영양 균형 양호", severity: "good" })
  }

  return chips
}

export function buildStrategySummary(
  settings: NutritionStrategySettings,
  profile: StrategyProfile,
  analysis: NutritionDeficitAnalysis
): string {
  const parts: string[] = []

  if (analysis.flags.includes("protein_low")) {
    parts.push("단백질이 부족")
  }
  if (analysis.flags.includes("calorie_low")) {
    parts.push("칼로리가 부족")
  }
  if (analysis.flags.includes("fiber_low")) {
    parts.push("식이섬유가 부족")
  }
  if (analysis.flags.includes("sodium_high")) {
    parts.push("나트륨 섭취에 주의")
  }

  const timing = labelForMealTiming(settings.mealTiming)
  const prefix =
    parts.length > 0
      ? `현재 ${parts.join(", ")}하고 ${timing} 식사이므로 `
      : `${timing} 식사 기준으로 `

  if (profile.preferHighProtein && profile.preferLowFat) {
    return `${prefix}고단백·중저탄수·저지방 식사를 추천합니다.`
  }
  if (profile.preferHighCarb && settings.mealTiming === "pre_workout") {
    return `${prefix}소화 잘 되는 탄수화물 중심 에너지 보충식을 추천합니다.`
  }
  if (settings.trainingStatus === "long_lsd" || settings.mealTiming === "post_workout") {
    return `${prefix}탄수화물과 단백질 회복식을 추천합니다.`
  }
  if (profile.preferSatiety) {
    return `${prefix}포만감과 영양 균형을 동시에 챙기는 식사를 추천합니다.`
  }

  return `${prefix}${profile.guidance}`
}

/** 단백질 소스 다양성 — 닭가슴살만 반복 방지 */
export function proteinVariant(nameKo: string): string {
  const n = nameKo
  if (/닭|치킨/.test(n)) return "chicken"
  if (/계란|달걀/.test(n)) return "egg"
  if (/연어|고등어|참치|생선|새우|오징어|명태/.test(n)) return "fish"
  if (/소고기|쇠고기|우육/.test(n)) return "beef"
  if (/돼지|안심|목살/.test(n)) return "pork"
  if (/두부|콩|두유|순두부/.test(n)) return "soy"
  if (/요거트|그릭/.test(n)) return "yogurt"
  if (/우유|치즈/.test(n)) return "dairy"
  return "other"
}
