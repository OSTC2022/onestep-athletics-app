/**
 * 영양 전략 추천 엔진 시나리오 테스트 (Supabase 없이 mock 후보)
 * npm run test:recommend
 */

import { generateFoodRecommendationsFromCandidates } from "../lib/food-recommendation-engine"
import type { FoodCandidate } from "../lib/food-recommendation-types"
import {
  assessNutritionDataQuality,
  type NutritionDataQuality,
} from "../lib/food-nutrition-quality"
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
  mkSuspicious(
    "16",
    "피자_더블불고기피자오리지널(L)",
    "korean_meal",
    320,
    19.4,
    0,
    0,
    1
  ),
  mk(
    "17",
    "피자(정상데이터)",
    "korean_meal",
    266,
    11,
    33,
    10,
    2,
    600
  ),
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
  sodiumMg = 200,
  quality?: NutritionDataQuality
): FoodCandidate {
  const per100g = {
    calories,
    carbsG,
    proteinG,
    fatG,
    sodiumMg,
    fiberG,
  }
  const assessment = assessNutritionDataQuality(per100g, nameKo, bucket)
  return {
    id: `mfds:${id}`,
    nameKo,
    category: bucket,
    representativeName: null,
    pieceWeightG: 100,
    per100g,
    bucket,
    proteinVariant: proteinVariant(nameKo),
    dataQuality: quality ?? assessment.quality,
    dataQualityReasons: assessment.reasons,
  }
}

function mkSuspicious(
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
  return mk(id, nameKo, bucket, calories, proteinG, carbsG, fatG, fiberG, sodiumMg, "suspicious")
}

const SCENARIOS = [
  {
    name: "A. 엄격한 감량식 + 점심 (피자 제외)",
    req: {
      goal: "fat_loss_priority" as const,
      trainingStatus: "rest" as const,
      mealTiming: "lunch" as const,
      intensity: "strict_loss" as const,
      targets: { calories: 1800, proteinG: 110, carbsG: 180, fatG: 55, fiberG: 25 },
      consumed: { calories: 900, proteinG: 45, carbsG: 80, fatG: 30, sodiumMg: 700, sugarG: 20, fiberG: 8 },
    },
    assert: (names: string[]) => {
      const bad = names.filter((n) => /피자|케이크|튀김|라면|디저트/.test(n))
      if (bad.length > 0) throw new Error(`엄격한 감량식에 부적합: ${bad.join(", ")}`)
    },
  },
  {
    name: "B. 현실적 다이어트 + 점심 (피자는 소량 조절만)",
    req: {
      goal: "fat_loss_priority" as const,
      trainingStatus: "rest" as const,
      mealTiming: "lunch" as const,
      intensity: "realistic_diet" as const,
      targets: { calories: 1800, proteinG: 110, carbsG: 180, fatG: 55, fiberG: 25 },
      consumed: { calories: 900, proteinG: 45, carbsG: 80, fatG: 30, sodiumMg: 700, sugarG: 20, fiberG: 8 },
    },
    assert: (names: string[], combos: { title: string; level: string }[]) => {
      const top = combos[0]
      if (top && /피자/.test(names[0] ?? "") && !/조절|현실/.test(top.title + top.level)) {
        throw new Error("피자가 대표 추천으로 노출됨 (조절식이 아님)")
      }
    },
  },
  {
    name: "C. 탄수0 지방0 의심 데이터 제외",
    req: {
      goal: "fat_loss_priority" as const,
      trainingStatus: "rest" as const,
      mealTiming: "lunch" as const,
      intensity: "realistic_diet" as const,
      targets: { calories: 1800, proteinG: 110, carbsG: 180, fatG: 55, fiberG: 25 },
      consumed: { calories: 900, proteinG: 45, carbsG: 80, fatG: 30, sodiumMg: 700, sugarG: 20, fiberG: 8 },
    },
    assert: (names: string[]) => {
      if (names.some((n) => n.includes("더블불고기피자"))) {
        throw new Error("suspicious 피자가 추천에 포함됨")
      }
    },
  },
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

let failed = 0

for (const s of SCENARIOS) {
  const result = generateFoodRecommendationsFromCandidates(
    { ...s.req, variantSeed: 1 },
    MOCK
  )
  const allNames = result.recommendations.flatMap((c) => c.items.map((i) => i.nameKo))
  console.log(`\n=== ${s.name} ===`)
  console.log("summary:", result.summary)
  console.log("deficits:", result.deficits.map((d) => d.label).join(", "))
  console.log("combos:", result.recommendations.length)
  if (result.pipeline) {
    console.log(
      "pipeline:",
      `${result.pipeline.afterHardFilterCount} fetched → quality ${result.pipeline.afterQualityFilterCount ?? "?"} → ${result.pipeline.afterScoringCount} scored → ${result.pipeline.selectedRecommendationCount} combos`
    )
  }
  for (const c of result.recommendations) {
    console.log(`  · [${c.level}] ${c.title}`)
    console.log(`    ${c.items.map((i) => i.nameKo).join(" + ")}`)
  }

  try {
    if ("assert" in s && s.assert) {
      s.assert(allNames, result.recommendations)
      console.log("  ✓ assertion passed")
    }
  } catch (e) {
    failed++
    console.error("  ✗", e instanceof Error ? e.message : e)
  }
}

if (failed > 0) {
  console.error(`\n${failed} scenario(s) failed.`)
  process.exit(1)
}

console.log("\nDone — all quality assertions passed.")
