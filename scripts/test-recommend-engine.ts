/**
 * 영양 전략 추천 엔진 시나리오 테스트 (Supabase 없이 mock 후보)
 * npm run test:recommend
 */

import { generateFoodRecommendationsFromCandidates } from "../lib/food-recommendation-engine"
import type { FoodCandidate } from "../lib/food-recommendation-types"
import { proteinVariant } from "../lib/food-recommendation-strategy"

const MOCK: FoodCandidate[] = [
  mk("1", "닭가슴살(삶은)", "high_protein", 165, 31, 0, 3.6),
  mk("2", "현미밥", "carbs_starch", 111, 2.6, 23, 0.9),
  mk("3", "김치", "korean_meal", 24, 1.7, 3.9, 0.5, 2),
  mk("4", "시금치나물", "salad_veggie", 23, 2.4, 2.8, 0.4, 2.5),
  mk("5", "고구마", "carbs_starch", 86, 1.6, 20, 0.1, 3),
  mk("6", "두부", "egg_tofu_bean", 76, 8.1, 1.9, 4.8),
  mk("7", "계란(삶은)", "egg_tofu_bean", 155, 12.6, 1.1, 10.6),
  mk("8", "바나나", "fruit", 89, 1.1, 22.8, 0.3, 2.6),
  mk("9", "우유", "dairy_yogurt", 60, 3.3, 4.7, 3.3),
  mk("10", "연어구이", "fish_seafood", 208, 20, 0, 13),
  mk("11", "소고기 안심", "high_protein", 180, 22, 0, 8),
  mk("12", "샐러드", "salad_veggie", 35, 2, 5, 0.5, 2),
  mk("13", "삼각김밥", "convenience", 180, 4, 38, 2),
  mk("14", "그릭요거트", "dairy_yogurt", 97, 9, 6, 5),
  mk("15", "미역국", "soup_stew", 30, 2, 3, 1, 1, 900),
]

function mk(
  id: string,
  nameKo: string,
  bucket: FoodCandidate["bucket"],
  calories: number,
  proteinG: number,
  carbsG: number,
  fatG: number,
  fiberG = 1,
  sodiumMg = 200
): FoodCandidate {
  return {
    id: `mfds:${id}`,
    nameKo,
    category: bucket,
    representativeName: null,
    pieceWeightG: 100,
    per100g: { calories, proteinG, carbsG, fatG, sodiumMg, fiberG },
    bucket,
    proteinVariant: proteinVariant(nameKo),
  }
}

const SCENARIOS = [
  {
    name: "1. 감량 우선 + 휴식일 + 저녁",
    req: {
      goal: "fat_loss_priority" as const,
      trainingStatus: "rest" as const,
      mealTiming: "dinner" as const,
      intensity: "satiety_focus" as const,
      targets: { calories: 1800, proteinG: 110, carbsG: 180, fatG: 55, fiberG: 25 },
      consumed: { calories: 1400, proteinG: 70, carbsG: 150, fatG: 45, sodiumMg: 900, sugarG: 30, fiberG: 10 },
    },
  },
  {
    name: "2. 체지방 감량 + 중강도 러닝 + 운동 후",
    req: {
      goal: "fat_loss_train_maintain" as const,
      trainingStatus: "moderate_run" as const,
      mealTiming: "post_workout" as const,
      intensity: "athlete_balanced" as const,
      targets: { calories: 2000, proteinG: 120, carbsG: 200, fatG: 60, fiberG: 25 },
      consumed: { calories: 1200, proteinG: 55, carbsG: 90, fatG: 35, sodiumMg: 800, sugarG: 20, fiberG: 8 },
    },
  },
  {
    name: "3. 러닝 퍼포먼스 + 인터벌 전",
    req: {
      goal: "running_performance" as const,
      trainingStatus: "interval_speed" as const,
      mealTiming: "pre_workout" as const,
      intensity: "carb_refuel" as const,
      targets: { calories: 2200, proteinG: 120, carbsG: 280, fatG: 65, fiberG: 25 },
      consumed: { calories: 900, proteinG: 40, carbsG: 80, fatG: 30, sodiumMg: 700, sugarG: 15, fiberG: 12 },
    },
  },
  {
    name: "4. 장거리 LSD 후",
    req: {
      goal: "post_workout_recovery" as const,
      trainingStatus: "long_lsd" as const,
      mealTiming: "post_workout" as const,
      intensity: "carb_refuel" as const,
      targets: { calories: 2400, proteinG: 130, carbsG: 300, fatG: 70, fiberG: 25 },
      consumed: { calories: 1100, proteinG: 50, carbsG: 70, fatG: 35, sodiumMg: 1000, sugarG: 20, fiberG: 9 },
    },
  },
  {
    name: "5. 나트륨 과다",
    req: {
      goal: "light_management" as const,
      trainingStatus: "rest" as const,
      mealTiming: "dinner" as const,
      intensity: "sodium_control" as const,
      targets: { calories: 2000, proteinG: 120, carbsG: 200, fatG: 60, fiberG: 25, sodiumMg: 2000 },
      consumed: { calories: 1600, proteinG: 85, carbsG: 180, fatG: 50, sodiumMg: 2800, sugarG: 35, fiberG: 14 },
    },
  },
  {
    name: "6. 식이섬유 부족",
    req: {
      goal: "light_management" as const,
      trainingStatus: "easy_jog" as const,
      mealTiming: "lunch" as const,
      intensity: "satiety_focus" as const,
      targets: { calories: 2000, proteinG: 120, carbsG: 200, fatG: 60, fiberG: 25 },
      consumed: { calories: 1400, proteinG: 90, carbsG: 170, fatG: 40, sodiumMg: 1100, sugarG: 40, fiberG: 6 },
    },
  },
  {
    name: "7. 단백질 부족 (다양성)",
    req: {
      goal: "muscle_maintain" as const,
      trainingStatus: "weight_training" as const,
      mealTiming: "lunch" as const,
      intensity: "high_protein_low_fat" as const,
      targets: { calories: 2200, proteinG: 140, carbsG: 220, fatG: 65, fiberG: 25 },
      consumed: { calories: 1500, proteinG: 60, carbsG: 160, fatG: 50, sodiumMg: 1200, sugarG: 30, fiberG: 15 },
    },
  },
]

for (const s of SCENARIOS) {
  const result = generateFoodRecommendationsFromCandidates(
    { ...s.req, variantSeed: 1 },
    MOCK
  )
  console.log(`\n=== ${s.name} ===`)
  console.log("summary:", result.summary)
  console.log("deficits:", result.deficits.map((d) => d.label).join(", "))
  console.log("combos:", result.recommendations.length)
  for (const c of result.recommendations) {
    const proteins = c.items
      .filter((i) => i.protein >= 8)
      .map((i) => i.nameKo)
      .join(" / ")
    console.log(`  · [${c.level}] ${c.title}`)
    console.log(`    ${c.items.map((i) => i.nameKo).join(" + ")}`)
    if (proteins) console.log(`    단백질: ${proteins}`)
  }
}

console.log("\nDone.")
