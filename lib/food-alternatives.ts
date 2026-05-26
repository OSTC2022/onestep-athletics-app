import type { MacroTargets, MealMacroTargets } from "@/lib/user-profile"

export type MacroNutrientKey =
  | "carbs"
  | "protein"
  | "fat"
  | "water"
  | "sodium"

export type MenuSelectionScope = "daily" | "meal"

export interface MealMenuSelectionEntry {
  optionId: string
  scope: MenuSelectionScope
}

export type MealMenuSelection = Partial<
  Record<MacroNutrientKey, MealMenuSelectionEntry>
>

export interface FoodOption {
  id: string
  label: string
  carbsG: number
  proteinG: number
  fatG: number
  waterMl: number
  sodiumMg: number
}

export interface FoodAlternativeGroup {
  key: MacroNutrientKey
  label: string
  perMealTarget: string
  options: FoodOption[]
}

const MACRO_KEYS: MacroNutrientKey[] = [
  "carbs",
  "protein",
  "fat",
  "water",
  "sodium",
]

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function roundStep(value: number, step: number, min: number, max: number): number {
  const stepped = Math.round(value / step) * step
  return Math.min(max, Math.max(min, stepped))
}

function gramsForMacro(targetG: number, macroPer100g: number, step = 10): number {
  if (macroPer100g <= 0) return 0
  return roundStep((targetG / macroPer100g) * 100, step, step, 600)
}

function from100g(
  id: string,
  name: string,
  grams: number,
  per100g: {
    carbs?: number
    protein?: number
    fat?: number
    water?: number
    sodium?: number
  }
): FoodOption {
  const f = grams / 100
  return {
    id,
    label: `${name} ${grams}g`,
    carbsG: round1((per100g.carbs ?? 0) * f),
    proteinG: round1((per100g.protein ?? 0) * f),
    fatG: round1((per100g.fat ?? 0) * f),
    waterMl: Math.round((per100g.water ?? 0) * f),
    sodiumMg: Math.round((per100g.sodium ?? 0) * f),
  }
}

function getCarbAlternatives(carbsG: number): FoodOption[] {
  const riceG = gramsForMacro(carbsG, 23)
  const potatoG = roundStep(Math.max(120, (carbsG / 28) * 100), 10, 100, 350)
  const bananaCount = Math.min(4, Math.max(1, Math.round(carbsG / 27)))
  const bananaG = bananaCount * 120
  const oatG = gramsForMacro(carbsG, 66, 5)
  const breadSlices = Math.min(6, Math.max(1, Math.round(carbsG / 12)))
  const breadG = breadSlices * 30

  return [
    from100g("carbs-rice", "현미밥", riceG, {
      carbs: 23,
      protein: 2.5,
      fat: 0.8,
      sodium: 5,
    }),
    from100g("carbs-potato", "고구마", potatoG, {
      carbs: 28,
      protein: 1.5,
      fat: 0.1,
      sodium: 55,
    }),
    {
      id: "carbs-banana",
      label: `바나나 ${bananaCount}개`,
      ...(() => {
        const b = from100g("_", "바나나", bananaG, {
          carbs: 23,
          protein: 1.1,
          fat: 0.3,
          sodium: 1,
        })
        return {
          carbsG: b.carbsG,
          proteinG: b.proteinG,
          fatG: b.fatG,
          waterMl: b.waterMl,
          sodiumMg: b.sodiumMg,
        }
      })(),
    },
    from100g("carbs-oat", "귀리", oatG, {
      carbs: 66,
      protein: 13,
      fat: 7,
      sodium: 2,
    }),
    from100g("carbs-bread", "통밀빵", breadG, {
      carbs: 45,
      protein: 9,
      fat: 3,
      sodium: 400,
    }),
  ]
}

function getProteinAlternatives(proteinG: number): FoodOption[] {
  const chickenG = gramsForMacro(proteinG, 31)
  const eggCount = Math.min(10, Math.max(2, Math.round(proteinG / 6.3)))
  const eggG = eggCount * 50
  const tunaG = gramsForMacro(proteinG, 26)
  const tofuG = roundStep((proteinG / 8) * 100, 10, 100, 400)
  const yogurtG = gramsForMacro(proteinG, 10)

  const eggs = from100g("protein-egg-inner", "계란", eggG, {
    carbs: 1.1,
    protein: 12.6,
    fat: 10.6,
    sodium: 140,
  })

  return [
    {
      id: "protein-chicken",
      label: `닭가슴살 ${chickenG}g`,
      carbsG: 0,
      proteinG: round1(chickenG * 0.31),
      fatG: round1(chickenG * 0.036),
      waterMl: 0,
      sodiumMg: Math.round(chickenG * 0.74),
    },
    {
      id: "protein-egg",
      label: `계란 ${eggCount}개`,
      carbsG: eggs.carbsG,
      proteinG: eggs.proteinG,
      fatG: eggs.fatG,
      waterMl: 0,
      sodiumMg: eggs.sodiumMg,
    },
    from100g("protein-tuna", "참치", tunaG, {
      carbs: 0,
      protein: 26,
      fat: 1,
      sodium: 320,
    }),
    from100g("protein-tofu", "두부", tofuG, {
      carbs: 2,
      protein: 8,
      fat: 4.8,
      sodium: 7,
    }),
    from100g("protein-yogurt", "그릭요거트", yogurtG, {
      carbs: 4,
      protein: 10,
      fat: 0.4,
      sodium: 36,
    }),
  ]
}

function getFatAlternatives(fatG: number): FoodOption[] {
  const oilTbsp = Math.min(3, Math.max(1, Math.round(fatG / 14)))
  const avocadoG = roundStep((fatG / 15) * 100, 10, 50, 200)
  const almondG = roundStep((fatG / 50) * 100, 5, 15, 40)
  const peanutG = roundStep((fatG / 50) * 100, 5, 10, 30)

  return [
    {
      id: "fat-oil",
      label: `올리브오일 ${oilTbsp}큰술`,
      carbsG: 0,
      proteinG: 0,
      fatG: oilTbsp * 14,
      waterMl: 0,
      sodiumMg: 0,
    },
    from100g("fat-avocado", "아보카도", avocadoG, {
      carbs: 8.5,
      protein: 2,
      fat: 15,
      sodium: 7,
    }),
    from100g("fat-almond", "아몬드", almondG, {
      carbs: 22,
      protein: 21,
      fat: 50,
      sodium: 1,
    }),
    from100g("fat-peanut", "땅콩버터", peanutG, {
      carbs: 22,
      protein: 22,
      fat: 50,
      sodium: 190,
    }),
  ]
}

function getWaterAlternatives(waterMl: number): FoodOption[] {
  const ml = roundStep(waterMl, 50, 200, 1500)
  const bottles = Math.max(1, Math.round(ml / 500))
  const ionMl = roundStep(ml * 0.4, 100, 200, 600)
  const waterPart = roundStep(ml * 0.6, 50, 200, 1000)

  return [
    {
      id: "water-plain",
      label: `물 ${ml}ml`,
      carbsG: 0,
      proteinG: 0,
      fatG: 0,
      waterMl: ml,
      sodiumMg: 0,
    },
    {
      id: "water-bottle",
      label: `미네랄워터 ${bottles}병(500ml)`,
      carbsG: 0,
      proteinG: 0,
      fatG: 0,
      waterMl: bottles * 500,
      sodiumMg: bottles * 10,
    },
    {
      id: "water-ion",
      label: `이온음료 ${ionMl}ml + 물 ${waterPart}ml`,
      carbsG: round1(ionMl * 0.06),
      proteinG: 0,
      fatG: 0,
      waterMl: ionMl + waterPart,
      sodiumMg: Math.round(ionMl * 0.45),
    },
    {
      id: "water-tea",
      label: `무가당 녹차·보리차 ${ml}ml`,
      carbsG: 0,
      proteinG: 0,
      fatG: 0,
      waterMl: ml,
      sodiumMg: 5,
    },
  ]
}

function getSodiumAlternatives(sodiumMg: number): FoodOption[] {
  const kimchiG = roundStep((sodiumMg / 600) * 100, 10, 30, 150)
  const soupMl = roundStep((sodiumMg / 800) * 250, 50, 150, 400)
  const saltG = Math.round((sodiumMg / 400) * 10) / 10

  return [
    {
      id: "sodium-soup",
      label: `저염 된장국 ${soupMl}ml`,
      carbsG: round1(soupMl * 0.04),
      proteinG: round1(soupMl * 0.02),
      fatG: round1(soupMl * 0.01),
      waterMl: soupMl,
      sodiumMg: Math.round(soupMl * 3.2),
    },
    from100g("sodium-kimchi", "김치", kimchiG, {
      carbs: 4,
      protein: 1.6,
      fat: 0.6,
      sodium: 600,
    }),
    {
      id: "sodium-sports",
      label: "전해질 스포츠음료 1병",
      carbsG: 14,
      proteinG: 0,
      fatG: 0,
      waterMl: 500,
      sodiumMg: 220,
    },
    {
      id: "sodium-salt",
      label: `조리 시 소금 ${Math.min(1.2, Math.max(0.3, saltG))}g`,
      carbsG: 0,
      proteinG: 0,
      fatG: 0,
      waterMl: 0,
      sodiumMg: Math.round(Math.min(1.2, Math.max(0.3, saltG)) * 400),
    },
  ]
}

function primaryMacroValue(key: MacroNutrientKey, option: FoodOption): number {
  switch (key) {
    case "carbs":
      return option.carbsG
    case "protein":
      return option.proteinG
    case "fat":
      return option.fatG
    case "water":
      return option.waterMl
    case "sodium":
      return option.sodiumMg
  }
}

export function getFoodAlternativeGroup(
  key: MacroNutrientKey,
  perMeal: MealMacroTargets
): FoodAlternativeGroup {
  let options: FoodOption[]
  let perMealTarget: string

  switch (key) {
    case "carbs":
      options = getCarbAlternatives(perMeal.carbsG)
      perMealTarget = `${perMeal.carbsG}g`
      break
    case "protein":
      options = getProteinAlternatives(perMeal.proteinG)
      perMealTarget = `${perMeal.proteinG}g`
      break
    case "fat":
      options = getFatAlternatives(perMeal.fatG)
      perMealTarget = `${perMeal.fatG}g`
      break
    case "water":
      options = getWaterAlternatives(perMeal.waterMl)
      perMealTarget = `${perMeal.waterMl}ml`
      break
    case "sodium":
      options = getSodiumAlternatives(perMeal.sodiumMg)
      perMealTarget = `${perMeal.sodiumMg}mg`
      break
  }

  return { key, label: getNutrientLabel(key), perMealTarget, options }
}

function targetsToDailyMealTargets(targets: MacroTargets): MealMacroTargets {
  return {
    calories: targets.calories,
    carbsG: targets.carbsG,
    proteinG: targets.proteinG,
    fatG: targets.fatG,
    waterMl: Math.round(targets.waterL * 1000),
    sodiumMg: targets.sodiumMg,
  }
}

export function getFoodAlternativeGroupForScope(
  key: MacroNutrientKey,
  targets: MacroTargets,
  scope: MenuSelectionScope
): FoodAlternativeGroup {
  if (scope === "meal") {
    return getFoodAlternativeGroup(key, targets.perMeal)
  }
  return getFoodAlternativeGroup(key, targetsToDailyMealTargets(targets))
}

export function getNutrientLabel(key: MacroNutrientKey): string {
  switch (key) {
    case "carbs":
      return "탄수화물"
    case "protein":
      return "단백질"
    case "fat":
      return "지방"
    case "water":
      return "수분"
    case "sodium":
      return "나트륨"
  }
}

export function getMealFoodAlternatives(
  perMeal: MealMacroTargets
): FoodAlternativeGroup[] {
  return MACRO_KEYS.map((key) => getFoodAlternativeGroup(key, perMeal))
}

export function findFoodOptionByScope(
  targets: MacroTargets,
  key: MacroNutrientKey,
  optionId: string,
  scope: MenuSelectionScope
): FoodOption | undefined {
  return getFoodAlternativeGroupForScope(key, targets, scope).options.find(
    (o) => o.id === optionId
  )
}

/** @deprecated use findFoodOptionByScope */
export function findFoodOption(
  perMeal: MealMacroTargets,
  key: MacroNutrientKey,
  optionId: string
): FoodOption | undefined {
  return getFoodAlternativeGroup(key, perMeal).options.find((o) => o.id === optionId)
}

function applyOptionToPerMeal(
  perMeal: MealMacroTargets,
  key: MacroNutrientKey,
  option: FoodOption,
  scope: MenuSelectionScope,
  mealsPerDay: number
): void {
  const factor = scope === "daily" ? 1 / mealsPerDay : 1

  switch (key) {
    case "carbs":
      perMeal.carbsG = round1(option.carbsG * factor)
      break
    case "protein":
      perMeal.proteinG = round1(option.proteinG * factor)
      break
    case "fat":
      perMeal.fatG = round1(option.fatG * factor)
      break
    case "water":
      perMeal.waterMl = Math.round(option.waterMl * factor)
      break
    case "sodium":
      perMeal.sodiumMg = Math.round(option.sodiumMg * factor)
      break
  }
}

export function getSelectedMealMacros(
  targets: MacroTargets,
  selection: MealMenuSelection
): {
  perMeal: MealMacroTargets
  selectedOptions: Partial<
    Record<MacroNutrientKey, FoodOption & { scope: MenuSelectionScope }>
  >
} {
  const selectedOptions: Partial<
    Record<MacroNutrientKey, FoodOption & { scope: MenuSelectionScope }>
  > = {}
  const perMeal: MealMacroTargets = { ...targets.perMeal }
  const n = targets.mealsPerDay

  for (const key of MACRO_KEYS) {
    const entry = selection[key]
    if (!entry) continue
    const option = findFoodOptionByScope(targets, key, entry.optionId, entry.scope)
    if (!option) continue
    selectedOptions[key] = { ...option, scope: entry.scope }
    applyOptionToPerMeal(perMeal, key, option, entry.scope, n)
  }

  perMeal.calories = Math.round(
    perMeal.carbsG * 4 + perMeal.proteinG * 4 + perMeal.fatG * 9
  )

  return { perMeal, selectedOptions }
}

export function formatMealFoodAlternativesText(
  perMeal: MealMacroTargets
): string {
  return getMealFoodAlternatives(perMeal)
    .map(
      (group) =>
        `${group.label} : ${group.options
          .slice(0, 4)
          .map((o) => o.label)
          .join(" · ")}`
    )
    .join("\n")
}

export function formatOptionMacroHint(
  key: MacroNutrientKey,
  option: FoodOption
): string {
  const v = primaryMacroValue(key, option)
  const unit =
    key === "water" ? "ml" : key === "sodium" ? "mg" : "g"
  return `${v}${unit}`
}
