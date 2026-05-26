import type { FoodDatabaseItem, FoodNutritionAtPortion } from "@/lib/food-database"
import { formatServingHint, nutritionAtGrams } from "@/lib/food-database"
import type { MacroTargets, MealMacroTargets } from "@/lib/user-profile"

export type PortionGoalScope = "meal" | "daily"

export interface TargetMatchPct {
  calories: number
  carbs: number
  protein: number
  fat: number
  sodium: number
}

export interface PortionRecommendation {
  scope: PortionGoalScope
  scopeLabel: string
  target: MealMacroTargets
  grams: number
  displayAmount: string
  nutrition: FoodNutritionAtPortion
  matchPct: TargetMatchPct
}

export interface FoodPortionPlan {
  food: FoodDatabaseItem
  per100g: FoodNutritionAtPortion
  perMeal: PortionRecommendation
  daily: PortionRecommendation
}

function roundGrams(g: number): number {
  if (g <= 0) return 0
  if (g < 50) return Math.round(g / 5) * 5
  if (g < 200) return Math.round(g / 10) * 10
  return Math.round(g / 25) * 25
}

function gramsForCalorieTarget(food: FoodDatabaseItem, targetKcal: number): number {
  if (food.per100g.calories <= 0) return 0
  return roundGrams((targetKcal / food.per100g.calories) * 100)
}

function calcMatchPct(
  nutrition: FoodNutritionAtPortion,
  target: MealMacroTargets
): TargetMatchPct {
  const pct = (actual: number, goal: number) =>
    goal > 0 ? Math.round((actual / goal) * 100) : 0

  return {
    calories: pct(nutrition.calories, target.calories),
    carbs: pct(nutrition.carbsG, target.carbsG),
    protein: pct(nutrition.proteinG, target.proteinG),
    fat: pct(nutrition.fatG, target.fatG),
    sodium: pct(nutrition.sodiumMg, target.sodiumMg),
  }
}

function dailyToMealMacroTargets(targets: MacroTargets): MealMacroTargets {
  return {
    calories: targets.calories,
    carbsG: targets.carbsG,
    proteinG: targets.proteinG,
    fatG: targets.fatG,
    waterMl: Math.round(targets.waterL * 1000),
    sodiumMg: targets.sodiumMg,
  }
}

function buildRecommendation(
  food: FoodDatabaseItem,
  scope: PortionGoalScope,
  target: MealMacroTargets,
  scopeLabel: string
): PortionRecommendation {
  const grams = gramsForCalorieTarget(food, target.calories)
  const nutrition = nutritionAtGrams(food, grams)

  return {
    scope,
    scopeLabel,
    target,
    grams,
    displayAmount: formatServingHint(food, grams),
    nutrition,
    matchPct: calcMatchPct(nutrition, target),
  }
}

export function calculateFoodPortionPlan(
  food: FoodDatabaseItem,
  targets: MacroTargets
): FoodPortionPlan {
  const dailyTarget = dailyToMealMacroTargets(targets)

  return {
    food,
    per100g: nutritionAtGrams(food, 100),
    perMeal: buildRecommendation(food, "meal", targets.perMeal, "1끼 목표"),
    daily: buildRecommendation(food, "daily", dailyTarget, "하루 목표"),
  }
}
