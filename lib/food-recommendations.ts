import { FOOD_DATABASE_ITEMS } from "@/lib/food-database-data"
import type { FoodDatabaseItem } from "@/lib/food-database"
import {
  getFiberPer100g,
  type DietJudgmentKind,
  type DietWarningContext,
} from "@/lib/food-nutrition-utils"

export type FoodRecommendation = {
  food: FoodDatabaseItem
  hint: string
}

export type FoodRecommendationBundle = {
  title: string
  subtitle: string
  items: FoodRecommendation[]
}

export type FoodRecommendationOptions = {
  limit?: number
  excludeIds?: readonly string[]
  /** 이전에 본 항목을 건너뛸 때 사용 (새로고침) */
  rotateOffset?: number
}

const FOODS = FOOD_DATABASE_ITEMS

const FIBER_EXCLUDE_IDS = new Set([
  "instant-noodle",
  "ramen",
  "glass-noodle",
  "cereal",
  "corn-flakes",
  "cola",
  "energy-drink",
  "smoothie",
  "apple-juice",
  "orange-juice",
  "dried-fruit",
  "popcorn",
  "triangle-kimbap",
  "rice-white",
  "burger",
  "pizza",
  "fried-chicken",
  "steak",
  "udon",
  "bibimbap",
])

const EASY_FIBER_PRIORITY: Record<string, number> = {
  banana: 30,
  apple: 30,
  pear: 28,
  kiwi: 27,
  strawberry: 26,
  broccoli: 28,
  spinach: 28,
  cabbage: 26,
  carrot: 26,
  "sweet-potato": 27,
  "potato-boiled": 25,
  "bean-sprout": 27,
  avocado: 22,
  "oatmeal-dry": 26,
  "oatmeal-cooked": 25,
  "rice-brown": 24,
  corn: 24,
  kimchi: 26,
  "spinach-side": 25,
  "bean-sprout-side": 25,
  "miyeok-guk": 22,
  wakame: 20,
  seaweed: 22,
  almond: 20,
  peanut: 22,
  walnut: 18,
  "chia-seed": 8,
  cucumber: 24,
  lettuce: 23,
  "napa-cabbage": 24,
  eggplant: 23,
  mushroom: 22,
  "king-oyster-mushroom": 30,
  "sweet-pumpkin": 23,
  blueberry: 20,
  mandarin: 26,
  gimbap: 18,
  "salad-chicken": 20,
}

const EASY_FIBER_CATEGORIES = new Set(["채소", "과일", "곡물", "탄수", "반찬"])

const EASY_PROTEIN_IDS: Record<string, number> = {
  "chicken-breast": 30,
  egg: 28,
  "egg-white": 24,
  tofu: 26,
  "firm-tofu": 26,
  "tuna-can": 25,
  "greek-yogurt": 24,
  yogurt: 22,
  salmon: 20,
  shrimp: 22,
  "silken-tofu": 20,
  milk: 18,
  "lowfat-milk": 18,
}

const LOW_SUGAR_IDS: Record<string, number> = {
  "chicken-breast": 28,
  egg: 27,
  tofu: 26,
  broccoli: 25,
  spinach: 25,
  cucumber: 24,
  mushroom: 23,
  "king-oyster-mushroom": 26,
  "greek-yogurt": 22,
  "tuna-can": 22,
  lettuce: 21,
  "cherry-tomato": 21,
}

const DIET_JUNK_EXCLUDE_IDS = new Set([
  "instant-noodle",
  "ramen",
  "glass-noodle",
  "pizza",
  "burger",
  "fried-chicken",
  "pork-belly",
  "samgyeopsal",
  "bacon",
  "sausage",
  "ham",
  "steak",
  "beef-sirloin",
  "beef-ground",
  "pork-loin",
  "cheese",
  "mayonnaise",
  "peanut-butter",
  "butter",
  "cola",
  "energy-drink",
  "smoothie",
  "apple-juice",
  "orange-juice",
  "dried-fruit",
  "popcorn",
  "triangle-kimbap",
  "gimbap",
  "dosirak",
  "bibimbap",
  "chicken-wing",
  "fried-chicken",
  "protein-powder",
  "cereal",
  "corn-flakes",
])

const CALORIE_DENSE_HEALTHY_IDS: Record<string, number> = {
  "chicken-breast": 30,
  "sweet-potato": 29,
  banana: 28,
  "rice-brown": 27,
  egg: 27,
  "oatmeal-cooked": 26,
  "firm-tofu": 25,
  tofu: 25,
  "tuna-can": 25,
  avocado: 24,
  "greek-yogurt": 24,
  salmon: 23,
  "rice-mixed": 23,
  "salad-chicken": 22,
  shrimp: 22,
  tempeh: 21,
  "oatmeal-dry": 20,
  apple: 19,
  pear: 19,
  almond: 18,
  peanut: 18,
  "rice-barley": 18,
  milk: 17,
  "lowfat-milk": 17,
  "silken-tofu": 16,
  yogurt: 15,
  "rice-white": 12,
  mackerel: 20,
  "quinoa-cooked": 19,
  saury: 19,
  squid: 18,
  "barley-cooked": 18,
  "steamed-egg": 17,
  "sorghum-cooked": 17,
  "sweet-pumpkin": 14,
}

const LOW_CALORIE_VOLUME_IDS: Record<string, number> = {
  cucumber: 28,
  lettuce: 27,
  mushroom: 26,
  "king-oyster-mushroom": 27,
  broccoli: 26,
  spinach: 25,
  "cherry-tomato": 24,
  "bean-sprout": 23,
  "chicken-breast": 22,
  zucchini: 21,
  radish: 20,
}

function getFiberAccessibilityScore(food: FoodDatabaseItem): number {
  const priority = EASY_FIBER_PRIORITY[food.id]
  if (priority) return priority

  if (food.category === "지방") {
    if (
      ["almond", "peanut", "walnut", "cashew", "sunflower-seed", "chia-seed"].includes(
        food.id
      )
    ) {
      return 14
    }
    return 0
  }

  if (!EASY_FIBER_CATEGORIES.has(food.category)) return 0
  if (food.category === "과일") return 12
  if (food.category === "채소") return 11
  if (food.category === "곡물") return 11
  if (food.category === "탄수") return 9
  if (food.category === "반찬") return 7
  return 0
}

const LOW_SUGAR_FIBER_VEG_IDS = new Set([
  "king-oyster-mushroom",
  "broccoli",
  "spinach",
  "cabbage",
  "napa-cabbage",
  "bean-sprout",
  "cucumber",
  "lettuce",
  "mushroom",
  "carrot",
  "eggplant",
  "zucchini",
  "radish",
  "bell-pepper",
  "bean-sprout-side",
  "spinach-side",
  "kimchi",
  "wakame",
])

const STARCHY_HIGH_SUGAR_FIBER_IDS = new Set([
  "sweet-pumpkin",
  "sweet-potato",
  "corn",
  "potato-boiled",
  "persimmon",
  "dried-persimmon",
])

function getFiberPerTypicalServing(food: FoodDatabaseItem): number {
  const grams = food.servingGrams ?? 100
  return Math.round(getFiberPer100g(food) * (grams / 100) * 10) / 10
}

function perServing(
  per100g: number,
  servingGrams: number | undefined
): number {
  const grams = servingGrams ?? 100
  return Math.round(per100g * (grams / 100) * 10) / 10
}

function sugarPer100g(food: FoodDatabaseItem): number {
  if (typeof food.per100g.sugarG === "number") return food.per100g.sugarG
  const carbs = food.per100g.carbsG
  if (food.category === "과일" || food.category === "음료") return carbs * 0.65
  if (food.category === "간식") return carbs * 0.45
  return carbs * 0.15
}

function caloriesPerServing(food: FoodDatabaseItem): number {
  return perServing(food.per100g.calories, food.servingGrams)
}

function dietWarningPenalty(
  food: FoodDatabaseItem,
  ctx?: DietWarningContext
): number {
  if (!ctx || (!ctx.sugarWarn && !ctx.calorieHigh)) return 0

  let penalty = 0
  const servingSugar = perServing(sugarPer100g(food), food.servingGrams)
  const servingKcal = caloriesPerServing(food)

  if (ctx.sugarWarn) {
    if (servingSugar >= 12) penalty += 120
    else if (servingSugar >= 8) penalty += 70
    else if (servingSugar >= 5) penalty += 35
    else if (servingSugar >= 3) penalty += 15
    if (food.category === "과일" && sugarPer100g(food) >= 9) penalty += 20
    if (food.category === "음료" || food.category === "간식") penalty += 40
  }

  if (ctx.calorieHigh) {
    if (servingKcal >= 350) penalty += 90
    else if (servingKcal >= 250) penalty += 50
    else if (servingKcal >= 180) penalty += 25
    else if (servingKcal >= 140) penalty += 10
    if (food.category === "지방" && food.per100g.fatG >= 30) penalty += 25
  }

  return penalty
}

function adjustedScore(
  baseScore: number,
  food: FoodDatabaseItem,
  ctx?: DietWarningContext
): number {
  return baseScore - dietWarningPenalty(food, ctx)
}

function computeFiberScore(
  food: FoodDatabaseItem,
  servingFiber: number,
  fiber100: number,
  accessibility: number,
  ctx?: DietWarningContext
): number {
  const base = servingFiber * 20 + accessibility + fiber100 * 2
  if (!ctx?.sugarWarn) {
    return adjustedScore(base, food, ctx)
  }

  let score = base
  const sugar100 = sugarPer100g(food)

  if (LOW_SUGAR_FIBER_VEG_IDS.has(food.id)) {
    score += 90
  } else if (
    food.category === "채소" &&
    sugar100 <= 3 &&
    food.per100g.carbsG <= 8
  ) {
    score += 55
  }

  if (STARCHY_HIGH_SUGAR_FIBER_IDS.has(food.id)) {
    score -= 120
  } else if (food.category === "과일") {
    score -= 250
  } else if (food.category === "지방") {
    score -= 80
  } else if (food.category === "곡물" || food.category === "탄수") {
    score -= 40
  }

  if (sugar100 >= 8) score -= 80
  else if (sugar100 >= 5) score -= 45
  else if (sugar100 >= 3.5) score -= 20

  return score - dietWarningPenalty(food, ctx)
}

function sortFiberItems<
  T extends {
    food: FoodDatabaseItem
    score: number
    servingFiber: number
    fiber100: number
    accessibility: number
  },
>(items: T[], ctx?: DietWarningContext): T[] {
  return [...items].sort((a, b) => {
    const scoreA = ctx?.sugarWarn
      ? computeFiberScore(
          a.food,
          a.servingFiber,
          a.fiber100,
          a.accessibility,
          ctx
        )
      : adjustedScore(a.score, a.food, ctx)
    const scoreB = ctx?.sugarWarn
      ? computeFiberScore(
          b.food,
          b.servingFiber,
          b.fiber100,
          b.accessibility,
          ctx
        )
      : adjustedScore(b.score, b.food, ctx)
    return scoreB - scoreA || a.food.name.localeCompare(b.food.name, "ko")
  })
}

function sortByAdjustedScore<T extends { food: FoodDatabaseItem; score: number }>(
  items: T[],
  ctx?: DietWarningContext
): T[] {
  return [...items].sort((a, b) => {
    const scoreA = adjustedScore(a.score, a.food, ctx)
    const scoreB = adjustedScore(b.score, b.food, ctx)
    return scoreB - scoreA || a.food.name.localeCompare(b.food.name, "ko")
  })
}

function rotatePool<T>(pool: T[], offset: number): T[] {
  if (pool.length <= 1 || offset <= 0) return pool
  const start = offset % pool.length
  return [...pool.slice(start), ...pool.slice(0, start)]
}

function pickCategoryDiverse<T extends { food: FoodDatabaseItem; score: number }>(
  sortedItems: T[],
  limit: number
): T[] {
  if (sortedItems.length === 0) return []

  const byCategory = new Map<string, T[]>()
  for (const item of sortedItems) {
    const cat = item.food.category
    const list = byCategory.get(cat) ?? []
    list.push(item)
    byCategory.set(cat, list)
  }

  const categories = [...byCategory.keys()].sort((a, b) => {
    const bestA = byCategory.get(a)?.[0]?.score ?? 0
    const bestB = byCategory.get(b)?.[0]?.score ?? 0
    return bestB - bestA || a.localeCompare(b, "ko")
  })

  const picked: T[] = []
  const pickedIds = new Set<string>()

  while (picked.length < limit) {
    let added = false
    for (const cat of categories) {
      if (picked.length >= limit) break
      const next = byCategory.get(cat)?.find((item) => !pickedIds.has(item.food.id))
      if (!next) continue
      picked.push(next)
      pickedIds.add(next.food.id)
      added = true
    }
    if (!added) break
  }

  if (picked.length < limit) {
    for (const item of sortedItems) {
      if (picked.length >= limit) break
      if (pickedIds.has(item.food.id)) continue
      picked.push(item)
      pickedIds.add(item.food.id)
    }
  }

  return picked
}

function filterExcluded<T extends { food: FoodDatabaseItem }>(
  items: T[],
  excludeIds?: readonly string[]
): T[] {
  if (!excludeIds?.length) return items
  const exclude = new Set(excludeIds)
  return items.filter(({ food }) => !exclude.has(food.id))
}

export function searchFiberRichFoods(
  limit = 24,
  warningContext?: DietWarningContext
): FoodDatabaseItem[] {
  const items = FOODS.map((food) => {
    const fiber100 = getFiberPer100g(food)
    const servingFiber = getFiberPerTypicalServing(food)
    const accessibility = getFiberAccessibilityScore(food)
    return {
      food,
      fiber100,
      servingFiber,
      accessibility,
      score: servingFiber * 20 + accessibility + fiber100 * 2,
    }
  })

  const filtered = items.filter(({ food, servingFiber, fiber100, accessibility }) => {
    if (FIBER_EXCLUDE_IDS.has(food.id) || accessibility <= 0) return false
    if (EASY_FIBER_PRIORITY[food.id]) {
      return servingFiber >= 1 || fiber100 >= 1.5
    }
    if (food.category === "채소" || food.category === "과일") {
      return servingFiber >= 1.5 || fiber100 >= 2
    }
    if (food.category === "곡물" || food.category === "반찬") {
      return servingFiber >= 1.5 && fiber100 >= 2
    }
    if (food.category === "지방") {
      return fiber100 >= 6
    }
    return false
  })

  return sortFiberItems(filtered, warningContext)
    .slice(0, limit)
    .map(({ food }) => food)
}

export function getFiberSearchResults(
  limit = 24,
  warningContext?: DietWarningContext
): FoodDatabaseItem[] {
  return searchFiberRichFoods(limit, warningContext)
}

function scoreByPriorityMap(
  foods: FoodDatabaseItem[],
  priorityMap: Record<string, number>,
  metric: (food: FoodDatabaseItem) => number,
  minMetric: number,
  limit: number,
  warningContext?: DietWarningContext,
  options?: FoodRecommendationOptions
): FoodRecommendation[] {
  const items = foods
    .map((food) => ({
      food,
      metric: metric(food),
      boost: priorityMap[food.id] ?? 0,
      score: 0,
    }))
    .map((item) => ({
      ...item,
      score: item.metric * 10 + item.boost,
    }))
    .filter(({ metric, boost }) => metric >= minMetric || boost >= 20)

  const sorted = sortByAdjustedScore(items, warningContext)
  let pool = filterExcluded(sorted, options?.excludeIds)
  if (pool.length === 0) {
    pool = rotatePool(sorted, options?.rotateOffset ?? 0)
  } else if (options?.rotateOffset) {
    pool = rotatePool(pool, options.rotateOffset)
  }

  return pool.slice(0, limit).map(({ food, metric }) => ({
    food,
    hint: formatHint(food, metric),
  }))
}

function formatHint(food: FoodDatabaseItem, metric: number): string {
  const grams = food.servingGrams ?? 100
  if (food.category === "단백" || food.per100g.proteinG >= 8) {
    return `1회 약 ${perServing(food.per100g.proteinG, grams)}g 단백질`
  }
  if (metric >= 5 && getFiberPer100g(food) >= 2) {
    return `1회 약 ${perServing(getFiberPer100g(food), grams)}g 식이섬유`
  }
  return `1회 약 ${perServing(food.per100g.calories, grams)}kcal`
}

function searchProteinRichFoods(
  limit = 6,
  warningContext?: DietWarningContext,
  options?: FoodRecommendationOptions
): FoodRecommendation[] {
  return scoreByPriorityMap(
    FOODS.filter(
      (f) =>
        EASY_PROTEIN_IDS[f.id] !== undefined &&
        (f.category === "단백" || f.per100g.proteinG >= 8)
    ),
    EASY_PROTEIN_IDS,
    (food) => perServing(food.per100g.proteinG, food.servingGrams),
    6,
    limit,
    warningContext,
    options
  )
}

function searchLowSugarFoods(
  limit = 6,
  options?: FoodRecommendationOptions
): FoodRecommendation[] {
  const sorted = FOODS.filter(
    (f) => !["음료", "간식"].includes(f.category) && sugarPer100g(f) <= 8
  )
    .map((food) => ({
      food,
      sugar: sugarPer100g(food),
      boost: LOW_SUGAR_IDS[food.id] ?? 0,
    }))
    .filter(({ sugar, boost }) => sugar <= 8 || boost >= 20)
    .sort(
      (a, b) =>
        a.sugar - b.sugar || b.boost - a.boost || a.food.name.localeCompare(b.food.name, "ko")
    )

  let pool = filterExcluded(sorted, options?.excludeIds)
  if (pool.length === 0) {
    pool = rotatePool(sorted, options?.rotateOffset ?? 0)
  } else if (options?.rotateOffset) {
    pool = rotatePool(pool, options.rotateOffset)
  }

  return pool.slice(0, limit).map(({ food, sugar }) => ({
    food,
    hint: `100g당 당류 ${sugar.toFixed(1)}g · 포만감 좋음`,
  }))
}

function isDietHealthyCalorieFood(food: FoodDatabaseItem): boolean {
  if (DIET_JUNK_EXCLUDE_IDS.has(food.id)) return false
  if (["음료", "간식", "식사"].includes(food.category)) return false
  if (CALORIE_DENSE_HEALTHY_IDS[food.id] === undefined) return false
  if (food.per100g.fatG >= 22) return false
  if (food.per100g.sodiumMg >= 500 && !["kimchi", "miyeok-guk"].includes(food.id)) {
    return false
  }
  return true
}

function searchCalorieDenseHealthyFoods(
  limit = 18,
  warningContext?: DietWarningContext,
  options?: FoodRecommendationOptions
): FoodRecommendation[] {
  const items = FOODS.filter(isDietHealthyCalorieFood)
    .map((food) => {
      const kcal = caloriesPerServing(food)
      const boost = CALORIE_DENSE_HEALTHY_IDS[food.id] ?? 0
      const baseScore = kcal + boost * 8
      return {
        food,
        kcal,
        boost,
        score: baseScore,
      }
    })
    .filter(({ kcal }) => kcal >= 70)

  const sorted = sortByAdjustedScore(items, warningContext).map((item) => ({
    ...item,
    score: adjustedScore(item.score, item.food, warningContext),
  }))

  let pool = filterExcluded(sorted, options?.excludeIds)
  if (pool.length === 0) {
    pool = rotatePool(sorted, options?.rotateOffset ?? 0)
  } else if (options?.rotateOffset) {
    pool = rotatePool(pool, options.rotateOffset)
  }

  return pickCategoryDiverse(pool, limit).map(({ food, kcal }) => ({
    food,
    hint: `1회 약 ${Math.round(kcal)}kcal · 감량 식단에 적합`,
  }))
}

function searchLowCalorieVolumeFoods(
  limit = 6,
  warningContext?: DietWarningContext,
  options?: FoodRecommendationOptions
): FoodRecommendation[] {
  const items = FOODS.filter((f) => f.per100g.calories <= 80)
    .map((food) => ({
      food,
      boost: LOW_CALORIE_VOLUME_IDS[food.id] ?? 0,
      kcal: food.per100g.calories,
      score: 0,
    }))
    .filter(({ boost }) => boost > 0)
    .map((item) => ({
      ...item,
      score: item.boost * 10 - item.kcal,
    }))

  const sorted = sortByAdjustedScore(items, warningContext)
  let pool = filterExcluded(sorted, options?.excludeIds)
  if (pool.length === 0) {
    pool = rotatePool(sorted, options?.rotateOffset ?? 0)
  } else if (options?.rotateOffset) {
    pool = rotatePool(pool, options.rotateOffset)
  }

  return pool.slice(0, limit).map(({ food, kcal }) => ({
    food,
    hint: `100g ${kcal}kcal · 포만감 좋음`,
  }))
}

function searchFiberRecommendations(
  limit = 6,
  warningContext?: DietWarningContext,
  options?: FoodRecommendationOptions
): FoodRecommendation[] {
  const poolSize = warningContext?.sugarWarn ? 40 : Math.max(limit * 3, 24)
  const foods = searchFiberRichFoods(poolSize, warningContext)

  const ordered = warningContext?.sugarWarn
    ? [
        ...foods.filter(
          (f) =>
            LOW_SUGAR_FIBER_VEG_IDS.has(f.id) ||
            (f.category === "채소" && sugarPer100g(f) <= 3)
        ),
        ...foods.filter(
          (f) =>
            !LOW_SUGAR_FIBER_VEG_IDS.has(f.id) &&
            !(f.category === "채소" && sugarPer100g(f) <= 3)
        ),
      ]
    : foods

  const scored = ordered.map((food, index) => ({
    food,
    score: ordered.length - index,
  }))

  let pool = filterExcluded(scored, options?.excludeIds)
  if (pool.length === 0) {
    pool = rotatePool(scored, options?.rotateOffset ?? 0)
  } else if (options?.rotateOffset) {
    pool = rotatePool(pool, options.rotateOffset)
  }

  const picked =
    options?.excludeIds?.length || options?.rotateOffset
      ? pool.slice(0, limit)
      : pickCategoryDiverse(pool, limit)

  return picked.map(({ food }) => ({
    food,
    hint: `1회 약 ${getFiberPerTypicalServing(food)}g 식이섬유 · 100g당 ${getFiberPer100g(food)}g · 당류 ${sugarPer100g(food).toFixed(1)}g`,
  }))
}

const RECOMMENDATION_LIMITS: Partial<Record<DietJudgmentKind, number>> = {
  "calorie-low": 18,
  "fiber-low": 12,
  "protein-low": 10,
}

export function getFoodRecommendationsForJudgment(
  kind: DietJudgmentKind,
  warningContext?: DietWarningContext,
  options?: FoodRecommendationOptions
): FoodRecommendationBundle | null {
  const ctx = warningContext
  const limit = options?.limit ?? RECOMMENDATION_LIMITS[kind] ?? 8
  const warnNote =
    ctx?.sugarWarn || ctx?.calorieHigh
      ? " (오늘 주의 항목에 맞춰 순위를 조정했어요.)"
      : ""

  switch (kind) {
    case "calorie-low":
      return {
        title: "칼로리 보충 추천",
        subtitle: `감량에 맞는 건강한 음식으로 다음 식사를 채워보세요. 카테고리를 골고루 보여드려요.${warnNote}`,
        items: searchCalorieDenseHealthyFoods(limit, ctx, options),
      }
    case "calorie-high":
      return {
        title: "칼로리 조절 추천",
        subtitle: "포만감은 유지하면서 칼로리를 낮출 수 있는 음식이에요.",
        items: searchLowCalorieVolumeFoods(limit, ctx, options),
      }
    case "protein-low":
      return {
        title: "단백질 보충 추천",
        subtitle: `다음 식사에 추가하면 단백질 목표 달성에 도움이 돼요.${warnNote}`,
        items: searchProteinRichFoods(limit, ctx, options),
      }
    case "sugar-warn":
      return {
        title: "당류 대체 추천",
        subtitle: "단맛 대신 아래 음식으로 바꿔보세요.",
        items: searchLowSugarFoods(limit, options),
      }
    case "fiber-low":
      return {
        title: "식이섬유 보충 추천",
        subtitle: `마트에서 쉽게 구할 수 있는 식이섬유 풍부 식품이에요.${warnNote}`,
        items: searchFiberRecommendations(limit, ctx, options),
      }
    default:
      return null
  }
}
