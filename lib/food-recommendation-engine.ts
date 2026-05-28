import type { LoggedNutrition } from "@/lib/food-nutrition-utils"
import {
  isIndulgentFood,
  isPresentMacro,
  isStrictDietExcludedFood,
  strictDietFoodPenalty,
} from "@/lib/food-nutrition-quality"
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
} from "@/lib/food-recommendation-strategy"
import type {
  NutritionStrategySettings,
  StrategyProfile,
} from "@/lib/food-recommendation-strategy"
import {
  fetchRecommendationCandidatesWide,
  fetchRelaxedRecommendationCandidates,
  getAllRecommendationBuckets,
} from "@/lib/food-items-candidates"
import type { CandidateFetchStats } from "@/lib/food-items-candidates"
import { analyzeNutritionState } from "@/lib/nutrition-deficit-analysis"
import type {
  FoodCandidate,
  MealContext,
  NutritionDeficitAnalysis,
  RecommendFoodCombo,
  RecommendFoodItem,
  RecommendFoodsRequest,
  RecommendFoodsResponse,
  RecommendationPipelineStats,
  ScoredCandidate,
  TrainingIntensity,
} from "@/lib/food-recommendation-types"

const MIN_SCORE = 20
const POOL_SIZE = 300
const MAX_COMBOS = 8
const RELAXED_CANDIDATE_THRESHOLD = 500

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

export { analyzeNutritionState } from "@/lib/nutrition-deficit-analysis"

function macroNum(value: number | null | undefined): number | null {
  return isPresentMacro(value) ? value : null
}

function scaleMacro(
  value: number | null | undefined,
  factor: number,
  round = true
): number | null {
  if (!isPresentMacro(value)) return null
  const scaled = value * factor
  return round ? Math.round(scaled * 10) / 10 : Math.round(scaled)
}

function fiberPer100(c: FoodCandidate): number {
  if (isPresentMacro(c.per100g.fiberG)) return c.per100g.fiberG
  return estimateFiber(c)
}

function sugarPer100(c: FoodCandidate): number | null {
  if (isPresentMacro(c.per100g.sugarG)) return c.per100g.sugarG
  const carbs = macroNum(c.per100g.carbsG)
  if (carbs == null) return null
  return carbs * 0.2
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
  profile: StrategyProfile,
  intensity: NutritionStrategySettings["intensity"]
): number {
  const p = c.per100g
  const protein = macroNum(p.proteinG)
  const carbs = macroNum(p.carbsG)
  const fat = macroNum(p.fatG)
  const sodium = macroNum(p.sodiumMg)
  const calories = macroNum(p.calories) ?? 0
  const sugar = sugarPer100(c)
  let score = 40

  if (c.dataQuality === "complete") score += 10
  if (c.dataQuality === "partial") score -= 18
  if (c.dataQuality === "suspicious" || c.dataQuality === "invalid") score -= 120

  if (intensity === "strict_loss" || intensity === "aggressive_diet") {
    if (carbs == null) score -= 30
    if (fat == null) score -= 30
    if (sodium == null) score -= 18
  } else if (intensity === "realistic_diet") {
    if (carbs == null) score -= 12
    if (fat == null) score -= 12
    if (sodium == null) score -= 8
  }

  score += strictDietFoodPenalty(c.nameKo, c.category, intensity)

  if (analysis.flags.includes("protein_low") && protein != null && protein >= 8) {
    score += Math.min(25, protein * 1.5) * profile.proteinWeight
  }
  if (profile.preferHighProtein && protein != null && protein >= 10) {
    score += Math.min(18, protein) * (profile.proteinWeight - 0.5)
  }
  if (
    analysis.flags.includes("calorie_low") &&
    calories >= 80 &&
    calories <= profile.calorieMaxPer100g
  ) {
    score += 12
  }
  if (
    (analysis.flags.includes("carbs_low") || profile.preferHighCarb) &&
    carbs != null &&
    carbs >= 15
  ) {
    score += Math.min(18, carbs * 0.4) * profile.carbWeight
  }
  if ((analysis.flags.includes("fiber_low") || profile.preferSatiety) && fiberPer100(c) >= 2) {
    score += Math.min(20, fiberPer100(c) * 4) * profile.fiberWeight
  }
  if (analysis.flags.includes("sodium_high") && sodium != null && sodium < 400) {
    score += 15 * profile.sodiumPenalty
  }
  if (settingsSodiumControl(profile) && sodium != null && sodium > 600) {
    score -= 20 * profile.sodiumPenalty
  }
  if (c.bucket === "soup_stew" && analysis.flags.includes("sodium_high")) {
    score -= 25 * profile.sodiumPenalty
  }
  if ((analysis.flags.includes("fat_high") || profile.preferLowFat) && fat != null && fat < 8) {
    score += 12 * profile.fatPenalty
  }
  if (profile.preferLowFat && fat != null && fat > 15) {
    score -= 12 * profile.fatPenalty
  }
  if (profile.preferLowFat && fat != null && fat > 25) {
    score -= 10 * profile.fatPenalty
  }
  if (analysis.flags.includes("sugar_high") && sugar != null && sugar < 8) {
    score += 10
  }

  if (mealContext === "dinner" && fat != null && fat > 18) score -= 12 * profile.fatPenalty
  if (mealContext === "dinner" && calories > profile.calorieMaxPer100g) score -= 8
  if (mealContext === "pre_workout" && fat != null && fat > 12) score -= 14
  if (trainingIntensity === "none" && calories > 350) score -= 8
  if (
    (mealContext === "lunch" || mealContext === "dinner") &&
    (c.bucket === "korean_meal" ||
      c.bucket === "high_protein" ||
      c.bucket === "fish_seafood" ||
      c.bucket === "egg_tofu_bean" ||
      c.bucket === "salad_veggie")
  ) {
    score += 8
  }
  if (mealContext === "snack" && calories >= 50 && calories <= 300) {
    score += 10
  }
  if (mealContext === "pre_workout" && carbs != null && carbs >= 15 && (fat == null || fat < 8)) {
    score += 20
  }
  if (
    mealContext === "post_workout" &&
    protein != null &&
    protein >= 5 &&
    carbs != null &&
    carbs >= 10
  ) {
    score += 18
  }
  if (trainingIntensity === "high" && carbs != null && carbs >= 12) score += 8

  const bucketBoost = profile.bucketBoost[c.bucket]
  if (bucketBoost && bucketBoost > 1) {
    score += (bucketBoost - 1) * 20
  }
  if (bucketBoost && bucketBoost < 1) {
    score -= (1 - bucketBoost) * 30
  }

  if (recentIds.has(c.id)) score -= 35

  if (calories <= 0 || (protein != null && protein < 0)) score -= 50

  return Math.max(0, Math.round(score))
}

function settingsSodiumControl(profile: StrategyProfile): boolean {
  return profile.sodiumPenalty >= 1.5
}

function nutritionAtGrams(c: FoodCandidate, grams: number) {
  const f = grams / 100
  const p = c.per100g
  return {
    calories: Math.round((macroNum(p.calories) ?? 0) * f),
    protein: scaleMacro(p.proteinG, f) ?? 0,
    carbs: scaleMacro(p.carbsG, f),
    fat: scaleMacro(p.fatG, f),
    fiber: scaleMacro(fiberPer100(c), f) ?? 0,
    sodium: isPresentMacro(p.sodiumMg) ? Math.round(p.sodiumMg * f) : null,
    sugar: sugarPer100(c) != null ? scaleMacro(sugarPer100(c), f) : null,
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
    dataQuality: c.dataQuality,
  }
}

function sumNullable(a: number | null, b: number | null): number | null {
  if (a == null && b == null) return null
  return Math.round(((a ?? 0) + (b ?? 0)) * 10) / 10
}

function sumItems(items: RecommendFoodItem[]) {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: Math.round((acc.protein + item.protein) * 10) / 10,
      carbs: sumNullable(acc.carbs, item.carbs),
      fat: sumNullable(acc.fat, item.fat),
      fiber: Math.round((acc.fiber + item.fiber) * 10) / 10,
      sodium: sumNullable(acc.sodium, item.sodium),
    }),
    {
      calories: 0,
      protein: 0,
      carbs: null as number | null,
      fat: null as number | null,
      fiber: 0,
      sodium: null as number | null,
    }
  )
}

function candidateNameKey(c: FoodCandidate | ScoredCandidate): string {
  const rep = c.representativeName?.trim()
  if (rep && rep.length >= 2) return rep.toLowerCase()
  return c.nameKo
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, "")
    .slice(0, 16)
    .toLowerCase()
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
  const usedNameKeys = new Set<string>()
  const bucketCount = new Map<string, number>()
  const proteinVariants = new Set<string>()

  for (let i = 0; i < count && eligible.length > 0; i++) {
    const candidates = eligible.filter(
      (c) =>
        !used.has(c.id) &&
        !usedNameKeys.has(candidateNameKey(c)) &&
        (bucketCount.get(c.bucket) ?? 0) < 3 &&
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
    usedNameKeys.add(candidateNameKey(chosen))
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
  proteinVariants: Set<string>,
  excludeNameKeys: Set<string>
): ScoredCandidate | null {
  const filtered = pool.filter(
    (c) =>
      c.role === role &&
      !exclude.has(c.id) &&
      !excludeNameKeys.has(candidateNameKey(c)) &&
      c.score >= MIN_SCORE &&
      (role !== "protein" ||
        !proteinVariants.has(c.proteinVariant ?? proteinVariant(c.nameKo)))
  )
  if (filtered.length === 0) {
    const fallback = pool.filter(
      (c) =>
        !exclude.has(c.id) &&
        !excludeNameKeys.has(candidateNameKey(c)) &&
        c.score >= MIN_SCORE
    )
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
    id: "indulgent_adjust",
    title: "가끔 먹는 음식 조절 버전",
    level: "현실적인 다이어트식",
    situation: "피자·치킨 등은 소량 + 채소·단백질로 균형 맞추기",
    tags: ["소량 조절", "현실식"],
    reason: () =>
      "엄격한 제외 대신 소량만 포함하고 샐러드·단백질로 전체 칼로리와 영양 균형을 맞췄습니다.",
    roles: [{ role: "any" }, { role: "veg" }, { role: "protein", optional: true }],
    when: (_, __, s) => s.intensity === "realistic_diet",
  },
  {
    id: "light_cleanup",
    title: "가벼운 정리식",
    level: "저녁 가벼운 식사",
    situation: "칼로리·지방·나트륨이 높을 때 추가 식사 대신 정리",
    tags: ["가벼운 정리", "나트륨 조절", "저지방"],
    reason: (a) => {
      const parts: string[] = []
      if (a.flags.includes("calorie_high")) parts.push("칼로리가 이미 충분")
      if (a.flags.includes("fat_high")) parts.push("지방 섭취가 높음")
      if (a.flags.includes("sodium_high")) parts.push("나트륨이 높음")
      return parts.length > 0
        ? `${parts.join(", ")} — 추가 고칼로리 식사 대신 단백질·채소 위주의 가벼운 정리식을 추천합니다.`
        : "오늘 섭취량을 고려해 가볍게 정리하기 좋은 조합입니다."
    },
    roles: [{ role: "protein" }, { role: "veg" }],
    when: (a) =>
      a.flags.includes("calorie_high") ||
      (a.flags.includes("fat_high") && a.flags.includes("sodium_high")),
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
  profile: StrategyProfile,
  focus?: RecommendFoodsRequest["recommendationFocus"]
): ComboTemplate[] {
  const FOCUS_BOOST: Record<string, string[]> = {
    "protein-low": ["high_protein_low_fat", "gap_fill", "post_workout", "korean_adjust"],
    "fiber-low": ["satiety", "gap_fill", "korean_adjust"],
    "calorie-low": ["gap_fill", "post_workout", "fat_loss_realistic", "pre_run_energy"],
    "carbs-low": ["pre_run_energy", "post_workout", "gap_fill"],
    "sugar-warn": ["light_dinner", "light_cleanup", "high_protein_low_fat", "snack_light"],
    "fat-warn": ["high_protein_low_fat", "light_dinner", "light_cleanup"],
    "sodium-warn": ["light_cleanup", "light_dinner", "korean_adjust", "high_protein_low_fat"],
    "calorie-high": ["light_cleanup", "light_dinner", "snack_light"],
    deficit_fill: ["gap_fill", "high_protein_low_fat", "satiety", "post_workout"],
    excess_control: ["light_cleanup", "light_dinner", "snack_light", "high_protein_low_fat"],
  }

  const boost = focus ? (FOCUS_BOOST[focus] ?? []) : []
  const priority = profile.templatePriority

  return [...templates].sort((a, b) => {
    const aBoost = boost.indexOf(a.id)
    const bBoost = boost.indexOf(b.id)
    if (aBoost !== -1 || bBoost !== -1) {
      const aRank = aBoost === -1 ? 999 : aBoost
      const bRank = bBoost === -1 ? 999 : bBoost
      if (aRank !== bRank) return aRank - bRank
    }

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
    carbs: item.carbs != null ? Math.round(item.carbs * factor * 10) / 10 : null,
    fat: item.fat != null ? Math.round(item.fat * factor * 10) / 10 : null,
    fiber: Math.round(item.fiber * factor * 10) / 10,
    sodium: item.sodium != null ? Math.round(item.sodium * factor) : null,
    sugar: item.sugar != null ? Math.round(item.sugar * factor * 10) / 10 : null,
  }))
}

function snackPortionScale(settings: NutritionStrategySettings): number {
  if (settings.trainingStatus === "long_lsd" || settings.trainingStatus === "interval_speed") {
    return 0.85
  }
  return 0.65
}

const INDULGENT_TEMPLATE_IDS = new Set([
  "fat_loss_realistic",
  "korean_adjust",
  "convenience",
  "indulgent_adjust",
])

function filterPoolForCombo(
  pool: ScoredCandidate[],
  template: ComboTemplate,
  settings: NutritionStrategySettings
): ScoredCandidate[] {
  const intensity = settings.intensity

  return pool.filter((c) => {
    if (c.dataQuality === "suspicious" || c.dataQuality === "invalid") return false

    const indulgent = isIndulgentFood(c.nameKo, c.category)
    const strictExcluded = isStrictDietExcludedFood(c.nameKo, c.category)

    if (intensity === "strict_loss" || intensity === "aggressive_diet") {
      if (strictExcluded || indulgent) return false
      if (c.dataQuality === "partial") return false
    }

    if (indulgent) {
      if (intensity === "realistic_diet") {
        return INDULGENT_TEMPLATE_IDS.has(template.id)
      }
      return false
    }

    if (template.id === "indulgent_adjust") return false

    return true
  })
}

function indulgentPortionScale(c: FoodCandidate): number {
  return isIndulgentFood(c.nameKo, c.category) ? 0.35 : 1
}

function pickIndulgentAdjustLead(
  pool: ScoredCandidate[],
  rand: () => number,
  exclude: Set<string>,
  excludeNameKeys: Set<string>
): ScoredCandidate | null {
  const indulgent = pool.filter(
    (c) =>
      isIndulgentFood(c.nameKo, c.category) &&
      !exclude.has(c.id) &&
      !excludeNameKeys.has(candidateNameKey(c)) &&
      c.score >= MIN_SCORE &&
      c.dataQuality === "complete"
  )
  if (indulgent.length === 0) {
    const partial = pool.filter(
      (c) =>
        isIndulgentFood(c.nameKo, c.category) &&
        !exclude.has(c.id) &&
        !excludeNameKeys.has(candidateNameKey(c)) &&
        c.score >= MIN_SCORE &&
        c.dataQuality === "partial"
    )
    if (partial.length === 0) return null
    return weightedSample(partial, 1, rand)[0] ?? null
  }
  return weightedSample(indulgent, 1, rand)[0] ?? null
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
  const comboPool = filterPoolForCombo(pool, template, settings)
  if (comboPool.length === 0) return null

  const used = new Set<string>()
  const usedNameKeys = new Set<string>()
  const proteinVariants = new Set<string>()
  const items: RecommendFoodItem[] = []
  const isSnack =
    template.id === "snack_light" ||
    isSnackMealTiming(settings.mealTiming) ||
    settings.mealTiming === "pre_workout"

  for (const slot of template.roles) {
    let picked: ScoredCandidate | null = null
    if (
      template.id === "indulgent_adjust" &&
      slot.role === "any" &&
      items.length === 0
    ) {
      picked = pickIndulgentAdjustLead(comboPool, rand, used, usedNameKeys)
    } else {
      picked = pickByRole(
        comboPool,
        slot.role,
        rand,
        used,
        proteinVariants,
        usedNameKeys
      )
    }
    if (!picked) {
      if (slot.optional) continue
      return null
    }
    used.add(picked.id)
    usedNameKeys.add(candidateNameKey(picked))
    if (picked.role === "protein") {
      proteinVariants.add(picked.proteinVariant ?? proteinVariant(picked.nameKo))
    }
    let grams = defaultPortionG(picked, picked.role, profile)
    grams = Math.round(grams * indulgentPortionScale(picked))
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

function buildPipelineMessages(
  pipeline: RecommendationPipelineStats
): string[] {
  const messages: string[] = []
  const total = pipeline.totalFoodItems
  const scored = pipeline.afterScoringCount

  if (total > 0 && scored > 0) {
    messages.push(
      `공식 DB ${total.toLocaleString("ko-KR")}개 중 오늘 조건에 맞는 후보 ${scored.toLocaleString("ko-KR")}개를 분석했습니다.`
    )
  }

  if (pipeline.relaxed) {
    messages.push("현재 설정이 좁아 일부 조건을 완화해 더 넓은 후보군에서 추천했습니다.")
  }

  messages.push(
    "영양 데이터가 불완전하거나 의심스러운 음식(suspicious/invalid)은 추천에서 제외했습니다."
  )
  messages.push("엄격한 감량식에서는 피자·튀김·디저트 등 가공/간식류를 대표 추천에서 제외합니다.")

  if (pipeline.selectedRecommendationCount > 0) {
    messages.push(
      `최종 ${pipeline.selectedRecommendationCount}개 조합을 표시합니다. (점수 풀 ${pipeline.finalCandidateCount}개)`
    )
  }

  return messages
}

function buildResponseMeta(
  req: RecommendFoodsRequest,
  settings: NutritionStrategySettings,
  profile: StrategyProfile,
  analysis: NutritionDeficitAnalysis,
  mealContext: MealContext,
  recommendations: RecommendFoodCombo[],
  pipeline: RecommendationPipelineStats
): RecommendFoodsResponse {
  const pipelineMessages = buildPipelineMessages(pipeline)

  return {
    recommendations,
    analysis,
    mealContext,
    candidateCount: pipeline.afterScoringCount,
    relaxed: pipeline.relaxed,
    pipeline,
    pipelineMessages,
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

function filterCandidatesForEngine(
  candidates: FoodCandidate[],
  intensity: NutritionStrategySettings["intensity"]
): FoodCandidate[] {
  return candidates.filter((c) => {
    if (c.dataQuality === "invalid" || c.dataQuality === "suspicious") return false
    if (intensity === "strict_loss" || intensity === "aggressive_diet") {
      if (isStrictDietExcludedFood(c.nameKo, c.category)) return false
      if (c.dataQuality === "partial") return false
    }
    return true
  })
}

function runEngine(
  req: RecommendFoodsRequest,
  candidates: FoodCandidate[],
  fetchStats: CandidateFetchStats,
  relaxed: boolean,
  relaxationNotes: string[] = []
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

  const qualityFiltered = filterCandidatesForEngine(candidates, settings.intensity)

  const scored: ScoredCandidate[] = qualityFiltered.map((c) => ({
    ...c,
    proteinVariant: c.proteinVariant ?? proteinVariant(c.nameKo),
    role: inferRole(c),
    score: scoreCandidate(
      c,
      analysis,
      mealContext,
      recentIds,
      trainingIntensity,
      profile,
      settings.intensity
    ),
  }))

  scored.sort((a, b) => b.score - a.score)
  const afterScoringCount = scored.filter((c) => c.score >= MIN_SCORE).length
  const topPool = scored.slice(0, POOL_SIZE)

  const seed =
    dailyBaseSeed() +
    (req.variantSeed ?? 0) * 997 +
    settings.goal.length * 17 +
    settings.trainingStatus.length * 11
  const rand = createSeededRandom(seed)

  const recommendations: RecommendFoodCombo[] = []
  const usedComboIds = new Set(req.recentRecommendationIds ?? [])
  const sortedTemplates = sortTemplatesByPriority(
    COMBO_TEMPLATES,
    profile,
    req.recommendationFocus
  )

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
    const safePool = topPool.filter(
      (c) =>
        c.dataQuality !== "suspicious" &&
        c.dataQuality !== "invalid" &&
        !isStrictDietExcludedFood(c.nameKo, c.category)
    )
    const singles = weightedSample(safePool.length > 0 ? safePool : topPool, 3, rand)
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

  const pipeline: RecommendationPipelineStats = {
    totalFoodItems: fetchStats.totalFoodItems,
    baseCandidateCount: fetchStats.baseCandidateCount,
    afterHardFilterCount: fetchStats.afterHardFilterCount,
    afterQualityFilterCount: qualityFiltered.length,
    afterScoringCount,
    finalCandidateCount: topPool.length,
    selectedRecommendationCount: recommendations.length,
    appliedFilters: fetchStats.appliedFilters,
    fetchMethods: fetchStats.fetchMethods,
    relaxed,
    relaxationNotes: relaxationNotes.length > 0 ? relaxationNotes : undefined,
  }

  console.log("[recommend-foods] pipeline", {
    totalFoodItems: pipeline.totalFoodItems,
    baseCandidateCount: pipeline.baseCandidateCount,
    afterHardFilterCount: pipeline.afterHardFilterCount,
    afterQualityFilterCount: pipeline.afterQualityFilterCount,
    afterScoringCount: pipeline.afterScoringCount,
    finalCandidateCount: pipeline.finalCandidateCount,
    selectedRecommendationCount: pipeline.selectedRecommendationCount,
    appliedFilters: pipeline.appliedFilters,
    fetchMethods: pipeline.fetchMethods,
    relaxed: pipeline.relaxed,
  })

  return buildResponseMeta(
    req,
    settings,
    profile,
    analysis,
    mealContext,
    recommendations,
    pipeline
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

  let fetchResult = await fetchRecommendationCandidatesWide(buckets)
  let relaxed = false
  const relaxationNotes: string[] = []

  if (fetchResult.stats.afterHardFilterCount < RELAXED_CANDIDATE_THRESHOLD) {
    relaxed = true
    relaxationNotes.push(
      `1차 후보 ${fetchResult.stats.afterHardFilterCount}개 → 전체 버킷·영양소·페이지 샘플 확대`
    )
    fetchResult = await fetchRelaxedRecommendationCandidates(
      getAllRecommendationBuckets()
    )
  }

  if (fetchResult.stats.afterHardFilterCount < RELAXED_CANDIDATE_THRESHOLD) {
    relaxed = true
    relaxationNotes.push("키워드·페이지·영양소 쿼리를 최대치로 재시도")
    fetchResult = await fetchRecommendationCandidatesWide(
      getAllRecommendationBuckets(),
      {
        limitPerBucket: 1000,
        includeNutrientQueries: true,
        includePaginated: true,
      }
    )
  }

  return runEngine(
    req,
    fetchResult.candidates,
    fetchResult.stats,
    relaxed,
    relaxationNotes
  )
}

export function generateFoodRecommendationsFromCandidates(
  req: RecommendFoodsRequest,
  candidates: FoodCandidate[]
): RecommendFoodsResponse {
  const mockStats: CandidateFetchStats = {
    totalFoodItems: candidates.length,
    baseCandidateCount: candidates.length,
    afterHardFilterCount: candidates.length,
    appliedFilters: ["mock"],
    fetchMethods: ["mock"],
  }
  return runEngine(req, candidates, mockStats, false)
}
