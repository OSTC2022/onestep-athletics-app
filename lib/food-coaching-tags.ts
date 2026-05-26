import type { FoodDatabaseItem } from "@/lib/food-database"
import { getFoodById, getRefinedCarbLevel } from "@/lib/food-database"

export type FoodCoachingTagId =
  | "refined-carb-high"
  | "complex-carb"
  | "sodium-warn"
  | "protein-meal-low-risk"
  | "low-cal-fruit"
  | "sugar-mid"
  | "sugar-high"
  | "high-protein"
  | "protein-food"
  | "fat-included"
  | "pre-workout-carb"

export type FoodCoachingTag = {
  id: FoodCoachingTagId
  label: string
}

const TAG_LABELS: Record<FoodCoachingTagId, string> = {
  "refined-carb-high": "정제탄수 높음",
  "complex-carb": "복합탄수",
  "sodium-warn": "나트륨 주의",
  "protein-meal-low-risk": "단백질 부족 가능",
  "low-cal-fruit": "저칼로리 과일",
  "sugar-mid": "당류 중간",
  "sugar-high": "당류 높음",
  "high-protein": "고단백",
  "protein-food": "단백질 식품",
  "fat-included": "지방 포함",
  "pre-workout-carb": "운동 전 탄수",
}

const FOOD_TAG_RULES: Record<
  string,
  { tags: FoodCoachingTagId[]; hint?: string }
> = {
  gimbap: {
    tags: ["refined-carb-high", "sodium-warn", "protein-meal-low-risk"],
    hint: "흰쌀밥 기반 · 단백질을 함께 추가하면 좋아요",
  },
  "triangle-kimbap": {
    tags: ["refined-carb-high", "sodium-warn", "protein-meal-low-risk"],
  },
  "kimbap-tuna": {
    tags: ["refined-carb-high", "sodium-warn"],
  },
  "rice-white": { tags: ["refined-carb-high"], hint: "현미·잡곡으로 바꾸면 더 좋아요" },
  "bread-white": { tags: ["refined-carb-high"] },
  baguette: { tags: ["refined-carb-high"] },
  pasta: { tags: ["refined-carb-high"] },
  udon: { tags: ["refined-carb-high"] },
  "rice-cake": { tags: ["refined-carb-high", "sugar-mid"] },
  cereal: { tags: ["refined-carb-high", "sugar-high"] },
  cookie: { tags: ["refined-carb-high", "sugar-high"] },
  chocolate: { tags: ["refined-carb-high", "sugar-high"] },
  strawberry: { tags: ["low-cal-fruit"], hint: "당류 낮은 편" },
  blueberry: { tags: ["low-cal-fruit"], hint: "당류 낮은 편" },
  banana: { tags: ["pre-workout-carb", "sugar-mid"], hint: "운동 전 탄수 · 당류 중간" },
  "sweet-potato": { tags: ["complex-carb"] },
  "rice-brown": { tags: ["complex-carb"] },
  "rice-mixed": { tags: ["complex-carb"] },
  "oatmeal-cooked": { tags: ["complex-carb"] },
  "oatmeal-dry": { tags: ["complex-carb"] },
  egg: { tags: ["high-protein", "protein-food", "fat-included"] },
  "chicken-breast": { tags: ["high-protein", "protein-food"] },
  tofu: { tags: ["protein-food"] },
  "firm-tofu": { tags: ["protein-food"] },
  "tuna-can": { tags: ["high-protein", "protein-food"] },
  salmon: { tags: ["high-protein", "protein-food", "fat-included"] },
}

function inferTagsFromFood(food: FoodDatabaseItem): FoodCoachingTagId[] {
  const tags = new Set<FoodCoachingTagId>()
  const rule = FOOD_TAG_RULES[food.id]
  if (rule) rule.tags.forEach((t) => tags.add(t))

  const refined = getRefinedCarbLevel(food)
  if (refined === "high" && !tags.has("refined-carb-high")) {
    tags.add("refined-carb-high")
  }
  if (refined === "medium" && !tags.has("complex-carb")) {
    tags.add("complex-carb")
  }

  if (food.per100g.proteinG >= 20) tags.add("high-protein")
  else if (food.per100g.proteinG >= 8 && food.category === "단백") {
    tags.add("protein-food")
  }

  if (food.per100g.fatG >= 10) tags.add("fat-included")
  if (food.per100g.sodiumMg >= 400) tags.add("sodium-warn")

  const sugar =
    food.per100g.sugarG ??
    (food.category === "과일" ? food.per100g.carbsG * 0.65 : 0)
  if (food.category === "과일" && food.per100g.calories <= 55) {
    tags.add("low-cal-fruit")
  }
  if (sugar >= 12) tags.add("sugar-high")
  else if (sugar >= 6) tags.add("sugar-mid")

  return [...tags]
}

export function getFoodCoachingTags(food: FoodDatabaseItem): FoodCoachingTag[] {
  return inferTagsFromFood(food).map((id) => ({
    id,
    label: TAG_LABELS[id],
  }))
}

export function getFoodCoachingHint(food: FoodDatabaseItem): string | null {
  return FOOD_TAG_RULES[food.id]?.hint ?? null
}

export function getMealFoodTagSummaries(
  entries: { foodId: string; name: string }[]
): { name: string; tags: FoodCoachingTag[]; hint: string | null }[] {
  return entries
    .map((entry) => {
      const food = getFoodById(entry.foodId)
      if (!food) return null
      const tags = getFoodCoachingTags(food)
      if (tags.length === 0) return null
      return {
        name: food.name,
        tags,
        hint: getFoodCoachingHint(food),
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
}
