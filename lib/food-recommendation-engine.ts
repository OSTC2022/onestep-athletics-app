import type { LoggedNutrition } from "@/lib/food-nutrition-utils"
import {
  buildTargetRangeForCombo,
  evaluationCriteriaForTemplate,
  intendedSlotToApplySlot,
  isSnackMealTiming,
  labelForIntendedMealSlot,
  resolveIntendedMealSlot,
  templateAllowedForMealTiming,
} from "@/lib/recommendation-meal-targets"
import {
  buildDeficitChips,
  buildStrategyProfile,
  buildStrategySummary,
  bucketsForStrategy,
  hasTrainingToday,
  inferDefaultStrategySettings,
  labelForGoal,
  labelForIntensity,
  labelForMealTiming,
  labelForTraining,
  mealTimingToContext,
  proteinVariant,
  trainingStatusToIntensity,
  type NutritionStrategySettings,
  type StrategyProfile,
} from "@/lib/food-recommendation-strategy"
import { fetchRecommendationCandidates } from "@/lib/food-items-candidates"
import type {
  FoodCandidate,
  MealContext,
  NutritionDeficitAnalysis,
  RecommendFoodCombo,
  RecommendFoodItem,
  RecommendFoodsRequest,
  RecommendFoodsResponse,
  ScoredCandidate,
  TrainingIntensity,
} from "@/lib/food-recommendation-types"

const MIN_SCORE = 28
const POOL_SIZE = 120
const MAX_COMBOS = 8

export function createSeededRandom(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export function dailyBaseSeed(): number {
  const d = new Date()
  const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i)
    hash |= 0
  }
  return hash
}

export function resolveStrategySettings(
  req: RecommendFoodsRequest
): NutritionStrategySettings {
  const defaults = inferDefaultStrategySettings()
  return {
    goal: req.goal ?? defaults.goal,
    trainingStatus: req.trainingStatus ?? defaults.trainingStatus,
    mealTiming: req.mealTiming ?? defaults.mealTiming,
    intensity: req.intensity ?? defaults.intensity,
  }
}

export function inferMealContext(
  override?: MealContext,
  hasTraining?: boolean
): MealContext {
  if (override) return override
  const hour = new Date().getHours()
  if (hasTraining && hour >= 17 && hour <= 21) return "post_workout"
  if (hour >= 5 && hour < 10) return "breakfast"
  if (hour >= 10 && hour < 15) return "lunch"
  if (hour >= 17 && hour < 22) return "dinner"
  return "snack"
}

export function analyzeNutritionState(
  req: RecommendFoodsRequest,
  mealContext: MealContext,
  hasTraining: boolean,
  settings: NutritionStrategySettings
): NutritionDeficitAnalysis {
  const t = req.targets
  const c = req.consumed
  const targetFiber = t.fiberG ?? 25
  const targetSodium = t.sodiumMg ?? 2000
  const targetSugar = t.sugarG ?? 50

  const calorieGap = t.calories - c.calories
  const proteinGap = t.proteinG - c.proteinG
  const carbsGap = t.carbsG - c.carbsG
  const fatGap = t.fatG - c.fatG
  const fiberGap = targetFiber - c.fiberG
  const sodiumExcess = c.sodiumMg - targetSodium
  const sugarExcess = c.sugarG - targetSugar

  const flags: string[] = []

  if (calorieGap > 120) flags.push("calorie_low")
  if (proteinGap > 15) flags.push("protein_low")
  if (carbsGap > 25) flags.push("carbs_low")
  if (fatGap < -15) flags.push("fat_high")
  if (fiberGap > 5) flags.push("fiber_low")
  if (sodiumExcess > 400) flags.push("sodium_high")
  if (sugarExcess > 15) flags.push("sugar_high")

  if (
    hasTraining &&
    (mealContext === "post_workout" ||
      settings.mealTiming === "post_workout" ||
      settings.trainingStatus === "recovering" ||
      settings.trainingStatus === "long_lsd")
  ) {
    flags.push("post_workout")
  }
  if (mealContext === "dinner" || settings.mealTiming === "late_night_prevention") {
    flags.push("light_dinner")
  }
  if (mealContext === "snack" || settings.mealTiming === "convenience") {
    flags.push("convenience")
  }
  if (mealContext === "pre_workout" || settings.mealTiming === "pre_workout") {
    flags.push("pre_workout")
  }

  return {
    calorieGap,
    proteinGap,
    carbsGap,
    fatGap,
    fiberGap,
    sodiumExcess,
    sugarExcess,
    flags,
  }
}

function fiberPer100(c: FoodCandidate): number {
  return c.per100g.fiberG ?? estimateFiber(c)
}

function sugarPer100(c: FoodCandidate): number {
  return c.per100g.sugarG ?? c.per100g.carbsG * 0.2
}

function estimateFiber(c: FoodCandidate): number {
  if (c.bucket === "salad_veggie" || c.bucket === "fiber") return 3
  if (c.bucket === "fruit") return 2.5
  if (c.bucket === "carbs_starch") return 1.5
  return 0.8
}

function inferRole(c: FoodCandidate): ScoredCandidate["role"] {
  if (
    c.bucket === "high_protein" ||
    c.bucket === "fish_seafood" ||
    c.bucket === "egg_tofu_bean" ||
    c.bucket === "dairy_yogurt"
  ) {
    return "protein"
  }
  if (c.bucket === "carbs_starch" || c.bucket === "post_workout" || c.bucket === "fruit") {
    return "carb"
  }
  if (c.bucket === "salad_veggie" || c.bucket === "fiber") return "veg"
  if (c.bucket === "soup_stew") return "side"
  return "any"
}

function scoreCandidate(
  c: FoodCandidate,
  analysis: NutritionDeficitAnalysis,
  mealContext: MealContext,
  recentIds: Set<string>,
  trainingIntensity: TrainingIntensity,
  profile: StrategyProfile
): number {
  const p = c.per100g
  let score = 40

  if (analysis.flags.includes("protein_low") && p.proteinG >= 8) {
    score += Math.min(25, p.proteinG * 1.5) * profile.proteinWeight
  }
  if (profile.preferHighProtein && p.proteinG >= 10) {
    score += Math.min(18, p.proteinG) * (profile.proteinWeight - 0.5)
  }
  if (analysis.flags.includes("calorie_low") && p.calories >= 80 && p.calories <= profile.calorieMaxPer100g) {
    score += 12
  }
  if ((analysis.flags.includes("carbs_low") || profile.preferHighCarb) && p.carbsG >= 15) {
    score += Math.min(18, p.carbsG * 0.4) * profile.carbWeight
  }
  if ((analysis.flags.includes("fiber_low") || profile.preferSatiety) && fiberPer100(c) >= 2) {
    score += Math.min(20, fiberPer100(c) * 4) * profile.fiberWeight
  }
  if (analysis.flags.includes("sodium_high") && p.sodiumMg < 400) {
    score += 15 * profile.sodiumPenalty
  }
  if (settingsSodiumControl(profile) && p.sodiumMg > 600) {
    score -= 20 * profile.sodiumPenalty
  }
  if (c.bucket === "soup_stew" && analysis.flags.includes("sodium_high")) {
    score -= 25 * profile.sodiumPenalty
  }
  if ((analysis.flags.includes("fat_high") || profile.preferLowFat) && p.fatG < 8) {
    score += 12 * profile.fatPenalty
  }
  if (profile.preferLowFat && p.fatG > 15) {
    score -= 15 * profile.fatPenalty
  }
  if (analysis.flags.includes("sugar_high") && sugarPer100(c) < 8) {
    score += 10
  }

  if (mealContext === "dinner" && p.fatG > 18) score -= 15 * profile.fatPenalty
  if (mealContext === "dinner" && p.calories > profile.calorieMaxPer100g) score -= 10
  if (mealContext === "pre_workout" && p.fatG > 12) score -= 18
  if (mealContext === "pre_workout" && p.carbsG >= 15 && p.fatG < 8) score += 20
  if (mealContext === "post_workout" && p.proteinG >= 5 && p.carbsG >= 10) {
    score += 18
  }
  if (trainingIntensity === "high" && p.carbsG >= 12) score += 8

  const bucketBoost = profile.bucketBoost[c.bucket]
  if (bucketBoost && bucketBoost > 1) {
    score += (bucketBoost - 1) * 20
  }
  if (bucketBoost && bucketBoost < 1) {
    score -= (1 - bucketBoost) * 30
  }

  if (recentIds.has(c.id)) score -= 35

  if (p.calories <= 0 || p.proteinG < 0) score -= 50

  return Math.max(0, Math.round(score))
}

function settingsSodiumControl(profile: StrategyProfile): boolean {
  return profile.sodiumPenalty >= 1.5
}

function nutritionAtGrams(c: FoodCandidate, grams: number) {
  const f = grams / 100
  const p = c.per100g
  return {
    calories: Math.round(p.calories * f),
    protein: Math.round(p.proteinG * f * 10) / 10,
    carbs: Math.round(p.carbsG * f * 10) / 10,
    fat: Math.round(p.fatG * f * 10) / 10,
    fiber: Math.round(fiberPer100(c) * f * 10) / 10,
    sodium: Math.round(p.sodiumMg * f),
    sugar: Math.round(sugarPer100(c) * f * 10) / 10,
  }
}

function defaultPortionG(
  c: FoodCandidate,
  role: ScoredCandidate["role"],
  profile: StrategyProfile
): number {
  const base = c.pieceWeightG
  let grams: number
  if (role === "protein") grams = Math.min(Math.max(base, 80), 180)
  else if (role === "carb") grams = Math.min(Math.max(base, 120), 250)
  else if (role === "veg") grams = Math.min(Math.max(base, 80), 200)
  else grams = Math.min(Math.max(base, 80), 150)

  if (profile.calorieMaxPer100g <= 250) {
    grams = Math.round(grams * 0.85)
  }
  return grams
}

function toRecommendItem(c: FoodCandidate, grams: number): RecommendFoodItem {
  const n = nutritionAtGrams(c, grams)
  return {
    id: c.id,
    nameKo: c.nameKo,
    category: c.category,
    amountG: grams,
    calories: n.calories,
    protein: n.protein,
    carbs: n.carbs,
    fat: n.fat,
    fiber: n.fiber,
    sodium: n.sodium,
    sugar: n.sugar,
  }
}

function sumItems(items: RecommendFoodItem[]) {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: Math.round((acc.protein + item.protein) * 10) / 10,
      carbs: Math.round((acc.carbs + item.carbs) * 10) / 10,
      fat: Math.round((acc.fat + item.fat) * 10) / 10,
      fiber: Math.round((acc.fiber + item.fiber) * 10) / 10,
      sodium: acc.sodium + item.sodium,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 }
  )
}

function weightedSample(
  pool: ScoredCandidate[],
  count: number,
  rand: () => number
): ScoredCandidate[] {
  const eligible = pool.filter((c) => c.score >= MIN_SCORE)
  if (eligible.length === 0) return []

  const picked: ScoredCandidate[] = []
  const used = new Set<string>()
  const bucketCount = new Map<string, number>()
  const proteinVariants = new Set<string>()

  for (let i = 0; i < count && eligible.length > 0; i++) {
    const candidates = eligible.filter(
      (c) =>
        !used.has(c.id) &&
        (bucketCount.get(c.bucket) ?? 0) < 2 &&
        (c.role !== "protein" ||
          !proteinVariants.has(c.proteinVariant ?? proteinVariant(c.nameKo)))
    )
    if (candidates.length === 0) break

    const weights = candidates.map((c) => Math.pow(c.score, 1.35))
    const total = weights.reduce((a, b) => a + b, 0)
    let r = rand() * total
    let chosen = candidates[candidates.length - 1]
    for (let j = 0; j < candidates.length; j++) {
      r -= weights[j]
      if (r <= 0) {
        chosen = candidates[j]
        break
      }
    }

    picked.push(chosen)
    used.add(chosen.id)
    bucketCount.set(chosen.bucket, (bucketCount.get(chosen.bucket) ?? 0) + 1)
    if (chosen.role === "protein") {
      proteinVariants.add(chosen.proteinVariant ?? proteinVariant(chosen.nameKo))
    }
  }

  return picked
}

function pickByRole(
  pool: ScoredCandidate[],
  role: ScoredCandidate["role"],
  rand: () => number,
  exclude: Set<string>,
  proteinVariants: Set<string>
): ScoredCandidate | null {
  const filtered = pool.filter(
    (c) =>
      c.role === role &&
      !exclude.has(c.id) &&
      c.score >= MIN_SCORE &&
      (role !== "protein" ||
        !proteinVariants.has(c.proteinVariant ?? proteinVariant(c.nameKo)))
  )
  if (filtered.length === 0) {
    const fallback = pool.filter((c) => !exclude.has(c.id) && c.score >= MIN_SCORE)
    if (fallback.length === 0) return null
    return weightedSample(fallback, 1, rand)[0] ?? null
  }
  return weightedSample(filtered, 1, rand)[0] ?? null
}

type ComboTemplate = {
  id: string
  title: string
  level: string
  situation: string
  tags: string[]
  reason: (a: NutritionDeficitAnalysis, ctx: MealContext, s: NutritionStrategySettings) => string
  roles: Array<{ role: ScoredCandidate["role"]; optional?: boolean }>
  when: (a: NutritionDeficitAnalysis, ctx: MealContext, s: NutritionStrategySettings) => boolean
}

const COMBO_TEMPLATES: ComboTemplate[] = [
  {
    id: "optimal_meal",
    title: "오늘의 최적 식사",
    level: "운동하는 사람용 균형식",
    situation: "오늘 훈련·영양 상태에 가장 잘 맞는 조합",
    tags: ["최적 추천", "맞춤"],
    reason: (a, ctx, s) =>
      `${labelForMealTiming(s.mealTiming)} 기준으로 현재 ${a.proteinGap > 15 ? "단백질 부족" : "영양 균형"} 상태에 맞춘 최적 조합입니다.`,
    roles: [{ role: "protein" }, { role: "carb" }, { role: "veg" }],
    when: () => true,
  },
  {
    id: "fat_loss_realistic",
    title: "감량용 현실 식사",
    level: "현실적인 다이어트식",
    situation: "무리 없이 지속 가능한 감량 식단",
    tags: ["감량", "현실식"],
    reason: () =>
      "무리하지 않는 한식·단백질·채소 조합으로 감량과 훈련을 동시에 고려했습니다.",
    roles: [{ role: "protein" }, { role: "carb", optional: true }, { role: "veg" }],
    when: (a, _, s) =>
      s.goal === "fat_loss_priority" ||
      s.goal === "fat_loss_train_maintain" ||
      s.goal === "aggressive_diet" ||
      s.intensity === "realistic_diet" ||
      s.intensity === "strict_loss",
  },
  {
    id: "post_workout",
    title: "운동 후 회복식",
    level: "탄수화물 보충식",
    situation: "훈련 직후 회복·근손실 방지",
    tags: ["운동 후", "회복", "탄단백"],
    reason: (a) =>
      `운동 후 탄수화물(${Math.max(0, Math.round(a.carbsGap))}g 부족)과 단백질을 함께 보충합니다.`,
    roles: [{ role: "carb" }, { role: "protein" }, { role: "protein", optional: true }],
    when: (a, ctx, s) =>
      a.flags.includes("post_workout") ||
      ctx === "post_workout" ||
      s.mealTiming === "post_workout" ||
      s.trainingStatus === "recovering" ||
      s.trainingStatus === "long_lsd",
  },
  {
    id: "pre_run_energy",
    title: "러닝 전 에너지 보충식",
    level: "탄수화물 보충식",
    situation: "인터벌·LSD·대회 전 에너지 충전",
    tags: ["운동 전", "러닝", "탄수화물"],
    reason: () =>
      "소화 부담이 적고 빠르게 에너지를 공급하는 탄수화물 중심 조합입니다.",
    roles: [{ role: "carb" }, { role: "carb", optional: true }, { role: "side", optional: true }],
    when: (a, ctx, s) =>
      ctx === "pre_workout" ||
      s.mealTiming === "pre_workout" ||
      s.trainingStatus === "interval_speed" ||
      s.trainingStatus === "race_day" ||
      a.flags.includes("pre_workout"),
  },
  {
    id: "light_dinner",
    title: "저녁 가벼운 식사",
    level: "저녁 가벼운 식사",
    situation: "저녁·야식 방지용 저지방 식단",
    tags: ["저녁", "가벼운 식사"],
    reason: () =>
      "저녁 시간대에 과한 지방·탄수를 피하고 단백질·채소 위주로 구성했습니다.",
    roles: [{ role: "protein" }, { role: "veg" }, { role: "carb", optional: true }],
    when: (a, ctx, s) =>
      ctx === "dinner" ||
      s.mealTiming === "dinner" ||
      s.mealTiming === "late_night_prevention" ||
      s.intensity === "light_dinner" ||
      a.flags.includes("light_dinner"),
  },
  {
    id: "high_protein_low_fat",
    title: "고단백 저지방 식사",
    level: "고단백 저지방식",
    situation: "단백질 보충 + 지방 제한",
    tags: ["고단백", "저지방"],
    reason: (a) =>
      `단백질 ${Math.max(0, Math.round(a.proteinGap))}g 부족 — 닭·생선·계란·두부 등 다양한 단백질 소스로 구성했습니다.`,
    roles: [{ role: "protein" }, { role: "protein" }, { role: "veg", optional: true }],
    when: (a, _, s) =>
      a.flags.includes("protein_low") ||
      s.intensity === "high_protein_low_fat" ||
      s.goal === "muscle_maintain",
  },
  {
    id: "satiety",
    title: "포만감 높은 식사",
    level: "포만감 중심",
    situation: "적은 칼로리로 오래 배부른 식단",
    tags: ["포만감", "식이섬유"],
    reason: (a) =>
      `식이섬유 ${Math.max(0, Math.round(a.fiberGap))}g 부족 — 채소·잡곡·고구마로 포만감을 높였습니다.`,
    roles: [{ role: "veg" }, { role: "veg" }, { role: "carb", optional: true }],
    when: (a, _, s) =>
      a.flags.includes("fiber_low") ||
      s.intensity === "satiety_focus" ||
      s.mealTiming === "late_night_prevention" ||
      s.goal === "fat_loss_priority",
  },
  {
    id: "snack_light",
    title: "간식·가벼운 보충",
    level: "간식 기준",
    situation: "100~250kcal 가벼운 간식",
    tags: ["간식", "가벼운 보충"],
    reason: () =>
      "간식 칸에 적합한 가벼운 칼로리로 구성했습니다. 그릭요거트, 계란, 바나나, 고구마 소량 등.",
    roles: [{ role: "protein" }, { role: "carb", optional: true }],
    when: (_, __, s) =>
      isSnackMealTiming(s.mealTiming) ||
      s.mealTiming === "late_night_prevention" ||
      s.mealTiming === "pre_workout",
  },
  {
    id: "convenience",
    title: "편의점/간편식 조합",
    level: "현실적인 다이어트식",
    situation: "바쁠 때·외식 대체",
    tags: ["간편식", "편의점"],
    reason: () => "현실적으로 구할 수 있는 간편식으로 영양 균형을 맞췄습니다.",
    roles: [{ role: "protein" }, { role: "carb" }, { role: "side", optional: true }],
    when: (a, ctx, s) =>
      ctx === "snack" ||
      s.mealTiming === "convenience" ||
      s.mealTiming === "snack" ||
      a.flags.includes("convenience"),
  },
  {
    id: "korean_adjust",
    title: "한식 일반식 조절 버전",
    level: "현실적인 다이어트식",
    situation: "익숙한 한식을 목표에 맞게 조절",
    tags: ["한식", "조절"],
    reason: (a) =>
      a.fatGap < -10
        ? "지방 섭취가 많은 편이라 밥·반찬 비율을 조절한 한식 조합입니다."
        : "익숙한 한식 메뉴를 목표 칼로리에 맞게 조절한 버전입니다.",
    roles: [{ role: "protein" }, { role: "carb" }, { role: "side" }],
    when: () => true,
  },
  {
    id: "gap_fill",
    title: "부족 영양소 보완식",
    level: "운동하는 사람용 균형식",
    situation: "오늘 부족한 영양소 집중 보충",
    tags: ["영양 보완", "맞춤"],
    reason: (a) => {
      const parts: string[] = []
      if (a.flags.includes("protein_low")) parts.push("단백질")
      if (a.flags.includes("carbs_low")) parts.push("탄수화물")
      if (a.flags.includes("fiber_low")) parts.push("식이섬유")
      if (a.flags.includes("calorie_low")) parts.push("칼로리")
      return parts.length > 0
        ? `오늘 ${parts.join(", ")} 부족 상태를 보완하는 조합입니다.`
        : "오늘 영양 균형을 유지하는 보완 조합입니다."
    },
    roles: [
      { role: "protein" },
      { role: "carb", optional: true },
      { role: "veg" },
      { role: "side", optional: true },
    ],
    when: (a) =>
      a.flags.includes("calorie_low") ||
      a.flags.includes("protein_low") ||
      a.flags.includes("carbs_low") ||
      a.flags.includes("fiber_low"),
  },
]

function sortTemplatesByPriority(
  templates: ComboTemplate[],
  profile: StrategyProfile
): ComboTemplate[] {
  const priority = profile.templatePriority
  return [...templates].sort((a, b) => {
    const ai = priority.indexOf(a.id)
    const bi = priority.indexOf(b.id)
    const aRank = ai === -1 ? 999 : ai
    const bRank = bi === -1 ? 999 : bi
    return aRank - bRank
  })
}

function scaleRecommendItems(
  items: RecommendFoodItem[],
  maxCalories: number
): RecommendFoodItem[] {
  const total = sumItems(items)
  if (total.calories <= maxCalories) return items
  const factor = maxCalories / total.calories
  return items.map((item) => ({
    ...item,
    amountG: Math.max(25, Math.round(item.amountG * factor)),
    calories: Math.round(item.calories * factor),
    protein: Math.round(item.protein * factor * 10) / 10,
    carbs: Math.round(item.carbs * factor * 10) / 10,
    fat: Math.round(item.fat * factor * 10) / 10,
    fiber: Math.round(item.fiber * factor * 10) / 10,
    sodium: Math.round(item.sodium * factor),
    sugar: Math.round(item.sugar * factor * 10) / 10,
  }))
}

function snackPortionScale(settings: NutritionStrategySettings): number {
  if (settings.trainingStatus === "long_lsd" || settings.trainingStatus === "interval_speed") {
    return 0.85
  }
  return 0.65
}

function buildComboFromTemplate(
  template: ComboTemplate,
  pool: ScoredCandidate[],
  analysis: NutritionDeficitAnalysis,
  mealContext: MealContext,
  settings: NutritionStrategySettings,
  profile: StrategyProfile,
  rand: () => number,
  variantSeed: number
): RecommendFoodCombo | null {
  const used = new Set<string>()
  const proteinVariants = new Set<string>()
  const items: RecommendFoodItem[] = []
  const isSnack =
    template.id === "snack_light" ||
    isSnackMealTiming(settings.mealTiming) ||
    settings.mealTiming === "pre_workout"

  for (const slot of template.roles) {
    const picked = pickByRole(pool, slot.role, rand, used, proteinVariants)
    if (!picked) {
      if (slot.optional) continue
      return null
    }
    used.add(picked.id)
    if (picked.role === "protein") {
      proteinVariants.add(picked.proteinVariant ?? proteinVariant(picked.nameKo))
    }
    let grams = defaultPortionG(picked, picked.role, profile)
    if (isSnack) grams = Math.round(grams * snackPortionScale(settings))
    items.push(toRecommendItem(picked, grams))
  }

  const minItems = template.id === "snack_light" ? 1 : 2
  if (items.length < minItems) return null

  let finalItems = items
  if (isSnack) {
    finalItems = scaleRecommendItems(finalItems, 250)
  }

  const total = sumItems(finalItems)

  if (
    !isSnack &&
    template.id !== "post_workout" &&
    analysis.calorieGap > 0 &&
    analysis.calorieGap < 350 &&
    total.calories > analysis.calorieGap + 120
  ) {
    return null
  }

  if (
    isSnack &&
    total.calories > 300 &&
    settings.trainingStatus !== "long_lsd"
  ) {
    finalItems = scaleRecommendItems(finalItems, 250)
  }

  const finalTotal = sumItems(finalItems)
  const intendedMealSlot = resolveIntendedMealSlot(
    template.id,
    settings.mealTiming,
    settings.trainingStatus
  )
  const applyMealSlotId = intendedSlotToApplySlot(intendedMealSlot, settings.mealTiming)
  const criteria = evaluationCriteriaForTemplate(template.id, settings.goal)
  const targetRange = buildTargetRangeForCombo(
    template.id,
    intendedMealSlot,
    finalTotal,
    analysis.calorieGap,
    settings.goal
  )

  return {
    id: `${template.id}-${variantSeed}-${finalItems.map((i) => i.id).join("-").slice(0, 40)}`,
    title: template.title,
    reason: template.reason(analysis, mealContext, settings),
    type: "meal_combo",
    level: template.level,
    situation: template.situation,
    recommendedPurpose: criteria.purpose,
    intendedMealSlot,
    applyMealSlotId,
    recommendedSlotLabel: labelForIntendedMealSlot(intendedMealSlot),
    evaluationCriteria: { label: criteria.label, badge: criteria.badge },
    targetRange,
    goalMode: labelForGoal(settings.goal),
    tags: template.tags,
    items: finalItems,
    total: finalTotal,
  }
}

function buildResponseMeta(
  req: RecommendFoodsRequest,
  settings: NutritionStrategySettings,
  profile: StrategyProfile,
  analysis: NutritionDeficitAnalysis,
  mealContext: MealContext,
  recommendations: RecommendFoodCombo[],
  candidateCount: number,
  relaxed?: boolean
): RecommendFoodsResponse {
  return {
    recommendations,
    analysis,
    mealContext,
    candidateCount,
    relaxed,
    mode: labelForGoal(settings.goal),
    trainingStatus: labelForTraining(settings.trainingStatus),
    mealTiming: labelForMealTiming(settings.mealTiming),
    intensity: labelForIntensity(settings.intensity),
    summary: buildStrategySummary(settings, profile, analysis),
    strategy: {
      title: `${labelForGoal(settings.goal)} 모드`,
      guidance: profile.guidance,
    },
    deficits: buildDeficitChips(analysis),
  }
}

function runEngine(
  req: RecommendFoodsRequest,
  candidates: FoodCandidate[],
  relaxed: boolean
): RecommendFoodsResponse {
  const settings = resolveStrategySettings(req)
  const profile = buildStrategyProfile(settings)
  const hasTraining =
    req.hasTrainingToday ?? hasTrainingToday(settings.trainingStatus)
  const mealContext = req.mealContext ?? mealTimingToContext(settings.mealTiming)
  const trainingIntensity: TrainingIntensity =
    req.trainingIntensity ?? trainingStatusToIntensity(settings.trainingStatus)

  const analysis = analyzeNutritionState(req, mealContext, hasTraining, settings)
  const recentIds = new Set(req.recentFoodIds ?? [])

  const scored: ScoredCandidate[] = candidates.map((c) => ({
    ...c,
    proteinVariant: c.proteinVariant ?? proteinVariant(c.nameKo),
    role: inferRole(c),
    score: scoreCandidate(
      c,
      analysis,
      mealContext,
      recentIds,
      trainingIntensity,
      profile
    ),
  }))

  scored.sort((a, b) => b.score - a.score)
  const topPool = scored.slice(0, POOL_SIZE)

  const seed =
    dailyBaseSeed() +
    (req.variantSeed ?? 0) * 997 +
    settings.goal.length * 17 +
    settings.trainingStatus.length * 11
  const rand = createSeededRandom(seed)

  const recommendations: RecommendFoodCombo[] = []
  const usedComboIds = new Set(req.recentRecommendationIds ?? [])
  const sortedTemplates = sortTemplatesByPriority(COMBO_TEMPLATES, profile)

  for (const template of sortedTemplates) {
    if (!templateAllowedForMealTiming(template.id, settings.mealTiming)) continue
    if (!template.when(analysis, mealContext, settings)) continue
    const combo = buildComboFromTemplate(
      template,
      topPool,
      analysis,
      mealContext,
      settings,
      profile,
      rand,
      req.variantSeed ?? 0
    )
    if (!combo || usedComboIds.has(combo.id)) continue
    recommendations.push(combo)
    if (recommendations.length >= MAX_COMBOS) break
  }

  if (recommendations.length === 0 && topPool.length > 0) {
    const singles = weightedSample(topPool, 3, rand)
    for (const s of singles) {
      const grams = defaultPortionG(s, s.role, profile)
      const item = toRecommendItem(s, grams)
      recommendations.push({
        id: `single-${s.id}-${seed}`,
        title: s.nameKo,
        reason: "현재 조건에 맞는 대표 음식을 추천합니다.",
        type: "meal_combo",
        level: labelForIntensity(settings.intensity),
        situation: "단품 추천",
        recommendedPurpose: "맞춤 영양 전략",
        intendedMealSlot: resolveIntendedMealSlot(
          "optimal_meal",
          settings.mealTiming,
          settings.trainingStatus
        ),
        applyMealSlotId: intendedSlotToApplySlot(
          resolveIntendedMealSlot("optimal_meal", settings.mealTiming, settings.trainingStatus),
          settings.mealTiming
        ),
        recommendedSlotLabel: labelForIntendedMealSlot(
          resolveIntendedMealSlot("optimal_meal", settings.mealTiming, settings.trainingStatus)
        ),
        evaluationCriteria: {
          label: evaluationCriteriaForTemplate("optimal_meal", settings.goal).label,
          badge: evaluationCriteriaForTemplate("optimal_meal", settings.goal).badge,
        },
        targetRange: buildTargetRangeForCombo(
          "optimal_meal",
          resolveIntendedMealSlot("optimal_meal", settings.mealTiming, settings.trainingStatus),
          sumItems([item]),
          analysis.calorieGap,
          settings.goal
        ),
        goalMode: labelForGoal(settings.goal),
        tags: ["단품 추천"],
        items: [item],
        total: sumItems([item]),
      })
    }
  }

  return buildResponseMeta(
    req,
    settings,
    profile,
    analysis,
    mealContext,
    recommendations,
    candidates.length,
    relaxed
  )
}

export async function generateFoodRecommendations(
  req: RecommendFoodsRequest
): Promise<RecommendFoodsResponse> {
  const settings = resolveStrategySettings(req)
  const profile = buildStrategyProfile(settings)
  const hasTraining =
    req.hasTrainingToday ?? hasTrainingToday(settings.trainingStatus)
  const mealContext = req.mealContext ?? mealTimingToContext(settings.mealTiming)
  const analysis = analyzeNutritionState(req, mealContext, hasTraining, settings)
  const buckets = bucketsForStrategy(analysis.flags, profile, settings)

  let candidates = await fetchRecommendationCandidates(buckets, 35)
  let relaxed = false

  if (candidates.length < 40) {
    relaxed = true
    candidates = await fetchRecommendationCandidates(
      [
        "korean_meal",
        "high_protein",
        "carbs_starch",
        "salad_veggie",
        "egg_tofu_bean",
        "fish_seafood",
        "convenience",
        "fruit",
        "dairy_yogurt",
      ],
      45
    )
  }

  return runEngine(req, candidates, relaxed)
}

export function generateFoodRecommendationsFromCandidates(
  req: RecommendFoodsRequest,
  candidates: FoodCandidate[]
): RecommendFoodsResponse {
  return runEngine(req, candidates, false)
}
