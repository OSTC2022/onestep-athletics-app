import {
  formatPortionAmount,
  getFoodById,
  getPieceWeightG,
  getRefinedCarbLevel,
  gramsForServingCount,
  nutritionAtGrams,
  type FoodDatabaseItem,
} from "@/lib/food-database"
import {
  getCoachingModeLabel,
  resolveCoachingMode,
  type DietCoachingMode,
} from "@/lib/diet-coaching"
import {
  FOOD_MEAL_SLOT_IDS,
  type FoodMealSlotId,
  type MealSlotMacroTargets,
} from "@/lib/meal-slot-targets"
import {
  getDietModeLabel,
  getGoalLabel,
  getTrainingNutritionCategory,
  type GoalType,
  type MacroTargets,
  type UserProfile,
} from "@/lib/user-profile"
import type { WeeklyScheduleDay } from "@/lib/weekly-schedule"
import type { LoggedNutrition } from "@/lib/food-nutrition-utils"

const SLOT_LABELS: Record<FoodMealSlotId, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
}

type MenuItemSpec = {
  foodId: string
  servings: number
}

type MealTemplate = {
  title: string
  items: MenuItemSpec[]
  note: string
}

type DayMenuTemplate = Record<FoodMealSlotId, MealTemplate>

export type RecommendedMenuItem = {
  foodId: string
  name: string
  displayAmount: string
  servings: number
  grams: number
  calories: number
  nutrition: LoggedNutrition
  /** 추가된 항목(`+` 오버라이드)일 때 삭제·교체용 */
  addOverrideKey?: string
}

export type RecommendedMealSlot = {
  slotId: FoodMealSlotId
  label: string
  title: string
  items: RecommendedMenuItem[]
  targetCalories: number
  estimatedCalories: number
  coachingNote: string
  coachingNoteBrief: string
  nutrition: LoggedNutrition
  slotTargets: MealSlotMacroTargets
}

export type DailyMealMenuPlan = {
  headline: string
  subtitle: string
  subtitleBrief: string
  goalLabel: string
  trainingHint: string | null
  meals: RecommendedMealSlot[]
  totalEstimatedCalories: number
  targetCalories: number
  dailyNutrition: LoggedNutrition
  variantIndex: number
  variantCount: number
}

export type MenuItemSlotOverride =
  | { action: "replace"; spec: { foodId: string; servings: number }; lockServings?: boolean }
  | { action: "delete" }
  | { action: "add"; spec: { foodId: string; servings: number } }

export type SavedSlotMenuSpec = {
  items: MenuItemSpec[]
  title?: string
  lockServings?: boolean
  /** 불러오기마다 갱신 — 동일 구성 재적용 시에도 UI·빌드 갱신 */
  loadToken?: number
}

export type BuildMealMenuOptions = {
  variantIndex?: number
  coachingModeOverride?: DietCoachingMode
  /** `${slotId}:${itemIndex}` → 새로고침 횟수 */
  itemRefreshCounts?: Record<string, number>
  /** `${slotId}:${itemIndex}` → 음식 교체·삭제 */
  itemSlotOverrides?: Record<string, MenuItemSlotOverride>
  /** 저장·불러온 끼니 구성 */
  savedSlotSpecs?: Partial<Record<FoodMealSlotId, SavedSlotMenuSpec>>
  /** 항목별 편집 시 나머지 음식·수량 고정 */
  slotFrozenSpecs?: Partial<Record<FoodMealSlotId, MenuItemSpec[]>>
  /** 끼니 단위 새로고침 횟수 */
  slotRefreshCounts?: Partial<Record<FoodMealSlotId, number>>
}

type MenuScenario =
  | "loss-normal-training"
  | "loss-normal-rest"
  | "loss-fast-training"
  | "loss-fast-rest"
  | "maintain-training"
  | "maintain-rest"
  | "gain-training"
  | "gain-rest"
  | "performance"

function resolveMenuScenario(
  profile: UserProfile,
  trainingHigh: boolean,
  coachingMode: DietCoachingMode | null = resolveCoachingMode(profile.dietMode)
): MenuScenario {

  if (profile.goalType === "gain" || profile.dietMode === "gain") {
    return trainingHigh ? "gain-training" : "gain-rest"
  }

  if (
    profile.goalType === "performance" ||
    profile.goalType === "competition" ||
    profile.dietMode === "performance_loss"
  ) {
    return "performance"
  }

  if (profile.goalType === "maintain" || profile.dietMode === "maintain") {
    return trainingHigh ? "maintain-training" : "maintain-rest"
  }

  if (coachingMode === "fast_loss") {
    return trainingHigh ? "loss-fast-training" : "loss-fast-rest"
  }

  return trainingHigh ? "loss-normal-training" : "loss-normal-rest"
}

const LOSS_NORMAL_TRAINING: DayMenuTemplate = {
  breakfast: {
    title: "오트밀 + 계란 + 딸기",
    items: [
      { foodId: "oatmeal-cooked", servings: 1 },
      { foodId: "egg", servings: 1 },
      { foodId: "strawberry", servings: 6 },
    ],
    note: "운동일 아침 · 복합탄수와 단백질로 충전",
  },
  lunch: {
    title: "닭가슴살 도시락",
    items: [
      { foodId: "chicken-breast", servings: 1.5 },
      { foodId: "rice-brown", servings: 1 },
      { foodId: "spinach-side", servings: 1 },
      { foodId: "kimchi", servings: 1 },
    ],
    note: "현미·단백·나물 중심, 밥·면·김밥보다 적합",
  },
  dinner: {
    title: "연어 + 고구마 + 브로콜리",
    items: [
      { foodId: "salmon", servings: 1 },
      { foodId: "sweet-potato", servings: 1 },
      { foodId: "broccoli", servings: 1.5 },
    ],
    note: "저녁은 정제탄수 줄이고 단백·채소 위주",
  },
  snack: {
    title: "그릭요거트",
    items: [{ foodId: "greek-yogurt", servings: 1 }],
    note: "간식은 가볍게, 단백질 보충",
  },
}

const LOSS_NORMAL_REST: DayMenuTemplate = {
  breakfast: {
    title: "계란 + 현미밥 + 김치",
    items: [
      { foodId: "egg", servings: 2 },
      { foodId: "rice-brown", servings: 0.7 },
      { foodId: "kimchi", servings: 1 },
    ],
    note: "휴식일 · 양은 줄이고 단백질 유지",
  },
  lunch: {
    title: "닭가슴살 샐러드 + 두부",
    items: [
      { foodId: "salad-chicken", servings: 1 },
      { foodId: "tofu", servings: 0.7 },
      { foodId: "bean-sprout-side", servings: 1 },
    ],
    note: "밥 없이도 든든한 단백·채소 구성",
  },
  dinner: {
    title: "참치 + 채소 볶음",
    items: [
      { foodId: "tuna-can", servings: 1 },
      { foodId: "spinach-side", servings: 1 },
      { foodId: "sweet-potato", servings: 0.7 },
    ],
    note: "탄수는 고구마 소량, 단백질 위주",
  },
  snack: {
    title: "사과",
    items: [{ foodId: "apple", servings: 0.5 }],
    note: "과일 1회분 이내",
  },
}

const LOSS_FAST_TRAINING: DayMenuTemplate = {
  breakfast: {
    title: "계란 + 방울토마토",
    items: [
      { foodId: "egg", servings: 2 },
      { foodId: "cherry-tomato", servings: 8 },
    ],
    note: "강한 감량 · 아침은 단백·채소 중심",
  },
  lunch: {
    title: "닭가슴살 + 현미 반공기 + 나물",
    items: [
      { foodId: "chicken-breast", servings: 1.5 },
      { foodId: "rice-brown", servings: 0.6 },
      { foodId: "spinach-side", servings: 1 },
    ],
    note: "흰밥·면·김밥 대신 현미 소량 + 단백질",
  },
  dinner: {
    title: "두부 + 채소 + 계란",
    items: [
      { foodId: "tofu", servings: 1 },
      { foodId: "broccoli", servings: 1.5 },
      { foodId: "egg-white", servings: 2 },
    ],
    note: "저녁 탄수 최소, 단백질 충분히",
  },
  snack: {
    title: "단백질 쉐이크",
    items: [{ foodId: "protein-shake", servings: 0.5 }],
    note: "간식 100~200kcal 이내",
  },
}

const LOSS_FAST_REST: DayMenuTemplate = {
  breakfast: {
    title: "계란 흰자 + 그릭요거트",
    items: [
      { foodId: "egg", servings: 1 },
      { foodId: "egg-white", servings: 2 },
      { foodId: "greek-yogurt", servings: 1 },
    ],
    note: "휴식일 · 저지방 단백질 중심, 탄수 최소",
  },
  lunch: {
    title: "닭가슴살 샐러드",
    items: [
      { foodId: "salad-chicken", servings: 1.2 },
      { foodId: "kimchi", servings: 1 },
    ],
    note: "밥·면 없이 단백·채소 위주",
  },
  dinner: {
    title: "참치 + 콩나물 + 시금치",
    items: [
      { foodId: "tuna-can", servings: 1 },
      { foodId: "bean-sprout-side", servings: 1 },
      { foodId: "spinach-side", servings: 1 },
    ],
    note: "정제탄수 없이 포만감 확보",
  },
  snack: {
    title: "딸기",
    items: [{ foodId: "strawberry", servings: 5 }],
    note: "과일 1회분 · 당류 낮은 편",
  },
}

const MAINTAIN_TRAINING: DayMenuTemplate = {
  breakfast: {
    title: "오트밀 + 바나나 + 우유",
    items: [
      { foodId: "oatmeal-cooked", servings: 1.2 },
      { foodId: "banana", servings: 1 },
      { foodId: "milk", servings: 1 },
    ],
    note: "운동일 · 탄수·단백 균형 있게",
  },
  lunch: {
    title: "현미밥 + 닭가슴살 + 미역국",
    items: [
      { foodId: "rice-brown", servings: 1.2 },
      { foodId: "chicken-breast", servings: 1.5 },
      { foodId: "miyeok-guk", servings: 0.7 },
    ],
    note: "훈련량 반영 · 에너지와 회복 균형",
  },
  dinner: {
    title: "연어 + 잡곡밥 + 나물",
    items: [
      { foodId: "salmon", servings: 1 },
      { foodId: "rice-mixed", servings: 1 },
      { foodId: "spinach-side", servings: 1 },
    ],
    note: "유지 목표 · 과하지 않게 충분히",
  },
  snack: {
    title: "바나나 or 프로틴바",
    items: [{ foodId: "banana", servings: 0.7 }],
    note: "운동 전후 탄수·단백 보충",
  },
}

const MAINTAIN_REST: DayMenuTemplate = {
  breakfast: {
    title: "계란 + 현미밥 + 김치",
    items: [
      { foodId: "egg", servings: 2 },
      { foodId: "rice-brown", servings: 1 },
      { foodId: "kimchi", servings: 1 },
    ],
    note: "휴식일 · 평소 식단 유지",
  },
  lunch: {
    title: "닭가슴살 + 현미 + 나물",
    items: [
      { foodId: "chicken-breast", servings: 1.2 },
      { foodId: "rice-brown", servings: 1 },
      { foodId: "bean-sprout-side", servings: 1 },
    ],
    note: "균형 잡힌 한 끼",
  },
  dinner: {
    title: "두부찌개 + 고구마 + 채소",
    items: [
      { foodId: "tofu", servings: 1 },
      { foodId: "sweet-potato", servings: 1 },
      { foodId: "broccoli", servings: 1 },
    ],
    note: "가벼운 저녁, 내일 훈련 대비",
  },
  snack: {
    title: "그릭요거트 + 아몬드",
    items: [
      { foodId: "greek-yogurt", servings: 1 },
      { foodId: "almond", servings: 0.5 },
    ],
    note: "가벼운 간식",
  },
}

const GAIN_TRAINING: DayMenuTemplate = {
  breakfast: {
    title: "오트밀 + 계란 + 바나나 + 우유",
    items: [
      { foodId: "oatmeal-cooked", servings: 1.5 },
      { foodId: "egg", servings: 2 },
      { foodId: "banana", servings: 1 },
      { foodId: "milk", servings: 1 },
    ],
    note: "증량 · 운동일 에너지 충분히",
  },
  lunch: {
    title: "현미밥 + 닭다리 + 미역국",
    items: [
      { foodId: "rice-brown", servings: 1.5 },
      { foodId: "chicken-thigh", servings: 1.5 },
      { foodId: "miyeok-guk", servings: 1 },
    ],
    note: "탄수·단백·지방 골고루",
  },
  dinner: {
    title: "연어 + 잡곡밥 + 고구마",
    items: [
      { foodId: "salmon", servings: 1.2 },
      { foodId: "rice-mixed", servings: 1.2 },
      { foodId: "sweet-potato", servings: 0.7 },
    ],
    note: "회복과 증량을 함께",
  },
  snack: {
    title: "프로틴바 + 우유",
    items: [
      { foodId: "protein-bar", servings: 0.7 },
      { foodId: "milk", servings: 1 },
    ],
    note: "훈련 후 보충",
  },
}

const GAIN_REST: DayMenuTemplate = {
  breakfast: {
    title: "계란 + 현미밥 + 아보카도",
    items: [
      { foodId: "egg", servings: 2 },
      { foodId: "rice-brown", servings: 1.2 },
      { foodId: "avocado", servings: 0.5 },
    ],
    note: "휴식일도 충분한 칼로리",
  },
  lunch: {
    title: "참치마요덮밥 + 계란",
    items: [
      { foodId: "tuna-rice", servings: 1 },
      { foodId: "egg", servings: 1 },
    ],
    note: "현실적인 한 끼 · 양 조절 가능",
  },
  dinner: {
    title: "닭가슴살 + 현미 + 나물",
    items: [
      { foodId: "chicken-breast", servings: 1.5 },
      { foodId: "rice-brown", servings: 1.2 },
      { foodId: "spinach-side", servings: 1 },
    ],
    note: "단백질 중심 증량",
  },
  snack: {
    title: "그릭요거트 + 견과",
    items: [
      { foodId: "greek-yogurt", servings: 1 },
      { foodId: "almond", servings: 1 },
    ],
    note: "칼로리 보충 간식",
  },
}

const PERFORMANCE: DayMenuTemplate = {
  breakfast: {
    title: "오트밀 + 바나나 + 계란",
    items: [
      { foodId: "oatmeal-cooked", servings: 1.2 },
      { foodId: "banana", servings: 1 },
      { foodId: "egg", servings: 1 },
    ],
    note: "경기력 · 탄수와 단백 균형",
  },
  lunch: {
    title: "현미 + 닭가슴살 + 채소",
    items: [
      { foodId: "rice-brown", servings: 1.2 },
      { foodId: "chicken-breast", servings: 1.5 },
      { foodId: "broccoli", servings: 1 },
    ],
    note: "훈련 강도에 맞는 에너지",
  },
  dinner: {
    title: "연어 + 고구마 + 나물",
    items: [
      { foodId: "salmon", servings: 1 },
      { foodId: "sweet-potato", servings: 1 },
      { foodId: "spinach-side", servings: 1 },
    ],
    note: "회복과 컨디션 유지",
  },
  snack: {
    title: "바나나",
    items: [{ foodId: "banana", servings: 0.7 }],
    note: "운동 전후 탄수 보충",
  },
}

const MENU_VARIANTS: Record<MenuScenario, DayMenuTemplate[]> = {
  "loss-normal-training": [
    LOSS_NORMAL_TRAINING,
    {
      breakfast: {
        title: "그릭요거트 + 바나나 + 계란",
        items: [
          { foodId: "greek-yogurt", servings: 1 },
          { foodId: "banana", servings: 0.5 },
          { foodId: "egg", servings: 1 },
        ],
        note: "운동일 · 단백·탄수 균형 아침",
      },
      lunch: {
        title: "참치 + 현미 + 나물",
        items: [
          { foodId: "tuna-can", servings: 1 },
          { foodId: "rice-brown", servings: 0.9 },
          { foodId: "bean-sprout-side", servings: 1 },
          { foodId: "kimchi", servings: 1 },
        ],
        note: "간편 도시락 · 정제탄수 대신 현미",
      },
      dinner: {
        title: "닭가슴살 + 고구마 + 브로콜리",
        items: [
          { foodId: "chicken-breast", servings: 1.5 },
          { foodId: "sweet-potato", servings: 0.8 },
          { foodId: "broccoli", servings: 1.5 },
        ],
        note: "저녁 단백·채소 위주",
      },
      snack: {
        title: "단백질 쉐이크",
        items: [{ foodId: "protein-shake", servings: 0.6 }],
        note: "가벼운 단백 보충",
      },
    },
    {
      breakfast: {
        title: "오트밀 + 우유 + 사과",
        items: [
          { foodId: "oatmeal-cooked", servings: 1.2 },
          { foodId: "milk", servings: 1 },
          { foodId: "apple", servings: 0.5 },
        ],
        note: "운동일 · 복합탄수로 에너지 충전",
      },
      lunch: {
        title: "연어 + 현미 + 시금치",
        items: [
          { foodId: "salmon", servings: 1 },
          { foodId: "rice-brown", servings: 0.8 },
          { foodId: "spinach-side", servings: 1 },
        ],
        note: "고단백·오메가3 + 현미",
      },
      dinner: {
        title: "두부 + 채소 + 계란",
        items: [
          { foodId: "tofu", servings: 1 },
          { foodId: "spinach-side", servings: 1 },
          { foodId: "egg", servings: 1 },
        ],
        note: "저녁 가볍게, 단백질 유지",
      },
      snack: {
        title: "딸기",
        items: [{ foodId: "strawberry", servings: 6 }],
        note: "당류 낮은 과일 1회분",
      },
    },
  ],
  "loss-normal-rest": [
    LOSS_NORMAL_REST,
    {
      breakfast: {
        title: "그릭요거트 + 계란",
        items: [
          { foodId: "greek-yogurt", servings: 1 },
          { foodId: "egg", servings: 1 },
        ],
        note: "휴식일 · 탄수 줄인 아침",
      },
      lunch: {
        title: "참치 샐러드 + 두부",
        items: [
          { foodId: "tuna-can", servings: 1 },
          { foodId: "tofu", servings: 0.8 },
          { foodId: "cherry-tomato", servings: 6 },
        ],
        note: "밥 없이 단백·채소",
      },
      dinner: {
        title: "닭가슴살 + 브로콜리",
        items: [
          { foodId: "chicken-breast", servings: 1.2 },
          { foodId: "broccoli", servings: 1.5 },
          { foodId: "kimchi", servings: 1 },
        ],
        note: "탄수 최소, 단백질 충분히",
      },
      snack: {
        title: "방울토마토",
        items: [{ foodId: "cherry-tomato", servings: 10 }],
        note: "저칼로리 간식",
      },
    },
    {
      breakfast: {
        title: "계란 흰자 + 김치",
        items: [
          { foodId: "egg-white", servings: 3 },
          { foodId: "kimchi", servings: 1 },
        ],
        note: "고단백·저지방 아침",
      },
      lunch: {
        title: "닭가슴살 + 나물 2종",
        items: [
          { foodId: "chicken-breast", servings: 1.2 },
          { foodId: "spinach-side", servings: 1 },
          { foodId: "bean-sprout-side", servings: 1 },
        ],
        note: "밥·면 없이 포만감",
      },
      dinner: {
        title: "연어 + 고구마 소량",
        items: [
          { foodId: "salmon", servings: 0.9 },
          { foodId: "sweet-potato", servings: 0.6 },
        ],
        note: "복합탄수 소량 + 단백질",
      },
      snack: {
        title: "사과",
        items: [{ foodId: "apple", servings: 0.5 }],
        note: "과일 1회분",
      },
    },
  ],
  "loss-fast-training": [
    LOSS_FAST_TRAINING,
    {
      breakfast: {
        title: "계란 흰자 + 그릭요거트",
        items: [
          { foodId: "egg-white", servings: 3 },
          { foodId: "greek-yogurt", servings: 0.7 },
        ],
        note: "강한 감량 · 아침 단백 위주",
      },
      lunch: {
        title: "닭가슴살 샐러드",
        items: [
          { foodId: "salad-chicken", servings: 1.2 },
          { foodId: "kimchi", servings: 1 },
        ],
        note: "정제탄수 없이 단백·채소",
      },
      dinner: {
        title: "참치 + 브로콜리 + 계란",
        items: [
          { foodId: "tuna-can", servings: 1 },
          { foodId: "broccoli", servings: 1.5 },
          { foodId: "egg", servings: 1 },
        ],
        note: "저녁 탄수 최소",
      },
      snack: {
        title: "프로틴바(소)",
        items: [{ foodId: "protein-bar", servings: 0.4 }],
        note: "간식 100~200kcal",
      },
    },
    {
      breakfast: {
        title: "계란 2개 + 방울토마토",
        items: [
          { foodId: "egg", servings: 2 },
          { foodId: "cherry-tomato", servings: 10 },
        ],
        note: "간단 고단백 아침",
      },
      lunch: {
        title: "두부 + 채소 + 현미 소량",
        items: [
          { foodId: "tofu", servings: 1.2 },
          { foodId: "spinach-side", servings: 1 },
          { foodId: "rice-brown", servings: 0.5 },
        ],
        note: "현미는 반공기 이하",
      },
      dinner: {
        title: "닭가슴살 + 콩나물",
        items: [
          { foodId: "chicken-breast", servings: 1.5 },
          { foodId: "bean-sprout-side", servings: 1.5 },
        ],
        note: "탄수 없이 단백질 중심",
      },
      snack: {
        title: "딸기",
        items: [{ foodId: "strawberry", servings: 5 }],
        note: "과일 1회분",
      },
    },
  ],
  "loss-fast-rest": [
    LOSS_FAST_REST,
    {
      breakfast: {
        title: "계란 + 방울토마토",
        items: [
          { foodId: "egg", servings: 2 },
          { foodId: "cherry-tomato", servings: 8 },
        ],
        note: "휴식일 · 최소 탄수",
      },
      lunch: {
        title: "참치 + 두부 + 김치",
        items: [
          { foodId: "tuna-can", servings: 1 },
          { foodId: "tofu", servings: 0.7 },
          { foodId: "kimchi", servings: 1 },
        ],
        note: "밥·면·김밥 피하기",
      },
      dinner: {
        title: "닭가슴살 + 브로콜리",
        items: [
          { foodId: "chicken-breast", servings: 1.2 },
          { foodId: "broccoli", servings: 1.5 },
        ],
        note: "단백·채소 위주 저녁",
      },
      snack: {
        title: "그릭요거트(소)",
        items: [{ foodId: "greek-yogurt", servings: 0.5 }],
        note: "100kcal 내외 간식",
      },
    },
    {
      breakfast: {
        title: "계란 흰자 3개",
        items: [{ foodId: "egg-white", servings: 3 }],
        note: "저탄수·고단백",
      },
      lunch: {
        title: "닭가슴살 + 나물",
        items: [
          { foodId: "chicken-breast", servings: 1.2 },
          { foodId: "spinach-side", servings: 1 },
        ],
        note: "가벼운 점심",
      },
      dinner: {
        title: "연어 + 시금치",
        items: [
          { foodId: "salmon", servings: 0.8 },
          { foodId: "spinach-side", servings: 1 },
        ],
        note: "지방·단백 균형",
      },
      snack: {
        title: "사과(소)",
        items: [{ foodId: "apple", servings: 0.4 }],
        note: "과일 1회분 이내",
      },
    },
  ],
  "maintain-training": [
    MAINTAIN_TRAINING,
    {
      breakfast: {
        title: "오트밀 + 계란 + 우유",
        items: [
          { foodId: "oatmeal-cooked", servings: 1.2 },
          { foodId: "egg", servings: 1 },
          { foodId: "milk", servings: 1 },
        ],
        note: "운동일 · 든든한 아침",
      },
      lunch: {
        title: "잡곡밥 + 닭가슴살 + 미역국",
        items: [
          { foodId: "rice-mixed", servings: 1.2 },
          { foodId: "chicken-breast", servings: 1.5 },
          { foodId: "miyeok-guk", servings: 0.7 },
        ],
        note: "훈련 에너지 충분히",
      },
      dinner: {
        title: "연어 + 고구마 + 나물",
        items: [
          { foodId: "salmon", servings: 1 },
          { foodId: "sweet-potato", servings: 1 },
          { foodId: "spinach-side", servings: 1 },
        ],
        note: "회복과 유지 균형",
      },
      snack: {
        title: "바나나",
        items: [{ foodId: "banana", servings: 1 }],
        note: "운동 전후 탄수",
      },
    },
    {
      breakfast: {
        title: "현미밥(소) + 계란 + 김치",
        items: [
          { foodId: "rice-brown", servings: 0.7 },
          { foodId: "egg", servings: 2 },
          { foodId: "kimchi", servings: 1 },
        ],
        note: "한식 아침 · 적정 에너지",
      },
      lunch: {
        title: "닭다리 + 현미 + 콩나물",
        items: [
          { foodId: "chicken-thigh", servings: 1 },
          { foodId: "rice-brown", servings: 1.2 },
          { foodId: "bean-sprout-side", servings: 1 },
        ],
        note: "현실적인 한 끼",
      },
      dinner: {
        title: "두부 + 잡곡밥 + 채소",
        items: [
          { foodId: "tofu", servings: 1 },
          { foodId: "rice-mixed", servings: 1 },
          { foodId: "broccoli", servings: 1 },
        ],
        note: "가볍지만 충분한 저녁",
      },
      snack: {
        title: "그릭요거트 + 아몬드",
        items: [
          { foodId: "greek-yogurt", servings: 1 },
          { foodId: "almond", servings: 0.5 },
        ],
        note: "단백·지방 보충",
      },
    },
  ],
  "maintain-rest": [
    MAINTAIN_REST,
    {
      breakfast: {
        title: "오트밀 + 바나나",
        items: [
          { foodId: "oatmeal-cooked", servings: 1 },
          { foodId: "banana", servings: 0.7 },
        ],
        note: "휴식일 · 적당한 아침",
      },
      lunch: {
        title: "연어 + 현미 + 나물",
        items: [
          { foodId: "salmon", servings: 1 },
          { foodId: "rice-brown", servings: 1 },
          { foodId: "spinach-side", servings: 1 },
        ],
        note: "균형 잡힌 점심",
      },
      dinner: {
        title: "닭가슴살 + 고구마 + 브로콜리",
        items: [
          { foodId: "chicken-breast", servings: 1.2 },
          { foodId: "sweet-potato", servings: 0.8 },
          { foodId: "broccoli", servings: 1 },
        ],
        note: "내일 훈련 대비",
      },
      snack: {
        title: "사과",
        items: [{ foodId: "apple", servings: 0.7 }],
        note: "가벼운 간식",
      },
    },
    {
      breakfast: {
        title: "계란 + 현미 + 미역국",
        items: [
          { foodId: "egg", servings: 2 },
          { foodId: "rice-brown", servings: 0.8 },
          { foodId: "miyeok-guk", servings: 0.5 },
        ],
        note: "한식 스타일 아침",
      },
      lunch: {
        title: "참치 + 현미 + 김치",
        items: [
          { foodId: "tuna-can", servings: 1 },
          { foodId: "rice-brown", servings: 1 },
          { foodId: "kimchi", servings: 1 },
        ],
        note: "간편 유지 식단",
      },
      dinner: {
        title: "두부 + 채소",
        items: [
          { foodId: "tofu", servings: 1.2 },
          { foodId: "bean-sprout-side", servings: 1 },
          { foodId: "spinach-side", servings: 1 },
        ],
        note: "가벼운 저녁",
      },
      snack: {
        title: "우유",
        items: [{ foodId: "milk", servings: 1 }],
        note: "칼슘·단백 보충",
      },
    },
  ],
  "gain-training": [
    GAIN_TRAINING,
    {
      breakfast: {
        title: "오트밀 + 계란 2 + 바나나 + 우유",
        items: [
          { foodId: "oatmeal-dry", servings: 0.5 },
          { foodId: "egg", servings: 2 },
          { foodId: "banana", servings: 1 },
          { foodId: "milk", servings: 1 },
        ],
        note: "증량 · 고칼로리 아침",
      },
      lunch: {
        title: "잡곡밥 + 닭다리 + 미역국",
        items: [
          { foodId: "rice-mixed", servings: 1.5 },
          { foodId: "chicken-thigh", servings: 1.5 },
          { foodId: "miyeok-guk", servings: 1 },
        ],
        note: "탄수·단백 충분히",
      },
      dinner: {
        title: "연어 + 현미 + 고구마",
        items: [
          { foodId: "salmon", servings: 1.2 },
          { foodId: "rice-brown", servings: 1.2 },
          { foodId: "sweet-potato", servings: 0.7 },
        ],
        note: "회복·증량 동시에",
      },
      snack: {
        title: "프로틴바 + 바나나",
        items: [
          { foodId: "protein-bar", servings: 0.8 },
          { foodId: "banana", servings: 0.7 },
        ],
        note: "훈련 후 보충",
      },
    },
    {
      breakfast: {
        title: "현미밥 + 계란 + 아보카도",
        items: [
          { foodId: "rice-brown", servings: 1.2 },
          { foodId: "egg", servings: 2 },
          { foodId: "avocado", servings: 0.5 },
        ],
        note: "지방·탄수·단백 골고루",
      },
      lunch: {
        title: "닭가슴살 + 현미 1.5 + 나물",
        items: [
          { foodId: "chicken-breast", servings: 1.5 },
          { foodId: "rice-brown", servings: 1.5 },
          { foodId: "spinach-side", servings: 1 },
        ],
        note: "고단백·고탄수 점심",
      },
      dinner: {
        title: "닭다리 + 잡곡밥",
        items: [
          { foodId: "chicken-thigh", servings: 1.5 },
          { foodId: "rice-mixed", servings: 1.3 },
          { foodId: "kimchi", servings: 1 },
        ],
        note: "칼로리 여유 있게",
      },
      snack: {
        title: "그릭요거트 + 견과",
        items: [
          { foodId: "greek-yogurt", servings: 1.2 },
          { foodId: "almond", servings: 1 },
        ],
        note: "칼로리·단백 보충",
      },
    },
  ],
  "gain-rest": [
    GAIN_REST,
    {
      breakfast: {
        title: "오트밀 + 계란 + 우유",
        items: [
          { foodId: "oatmeal-cooked", servings: 1.5 },
          { foodId: "egg", servings: 2 },
          { foodId: "milk", servings: 1 },
        ],
        note: "휴식일도 충분히",
      },
      lunch: {
        title: "현미 + 닭다리 + 미역국",
        items: [
          { foodId: "rice-brown", servings: 1.5 },
          { foodId: "chicken-thigh", servings: 1.2 },
          { foodId: "miyeok-guk", servings: 0.8 },
        ],
        note: "꾸준한 칼로리",
      },
      dinner: {
        title: "연어 + 잡곡밥 + 나물",
        items: [
          { foodId: "salmon", servings: 1.2 },
          { foodId: "rice-mixed", servings: 1.2 },
          { foodId: "bean-sprout-side", servings: 1 },
        ],
        note: "단백·탄수 균형",
      },
      snack: {
        title: "프로틴바 + 우유",
        items: [
          { foodId: "protein-bar", servings: 0.7 },
          { foodId: "milk", servings: 1 },
        ],
        note: "간식도 칼로리 보충",
      },
    },
    {
      breakfast: {
        title: "바나나 + 그릭요거트 + 견과",
        items: [
          { foodId: "banana", servings: 1 },
          { foodId: "greek-yogurt", servings: 1 },
          { foodId: "almond", servings: 0.8 },
        ],
        note: "간편 고칼로리 아침",
      },
      lunch: {
        title: "참치마요덮밥 + 계란",
        items: [
          { foodId: "tuna-rice", servings: 1.2 },
          { foodId: "egg", servings: 1 },
        ],
        note: "현실적인 증량 점심",
      },
      dinner: {
        title: "닭가슴살 + 현미 + 고구마",
        items: [
          { foodId: "chicken-breast", servings: 1.5 },
          { foodId: "rice-brown", servings: 1.3 },
          { foodId: "sweet-potato", servings: 0.7 },
        ],
        note: "탄수·단백 충분히",
      },
      snack: {
        title: "단백질 쉐이크 + 바나나",
        items: [
          { foodId: "protein-shake", servings: 1 },
          { foodId: "banana", servings: 0.5 },
        ],
        note: "운동 없는 날 보충",
      },
    },
  ],
  performance: [
    PERFORMANCE,
    {
      breakfast: {
        title: "오트밀 + 바나나 + 우유",
        items: [
          { foodId: "oatmeal-cooked", servings: 1.2 },
          { foodId: "banana", servings: 1 },
          { foodId: "milk", servings: 1 },
        ],
        note: "훈련 전 탄수 충전",
      },
      lunch: {
        title: "잡곡밥 + 닭가슴살 + 미역국",
        items: [
          { foodId: "rice-mixed", servings: 1.2 },
          { foodId: "chicken-breast", servings: 1.5 },
          { foodId: "miyeok-guk", servings: 0.7 },
        ],
        note: "에너지·회복 균형",
      },
      dinner: {
        title: "연어 + 현미 + 브로콜리",
        items: [
          { foodId: "salmon", servings: 1 },
          { foodId: "rice-brown", servings: 1 },
          { foodId: "broccoli", servings: 1 },
        ],
        note: "컨디션 유지 저녁",
      },
      snack: {
        title: "바나나",
        items: [{ foodId: "banana", servings: 0.8 }],
        note: "운동 전후 탄수",
      },
    },
    {
      breakfast: {
        title: "현미(소) + 계란 + 사과",
        items: [
          { foodId: "rice-brown", servings: 0.8 },
          { foodId: "egg", servings: 2 },
          { foodId: "apple", servings: 0.5 },
        ],
        note: "경기력 · 안정적 에너지",
      },
      lunch: {
        title: "고구마 + 닭가슴살 + 채소",
        items: [
          { foodId: "sweet-potato", servings: 1.2 },
          { foodId: "chicken-breast", servings: 1.5 },
          { foodId: "spinach-side", servings: 1 },
        ],
        note: "복합탄수 + 고단백",
      },
      dinner: {
        title: "두부 + 잡곡밥 + 나물",
        items: [
          { foodId: "tofu", servings: 1 },
          { foodId: "rice-mixed", servings: 1 },
          { foodId: "bean-sprout-side", servings: 1 },
        ],
        note: "회복 식단",
      },
      snack: {
        title: "그릭요거트",
        items: [{ foodId: "greek-yogurt", servings: 1 }],
        note: "단백질 간식",
      },
    },
  ],
}

function roundNutrition(n: LoggedNutrition): LoggedNutrition {
  return {
    calories: Math.round(n.calories),
    carbsG: Math.round(n.carbsG * 10) / 10,
    proteinG: Math.round(n.proteinG * 10) / 10,
    fatG: Math.round(n.fatG * 10) / 10,
    sodiumMg: Math.round(n.sodiumMg),
    sugarG: Math.round((n.sugarG ?? 0) * 10) / 10,
    fiberG: Math.round((n.fiberG ?? 0) * 10) / 10,
  }
}

function emptyNutrition(): LoggedNutrition {
  return {
    calories: 0,
    carbsG: 0,
    proteinG: 0,
    fatG: 0,
    sodiumMg: 0,
    sugarG: 0,
    fiberG: 0,
  }
}

function sumSpecsNutrition(specs: MenuItemSpec[]): LoggedNutrition {
  const bucket = emptyNutrition()
  for (const spec of specs) {
    const food = getFoodById(spec.foodId)
    if (!food) continue
    const unitGrams = getPieceWeightG(food) ?? 100
    const grams = gramsForServingCount(food, spec.servings, unitGrams)
    const n = nutritionAtGrams(food, grams)
    bucket.calories += n.calories
    bucket.carbsG += n.carbsG
    bucket.proteinG += n.proteinG
    bucket.fatG += n.fatG
    bucket.sodiumMg += n.sodiumMg
    bucket.sugarG = (bucket.sugarG ?? 0) + (n.sugarG ?? 0)
    bucket.fiberG = (bucket.fiberG ?? 0) + (n.fiberG ?? 0)
  }
  return roundNutrition(bucket)
}

function sumDailyNutrition(meals: RecommendedMealSlot[]): LoggedNutrition {
  const bucket = emptyNutrition()
  for (const meal of meals) {
    bucket.calories += meal.nutrition.calories
    bucket.carbsG += meal.nutrition.carbsG
    bucket.proteinG += meal.nutrition.proteinG
    bucket.fatG += meal.nutrition.fatG
    bucket.sodiumMg += meal.nutrition.sodiumMg
    bucket.sugarG = (bucket.sugarG ?? 0) + (meal.nutrition.sugarG ?? 0)
    bucket.fiberG = (bucket.fiberG ?? 0) + (meal.nutrition.fiberG ?? 0)
  }
  return roundNutrition(bucket)
}

const EMPTY_SLOT_TARGETS: MealSlotMacroTargets = {
  calories: 0,
  carbsG: 0,
  proteinG: 0,
  fatG: 0,
  waterMl: 0,
  sodiumMg: 0,
  sugarG: 0,
  fiberG: 0,
}

/** 끼니·하루 합계 목표 대비 허용 상한 (초과 시 축소) */
const MEAL_MACRO_MAX_RATIO = 1.03
const DAILY_MACRO_MAX_RATIO = 1.02
const PROTEIN_OVERSHOOT_MAX = 1.06
const MEAL_CALORIE_AIM_RATIO = 0.96
const MIN_MEAL_CALORIE_RATIO = 0.82

function roundServing(value: number, min = 0.25, max = 3): number {
  return Math.max(min, Math.min(max, Math.round(value * 4) / 4))
}

function overshootScaleFactor(
  actual: number,
  target: number,
  maxRatio: number
): number | null {
  if (target <= 0 || actual <= target * maxRatio) return null
  return (target * maxRatio) / actual
}

function collectDownscaleRatios(
  nutrition: LoggedNutrition,
  slotTarget: MealSlotMacroTargets,
  options?: { proteinMax?: number; sodiumMax?: number }
): number[] {
  const proteinMax = options?.proteinMax ?? PROTEIN_OVERSHOOT_MAX
  const sodiumMax = options?.sodiumMax ?? MEAL_MACRO_MAX_RATIO
  const ratios: number[] = []

  const push = (actual: number, target: number, maxRatio: number) => {
    const factor = overshootScaleFactor(actual, target, maxRatio)
    if (factor != null) ratios.push(factor)
  }

  push(nutrition.calories, slotTarget.calories, MEAL_MACRO_MAX_RATIO)
  push(nutrition.carbsG, slotTarget.carbsG, MEAL_MACRO_MAX_RATIO)
  push(nutrition.fatG, slotTarget.fatG, MEAL_MACRO_MAX_RATIO)
  push(nutrition.proteinG, slotTarget.proteinG, proteinMax)
  push(nutrition.sugarG ?? 0, slotTarget.sugarG, MEAL_MACRO_MAX_RATIO)
  push(nutrition.sodiumMg, slotTarget.sodiumMg, sodiumMax)

  return ratios
}

/** 목표 초과 매크로가 있으면 전체 1인분을 비율로 축소 */
function clampSpecsToSlotTarget(
  items: MenuItemSpec[],
  slotTarget: MealSlotMacroTargets
): MenuItemSpec[] {
  let scaled = items
  for (let pass = 0; pass < 8; pass++) {
    const nutrition = sumSpecsNutrition(scaled)
    const ratios = collectDownscaleRatios(nutrition, slotTarget)
    if (ratios.length === 0) break
    scaled = scaleItemServings(scaled, Math.min(...ratios))
  }
  return scaled.filter((spec) => spec.servings >= 0.25)
}

function boostLeanProteinWithinCap(
  items: MenuItemSpec[],
  slotTarget: MealSlotMacroTargets
): MenuItemSpec[] {
  if (slotTarget.proteinG <= 0) return items

  let scaled = items
  const calorieCap = slotTarget.calories * MEAL_MACRO_MAX_RATIO
  const proteinFloor = slotTarget.proteinG * 0.86

  for (let step = 0; step < 6; step++) {
    const nutrition = sumSpecsNutrition(scaled)
    if (nutrition.proteinG >= proteinFloor) break
    if (nutrition.calories >= calorieCap * 0.99) break

    const candidate = scaleItemServings(scaled, 1.06, isLeanProtein)
    const candidateNutrition = sumSpecsNutrition(candidate)
    if (candidateNutrition.calories > calorieCap) break
    scaled = candidate
  }

  return scaled
}

function sumMealSpecsNutrition(
  specsBySlot: Record<FoodMealSlotId, MenuItemSpec[]>
): LoggedNutrition {
  const bucket = emptyNutrition()
  for (const slot of FOOD_MEAL_SLOT_IDS) {
    const n = sumSpecsNutrition(specsBySlot[slot] ?? [])
    bucket.calories += n.calories
    bucket.carbsG += n.carbsG
    bucket.proteinG += n.proteinG
    bucket.fatG += n.fatG
    bucket.sodiumMg += n.sodiumMg
    bucket.sugarG = (bucket.sugarG ?? 0) + (n.sugarG ?? 0)
    bucket.fiberG = (bucket.fiberG ?? 0) + (n.fiberG ?? 0)
  }
  return roundNutrition(bucket)
}

function collectDailyDownscaleRatios(
  nutrition: LoggedNutrition,
  targets: MacroTargets
): number[] {
  const ratios: number[] = []
  const push = (actual: number, target: number, maxRatio: number) => {
    const factor = overshootScaleFactor(actual, target, maxRatio)
    if (factor != null) ratios.push(factor)
  }

  push(nutrition.calories, targets.calories, DAILY_MACRO_MAX_RATIO)
  push(nutrition.carbsG, targets.carbsG, DAILY_MACRO_MAX_RATIO)
  push(nutrition.fatG, targets.fatG, DAILY_MACRO_MAX_RATIO)
  push(nutrition.proteinG, targets.proteinG, PROTEIN_OVERSHOOT_MAX)
  push(nutrition.sugarG ?? 0, targets.sugarG, DAILY_MACRO_MAX_RATIO)
  push(nutrition.sodiumMg, targets.sodiumMg, DAILY_MACRO_MAX_RATIO)

  return ratios
}

function slotHasPartialItemEdits(
  slotId: FoodMealSlotId,
  itemRefreshCounts: Record<string, number> | undefined,
  itemSlotOverrides: Record<string, MenuItemSlotOverride> | undefined
): boolean {
  const hasRefresh = Object.keys(itemRefreshCounts ?? {}).some((key) =>
    key.startsWith(`${slotId}:`)
  )
  const hasBaseOverride = Object.keys(itemSlotOverrides ?? {}).some(
    (key) => key.startsWith(`${slotId}:`) && !key.startsWith(`${slotId}:+`)
  )
  return hasRefresh || hasBaseOverride
}

function slotShouldSkipMacroRescale(
  slotId: FoodMealSlotId,
  savedSlotSpecs: Partial<Record<FoodMealSlotId, SavedSlotMenuSpec>> | undefined,
  itemRefreshCounts: Record<string, number> | undefined,
  itemSlotOverrides: Record<string, MenuItemSlotOverride> | undefined
): boolean {
  return (
    isLockedSavedSlot(savedSlotSpecs, slotId) ||
    slotHasPartialItemEdits(slotId, itemRefreshCounts, itemSlotOverrides)
  )
}

/** 하루 합계가 목표를 넘으면 전 끼니 1인분을 함께 조정 */
function isLockedSavedSlot(
  savedSlotSpecs: Partial<Record<FoodMealSlotId, SavedSlotMenuSpec>> | undefined,
  slotId: FoodMealSlotId
): boolean {
  const saved = savedSlotSpecs?.[slotId]
  return Boolean(saved?.items?.length && saved.lockServings !== false)
}

function isExplicitlyEmptyLockedSlot(
  savedSlotSpecs: Partial<Record<FoodMealSlotId, SavedSlotMenuSpec>> | undefined,
  slotId: FoodMealSlotId
): boolean {
  const saved = savedSlotSpecs?.[slotId]
  return Boolean(saved && saved.lockServings !== false && saved.items.length === 0)
}

function hasAnyPartialItemEdits(
  itemRefreshCounts: Record<string, number> | undefined,
  itemSlotOverrides: Record<string, MenuItemSlotOverride> | undefined
): boolean {
  return FOOD_MEAL_SLOT_IDS.some((slotId) =>
    slotHasPartialItemEdits(slotId, itemRefreshCounts, itemSlotOverrides)
  )
}

function rebalanceDailySpecsToTargets(
  specsBySlot: Record<FoodMealSlotId, MenuItemSpec[]>,
  slotTargets: Record<FoodMealSlotId, MealSlotMacroTargets>,
  dailyTargets: MacroTargets,
  savedSlotSpecs?: Partial<Record<FoodMealSlotId, SavedSlotMenuSpec>>,
  itemRefreshCounts?: Record<string, number>,
  itemSlotOverrides?: Record<string, MenuItemSlotOverride>
): Record<FoodMealSlotId, MenuItemSpec[]> {
  if (hasAnyPartialItemEdits(itemRefreshCounts, itemSlotOverrides)) {
    return { ...specsBySlot }
  }

  let scaled = { ...specsBySlot }

  for (let pass = 0; pass < 10; pass++) {
    const daily = sumMealSpecsNutrition(scaled)
    const ratios = collectDailyDownscaleRatios(daily, dailyTargets)
    if (ratios.length === 0) break

    const mult = Math.min(...ratios)
    for (const slot of FOOD_MEAL_SLOT_IDS) {
      if (
        slotShouldSkipMacroRescale(
          slot,
          savedSlotSpecs,
          itemRefreshCounts,
          itemSlotOverrides
        )
      ) {
        continue
      }
      if (scaled[slot]?.length) {
        scaled[slot] = scaleItemServings(scaled[slot], mult)
      }
    }
  }

  for (const slot of FOOD_MEAL_SLOT_IDS) {
    if (
      slotShouldSkipMacroRescale(
        slot,
        savedSlotSpecs,
        itemRefreshCounts,
        itemSlotOverrides
      )
    ) {
      continue
    }
    const target = slotTargets[slot]
    if (target && scaled[slot]?.length) {
      scaled[slot] = clampSpecsToSlotTarget(scaled[slot], target)
    }
  }

  return scaled
}

function isPrimaryProtein(food: FoodDatabaseItem): boolean {
  return food.per100g.proteinG >= 10 || food.category === "단백" || food.category === "단백질"
}

function isLeanProtein(food: FoodDatabaseItem): boolean {
  return isPrimaryProtein(food) && food.per100g.fatG <= 3
}

function isHighFatSource(food: FoodDatabaseItem): boolean {
  const { fatG, calories } = food.per100g
  if (fatG <= 3) return false
  return (fatG * 9) / Math.max(calories, 1) >= 0.35
}

function isCarbSource(food: FoodDatabaseItem): boolean {
  return (
    food.per100g.carbsG >= 10 ||
    getRefinedCarbLevel(food) !== "low" ||
    food.category === "곡물" ||
    food.category === "탄수"
  )
}

function scaleItemServings(
  items: MenuItemSpec[],
  multiplier: number,
  filter?: (food: FoodDatabaseItem) => boolean
): MenuItemSpec[] {
  return items.map((spec) => {
    const food = getFoodById(spec.foodId)
    if (!food || (filter && !filter(food))) return spec
    return { ...spec, servings: roundServing(spec.servings * multiplier) }
  })
}

/** 템플릿 섭취량을 끼니 목표·감량 모드(스포츠 영양 원칙)에 맞게 조정 */
function scaleMenuItemsToTargets(
  items: MenuItemSpec[],
  slotTarget: MealSlotMacroTargets,
  options: {
    coachingMode: DietCoachingMode | null
    slotId: FoodMealSlotId
    trainingHigh: boolean
    snackCalorieMax: number | null
    rotationSeed?: number
  }
): MenuItemSpec[] {
  if (slotTarget.calories <= 0) {
    return items.map((spec) => ({ ...spec, servings: roundServing(spec.servings) }))
  }

  let scaled = items.map((spec) => ({
    ...spec,
    servings: roundServing(spec.servings),
  }))

  let nutrition = sumSpecsNutrition(scaled)
  if (nutrition.calories <= 0) return scaled

  const aimCalories = slotTarget.calories * MEAL_CALORIE_AIM_RATIO
  scaled = scaleItemServings(scaled, aimCalories / nutrition.calories)
  nutrition = sumSpecsNutrition(scaled)

  if (options.coachingMode === "fast_loss") {
    if (!options.trainingHigh) {
      scaled = scaleItemServings(scaled, 0.55, (f) => getRefinedCarbLevel(f) === "high")
      scaled = scaleItemServings(scaled, 0.72, (f) => getRefinedCarbLevel(f) === "medium")
    } else if (options.slotId === "dinner") {
      scaled = scaleItemServings(scaled, 0.85, isCarbSource)
    }

    if (options.slotId === "snack") {
      const snackCap = options.snackCalorieMax ?? slotTarget.calories
      nutrition = sumSpecsNutrition(scaled)
      if (nutrition.calories > snackCap) {
        scaled = scaleItemServings(scaled, snackCap / nutrition.calories)
      }
    }
  } else if (options.coachingMode === "normal_loss") {
    scaled = scaleItemServings(scaled, 0.65, (f) => getRefinedCarbLevel(f) === "high")
    if (!options.trainingHigh && options.slotId !== "breakfast") {
      scaled = scaleItemServings(scaled, 0.88, isCarbSource)
    }
  }

  scaled = boostLeanProteinWithinCap(scaled, slotTarget)

  nutrition = sumSpecsNutrition(scaled)
  if (slotTarget.fatG > 0 && nutrition.fatG > slotTarget.fatG * MEAL_MACRO_MAX_RATIO) {
    scaled = scaleItemServings(
      scaled,
      (slotTarget.fatG * MEAL_MACRO_MAX_RATIO) / nutrition.fatG,
      isHighFatSource
    )
    scaled = boostLeanProteinWithinCap(scaled, slotTarget)
  }

  scaled = clampSpecsToSlotTarget(scaled, slotTarget)

  nutrition = sumSpecsNutrition(scaled)
  if (
    nutrition.calories < slotTarget.calories * MIN_MEAL_CALORIE_RATIO &&
    options.slotId !== "snack"
  ) {
    const boostMult = Math.min(
      1.12,
      (slotTarget.calories * 0.98) / Math.max(nutrition.calories, 1)
    )
    const boosted = scaleItemServings(scaled, boostMult)
    scaled = clampSpecsToSlotTarget(boosted, slotTarget)
  }

  if (options.rotationSeed && options.rotationSeed > 0) {
    const bump = 1 + ((options.rotationSeed % 4) - 1.5) * 0.05
    scaled = scaleItemServings(
      scaled,
      Math.max(0.88, Math.min(1.12, bump))
    )
    scaled = clampSpecsToSlotTarget(scaled, slotTarget)
  }

  return scaled.filter((spec) => spec.servings >= 0.25)
}

function buildSportsNutritionNote(
  baseNote: string,
  coachingMode: DietCoachingMode | null,
  slotId: FoodMealSlotId,
  trainingHigh: boolean,
  slotTarget: MealSlotMacroTargets,
  nutrition: LoggedNutrition
): string {
  if (!coachingMode) return baseNote

  const proteinPct =
    slotTarget.proteinG > 0
      ? Math.round((nutrition.proteinG / slotTarget.proteinG) * 100)
      : 0

  if (coachingMode === "fast_loss") {
    const dayLabel = trainingHigh ? "운동일" : "휴식일"
    if (slotId === "snack") {
      return `${dayLabel} · 간식 ${nutrition.calories}kcal 이내 · ${baseNote}`
    }
    if (slotId === "dinner" || (!trainingHigh && slotId === "lunch")) {
      return `${dayLabel} · 단백 ${proteinPct}% · 탄수·정제당 엄격 · ${baseNote}`
    }
    return `${dayLabel} · 단백 ${proteinPct}% 목표 · ${baseNote}`
  }

  const dayLabel = trainingHigh ? "운동일" : "휴식일"
  if (trainingHigh && (slotId === "breakfast" || slotId === "lunch")) {
    return `${dayLabel} · 복합탄수+단백 ${proteinPct}% · ${baseNote}`
  }
  return `${dayLabel} · 단백 ${proteinPct}% · ${baseNote}`
}

function getSportsNutritionSubtitle(
  scenario: MenuScenario,
  coachingMode: DietCoachingMode | null,
  targets: MacroTargets
): string {
  const base = getSubtitle(scenario)
  if (!coachingMode) return base

  const proteinHint = `단백질 ${Math.round(targets.proteinG)}g/일`
  const carbHint = `탄수 ${Math.round(targets.carbsG)}g/일`

  if (coachingMode === "fast_loss") {
    return `${base} · 스포츠 영양: ${proteinHint}, ${carbHint}, 간식·당류 엄격`
  }
  return `${base} · 스포츠 영양: ${proteinHint}, ${carbHint}, 복합탄수·채소 중심`
}

function buildMenuItem(spec: MenuItemSpec): RecommendedMenuItem | null {
  const food = getFoodById(spec.foodId)
  if (!food) return null

  const unitGrams = getPieceWeightG(food) ?? 100
  const grams = gramsForServingCount(food, spec.servings, unitGrams)
  const nutrition = nutritionAtGrams(food, grams)

  return {
    foodId: food.id,
    name: food.name,
    displayAmount: formatPortionAmount(food, spec.servings, unitGrams),
    servings: spec.servings,
    grams,
    calories: nutrition.calories,
    nutrition: {
      calories: nutrition.calories,
      carbsG: nutrition.carbsG,
      proteinG: nutrition.proteinG,
      fatG: nutrition.fatG,
      sodiumMg: nutrition.sodiumMg,
      sugarG: nutrition.sugarG,
      fiberG: nutrition.fiberG,
    },
  }
}

function getHeadline(scenario: MenuScenario, goalType: GoalType): string {
  switch (scenario) {
    case "loss-fast-training":
    case "loss-fast-rest":
      return "강한 감량 추천 메뉴"
    case "loss-normal-training":
    case "loss-normal-rest":
      return "감량 추천 메뉴"
    case "gain-training":
    case "gain-rest":
      return "증량 추천 메뉴"
    case "performance":
      return "경기력 맞춤 추천 메뉴"
    default:
      return getGoalLabel(goalType) === "유지"
        ? "유지 추천 메뉴"
        : `${getGoalLabel(goalType)} 추천 메뉴`
  }
}

function getSubtitle(scenario: MenuScenario): string {
  switch (scenario) {
    case "loss-fast-training":
      return "운동일 · 단백·채소 중심, 탄수·간식 엄격"
    case "loss-fast-rest":
      return "휴식일 · 탄수 최소, 단백질·채소 위주"
    case "loss-normal-training":
      return "운동일 · 현미·고구마 등 복합탄수 + 고단백"
    case "loss-normal-rest":
      return "휴식일 · 칼로리는 유지, 정제탄수는 줄이기"
    case "maintain-training":
      return "운동일 · 에너지와 회복을 함께 챙기는 균형 식단"
    case "maintain-rest":
      return "휴식일 · 무리 없이 유지하는 현실적인 식단"
    case "gain-training":
      return "운동일 · 탄수·단백·지방 골고루 충분히"
    case "gain-rest":
      return "휴식일 · 증량을 위한 꾸준한 칼로리 보충"
    case "performance":
      return "훈련·회복에 맞춘 탄수·단백 균형 식단"
  }
}

function getSubtitleBrief(scenario: MenuScenario): string {
  switch (scenario) {
    case "loss-fast-training":
      return "강감량·운동"
    case "loss-fast-rest":
      return "강감량·휴식"
    case "loss-normal-training":
      return "감량·운동"
    case "loss-normal-rest":
      return "감량·휴식"
    case "maintain-training":
      return "유지·운동"
    case "maintain-rest":
      return "유지·휴식"
    case "gain-training":
      return "증량·운동"
    case "gain-rest":
      return "증량·휴식"
    case "performance":
      return "경기력"
  }
}

function shortenCoachingNote(note: string): string {
  const tags: string[] = []
  if (/고단백|단백/.test(note)) tags.push("단백")
  if (/채소|나물|샐러드/.test(note)) tags.push("채소")
  if (/복합탄수|현미|고구마|오트/.test(note)) tags.push("복합탄수")
  if (/탄수.*(줄|최소|없|낮)|저탄수|정제탄수|밥·면|밥 없/.test(note)) {
    tags.push("탄수↓")
  }
  if (/간식|가벼|저칼로리|100~200|100kcal|내외/.test(note)) tags.push("가벼움")
  if (/과일|당류/.test(note)) tags.push("과일")
  if (/회복/.test(note)) tags.push("회복")
  if (/에너지|충전|드든/.test(note)) tags.push("에너지")
  if (/증량|고칼로리|칼로리/.test(note)) tags.push("칼로리↑")
  if (/균형/.test(note) && tags.length < 2) tags.push("균형")

  const unique = [...new Set(tags)]
  if (unique.length > 0) return unique.slice(0, 2).join("·")

  const stripped =
    note
      .replace(/^(운동일|휴식일|강한\s?감량|증량|경기력)[^·]*·\s*/u, "")
      .split(/[,，]/)[0]
      ?.trim() ?? note

  if (stripped.length <= 8) return stripped
  return `${stripped.slice(0, 7)}…`
}

export function getMenuItemAlternatives(
  scenario: MenuScenario,
  slotId: FoodMealSlotId,
  itemIndex: number
): MenuItemSpec[] {
  const variants = MENU_VARIANTS[scenario]
  const seen = new Set<string>()
  const result: MenuItemSpec[] = []

  for (const variant of variants) {
    const spec = variant[slotId]?.items[itemIndex]
    if (!spec || seen.has(spec.foodId)) continue
    seen.add(spec.foodId)
    result.push({ ...spec })
  }

  return result
}

export function getMenuItemAlternativeCount(
  profile: UserProfile,
  schedule: WeeklyScheduleDay | null,
  coachingMode: DietCoachingMode | null,
  slotId: FoodMealSlotId,
  itemIndex: number,
  currentItems?: MenuItemSpec[]
): number {
  const trainingCategory = getTrainingNutritionCategory(schedule)
  const trainingHigh = trainingCategory === "high"
  const scenario = resolveMenuScenario(profile, trainingHigh, coachingMode)
  const alts = getMenuItemAlternatives(scenario, slotId, itemIndex)
  if (!currentItems?.length) return alts.length

  const currentFoodId = currentItems[itemIndex]?.foodId
  const usedFoodIds = new Set(
    currentItems
      .filter((_, idx) => idx !== itemIndex)
      .map((item) => item.foodId)
  )

  return alts.filter(
    (alt) => !usedFoodIds.has(alt.foodId) || alt.foodId === currentFoodId
  ).length
}

function getSlotFoodAlternatives(
  scenario: MenuScenario,
  slotId: FoodMealSlotId,
  currentFoodId: string,
  currentServings = 1
): MenuItemSpec[] {
  const variants = MENU_VARIANTS[scenario]
  const seen = new Set<string>()
  const result: MenuItemSpec[] = []

  for (const variant of variants) {
    for (const spec of variant[slotId]?.items ?? []) {
      if (seen.has(spec.foodId)) continue
      seen.add(spec.foodId)
      result.push({ ...spec })
    }
  }

  if (!seen.has(currentFoodId)) {
    result.push({ foodId: currentFoodId, servings: currentServings })
  }

  return result
}

export function getAddedMenuItemAlternativeCount(
  profile: UserProfile,
  schedule: WeeklyScheduleDay | null,
  coachingMode: DietCoachingMode | null,
  slotId: FoodMealSlotId,
  currentFoodId: string,
  currentItems?: MenuItemSpec[]
): number {
  const trainingCategory = getTrainingNutritionCategory(schedule)
  const trainingHigh = trainingCategory === "high"
  const scenario = resolveMenuScenario(profile, trainingHigh, coachingMode)
  const alts = getSlotFoodAlternatives(scenario, slotId, currentFoodId)
  if (!currentItems?.length) return alts.length

  const usedFoodIds = new Set(
    currentItems
      .filter((item) => item.foodId !== currentFoodId)
      .map((item) => item.foodId)
  )

  return alts.filter(
    (alt) => !usedFoodIds.has(alt.foodId) || alt.foodId === currentFoodId
  ).length
}

function applyAddOverrideRefresh(
  scenario: MenuScenario,
  slotId: FoodMealSlotId,
  entry: { key: string; spec: MenuItemSpec },
  otherSpecs: MenuItemSpec[],
  refreshCount: number
): MenuItemSpec {
  if (refreshCount <= 0) return entry.spec

  const alts = getSlotFoodAlternatives(
    scenario,
    slotId,
    entry.spec.foodId,
    entry.spec.servings
  )
  if (alts.length <= 1) return entry.spec

  const usedFoodIds = new Set(otherSpecs.map((item) => item.foodId))
  return pickUniqueRefreshAlternative(alts, entry.spec, refreshCount, usedFoodIds)
}

export function getRefreshedAddedMenuItemSpec(
  profile: UserProfile,
  schedule: WeeklyScheduleDay | null,
  coachingMode: DietCoachingMode | null,
  slotId: FoodMealSlotId,
  currentSpec: MenuItemSpec,
  otherItems: MenuItemSpec[],
  refreshCount: number
): MenuItemSpec {
  const trainingCategory = getTrainingNutritionCategory(schedule)
  const trainingHigh = trainingCategory === "high"
  const scenario = resolveMenuScenario(profile, trainingHigh, coachingMode)
  return applyAddOverrideRefresh(
    scenario,
    slotId,
    { key: "", spec: currentSpec },
    otherItems,
    refreshCount
  )
}

export function getMealSlotRefreshOptionCount(
  profile: UserProfile,
  schedule: WeeklyScheduleDay | null,
  coachingMode: DietCoachingMode | null
): number {
  const trainingCategory = getTrainingNutritionCategory(schedule)
  const trainingHigh = trainingCategory === "high"
  const scenario = resolveMenuScenario(profile, trainingHigh, coachingMode)
  return MENU_VARIANTS[scenario]?.length ?? 1
}

function resolveSlotTemplateMeal(
  variants: DayMenuTemplate[],
  templateIndex: number,
  slotId: FoodMealSlotId,
  fallback: MealTemplate,
  slotRefreshCount = 0
): MealTemplate {
  if (variants.length === 0) return fallback
  const index = (templateIndex + slotRefreshCount) % variants.length
  return variants[index]?.[slotId] ?? fallback
}

function mergeDuplicateMenuItemSpecs(items: MenuItemSpec[]): MenuItemSpec[] {
  const merged = new Map<string, MenuItemSpec>()
  for (const spec of items) {
    const existing = merged.get(spec.foodId)
    if (existing) {
      merged.set(spec.foodId, {
        foodId: spec.foodId,
        servings: existing.servings + spec.servings,
      })
    } else {
      merged.set(spec.foodId, { ...spec })
    }
  }
  return Array.from(merged.values())
}

function pickUniqueRefreshAlternative(
  alts: MenuItemSpec[],
  current: MenuItemSpec,
  refreshCount: number,
  usedFoodIds: Set<string>
): MenuItemSpec {
  if (alts.length <= 1 || refreshCount <= 0) return current

  const startIdx = alts.findIndex((alt) => alt.foodId === current.foodId)
  const baseIdx = startIdx >= 0 ? startIdx : 0

  for (let step = 0; step < alts.length; step++) {
    const candidate = alts[(baseIdx + refreshCount + step) % alts.length]
    if (!usedFoodIds.has(candidate.foodId)) {
      return { ...candidate }
    }
  }

  return { ...current }
}

function applyItemRefreshToSpecs(
  scenario: MenuScenario,
  slotId: FoodMealSlotId,
  items: MenuItemSpec[],
  itemRefreshCounts: Record<string, number> | undefined
): MenuItemSpec[] {
  if (!itemRefreshCounts) return items

  return items.map((spec, itemIndex) => {
    const refreshCount = itemRefreshCounts[`${slotId}:${itemIndex}`] ?? 0
    if (refreshCount <= 0) return spec

    const alts = getMenuItemAlternatives(scenario, slotId, itemIndex)
    if (alts.length <= 1) return spec

    const usedFoodIds = new Set(
      items
        .filter((_, idx) => idx !== itemIndex)
        .map((item) => item.foodId)
    )

    return pickUniqueRefreshAlternative(alts, spec, refreshCount, usedFoodIds)
  })
}

function applyItemSlotOverrides(
  items: MenuItemSpec[],
  slotId: FoodMealSlotId,
  itemSlotOverrides: Record<string, MenuItemSlotOverride> | undefined
): MenuItemSpec[] {
  if (!itemSlotOverrides) return items

  return items.flatMap((spec, itemIndex) => {
    const override = itemSlotOverrides[`${slotId}:${itemIndex}`]
    if (!override) return [spec]
    if (override.action === "delete") return []
    if (override.lockServings) return [spec]
    return [override.spec]
  })
}

function applyLockedItemSlotOverrides(
  specsBySlot: Record<FoodMealSlotId, MenuItemSpec[]>,
  itemSlotOverrides: Record<string, MenuItemSlotOverride> | undefined
): Record<FoodMealSlotId, MenuItemSpec[]> {
  if (!itemSlotOverrides) return specsBySlot

  const result = { ...specsBySlot }
  for (const slotId of FOOD_MEAL_SLOT_IDS) {
    const items = [...(result[slotId] ?? [])]
    let changed = false

    for (const [key, override] of Object.entries(itemSlotOverrides)) {
      if (override.action !== "replace" || !override.lockServings) continue
      const [slotKey, idxStr] = key.split(":")
      if (slotKey !== slotId) continue
      const itemIndex = Number(idxStr)
      if (itemIndex < 0 || itemIndex >= items.length) continue
      items[itemIndex] = { ...override.spec }
      changed = true
    }

    if (changed) result[slotId] = items
  }

  return result
}

function getSlotAddOverrides(
  slotId: FoodMealSlotId,
  itemSlotOverrides: Record<string, MenuItemSlotOverride> | undefined
): Array<{ key: string; spec: MenuItemSpec }> {
  if (!itemSlotOverrides) return []

  return Object.entries(itemSlotOverrides)
    .filter(
      ([key, override]) =>
        key.startsWith(`${slotId}:+`) && override.action === "add"
    )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, override]) =>
      override.action === "add" ? { key, spec: { ...override.spec } } : null
    )
    .filter((entry): entry is { key: string; spec: MenuItemSpec } => entry !== null)
}

function slotHasItemCustomizations(
  slotId: FoodMealSlotId,
  itemRefreshCounts: Record<string, number> | undefined,
  itemSlotOverrides: Record<string, MenuItemSlotOverride> | undefined
): boolean {
  return (
    Object.keys(itemRefreshCounts ?? {}).some((key) =>
      key.startsWith(`${slotId}:`)
    ) ||
    Object.keys(itemSlotOverrides ?? {}).some((key) =>
      key.startsWith(`${slotId}:`)
    )
  )
}

function applySavedSlotSpecs(
  specsBySlot: Record<FoodMealSlotId, MenuItemSpec[]>,
  savedSlotSpecs: Partial<Record<FoodMealSlotId, SavedSlotMenuSpec>> | undefined,
  itemRefreshCounts?: Record<string, number>,
  itemSlotOverrides?: Record<string, MenuItemSlotOverride>
): Record<FoodMealSlotId, MenuItemSpec[]> {
  if (!savedSlotSpecs) return specsBySlot

  const result = { ...specsBySlot }
  for (const slotId of FOOD_MEAL_SLOT_IDS) {
    const saved = savedSlotSpecs[slotId]
    if (!saved?.items?.length || saved.lockServings === false) continue
    if (slotHasItemCustomizations(slotId, itemRefreshCounts, itemSlotOverrides)) {
      continue
    }

    const scaled = result[slotId] ?? []
    result[slotId] = saved.items.map((savedItem, index) => {
      const scaledItem = scaled[index]
      if (scaledItem?.foodId === savedItem.foodId) {
        return { foodId: savedItem.foodId, servings: savedItem.servings }
      }
      return { ...savedItem }
    })
  }

  return result
}

function formatMealTitleFromItems(items: RecommendedMenuItem[]): string {
  if (items.length === 0) return ""
  return items
    .map((item) => item.name.replace(/\s*\([^)]*\)\s*$/, "").trim())
    .join(" + ")
}

export function buildDailyMealMenuPlan(
  targets: MacroTargets,
  profile: UserProfile,
  schedule: WeeklyScheduleDay | null,
  options: BuildMealMenuOptions = {}
): DailyMealMenuPlan {
  const trainingCategory = getTrainingNutritionCategory(schedule)
  const trainingHigh = trainingCategory === "high"
  const coachingMode =
    options.coachingModeOverride ??
    targets.breakdown.coachingMode ??
    resolveCoachingMode(profile.dietMode)
  const scenario = resolveMenuScenario(profile, trainingHigh, coachingMode)
  const variants = MENU_VARIANTS[scenario]
  const rawVariantIndex = Math.max(0, options.variantIndex ?? 0)
  const templateIndex =
    variants.length > 0 ? rawVariantIndex % variants.length : 0
  const rotationSeed =
    variants.length > 0 ? Math.floor(rawVariantIndex / variants.length) : 0
  const template = variants[templateIndex] ?? variants[0]
  const slotTargets = targets.perMealBySlot ?? {}
  const snackCalorieMax = targets.breakdown.snackCalorieMax ?? null

  const scaledSpecsBySlot = {} as Record<FoodMealSlotId, MenuItemSpec[]>
  for (const slotId of FOOD_MEAL_SLOT_IDS) {
    const meal = template[slotId]
    if (!meal) continue
    const slotTarget = slotTargets[slotId] ?? EMPTY_SLOT_TARGETS
    const savedSlot = options.savedSlotSpecs?.[slotId]
    const partialEdits = slotHasPartialItemEdits(
      slotId,
      options.itemRefreshCounts,
      options.itemSlotOverrides
    )
    const frozenItems = options.slotFrozenSpecs?.[slotId]
    const slotRefreshCount = options.slotRefreshCounts?.[slotId] ?? 0
    const slotMeal = resolveSlotTemplateMeal(
      variants,
      templateIndex,
      slotId,
      meal,
      slotRefreshCount
    )
    let baseItems: MenuItemSpec[]

    if (isExplicitlyEmptyLockedSlot(options.savedSlotSpecs, slotId)) {
      scaledSpecsBySlot[slotId] = []
      continue
    }

    if (partialEdits && frozenItems?.length) {
      baseItems = frozenItems.map((item) => ({ ...item }))
      baseItems = applyItemRefreshToSpecs(
        scenario,
        slotId,
        baseItems,
        options.itemRefreshCounts
      )
      baseItems = applyItemSlotOverrides(
        baseItems,
        slotId,
        options.itemSlotOverrides
      )
      scaledSpecsBySlot[slotId] = baseItems.map((item) => ({ ...item }))
      continue
    }

    if (isLockedSavedSlot(options.savedSlotSpecs, slotId)) {
      baseItems = savedSlot!.items.map((item) => ({ ...item }))
      baseItems = applyItemRefreshToSpecs(
        scenario,
        slotId,
        baseItems,
        options.itemRefreshCounts
      )
      baseItems = applyItemSlotOverrides(
        baseItems,
        slotId,
        options.itemSlotOverrides
      )
      scaledSpecsBySlot[slotId] = baseItems.map((item) => ({ ...item }))
      continue
    }

    if (savedSlot?.items?.length) {
      baseItems = savedSlot.items.map((item) => ({ ...item }))
      baseItems = applyItemRefreshToSpecs(
        scenario,
        slotId,
        baseItems,
        options.itemRefreshCounts
      )
      baseItems = applyItemSlotOverrides(
        baseItems,
        slotId,
        options.itemSlotOverrides
      )
    } else {
      baseItems = applyItemRefreshToSpecs(
        scenario,
        slotId,
        slotMeal.items,
        options.itemRefreshCounts
      )
      baseItems = applyItemSlotOverrides(
        baseItems,
        slotId,
        options.itemSlotOverrides
      )
    }

    scaledSpecsBySlot[slotId] = scaleMenuItemsToTargets(baseItems, slotTarget, {
      coachingMode,
      slotId,
      trainingHigh,
      snackCalorieMax,
      rotationSeed,
    })
  }

  const balancedSpecs = rebalanceDailySpecsToTargets(
    scaledSpecsBySlot,
    slotTargets,
    targets,
    options.savedSlotSpecs,
    options.itemRefreshCounts,
    options.itemSlotOverrides
  )
  const finalSpecs = applySavedSlotSpecs(
    applyLockedItemSlotOverrides(balancedSpecs, options.itemSlotOverrides),
    options.savedSlotSpecs,
    options.itemRefreshCounts,
    options.itemSlotOverrides
  )

  const meals = FOOD_MEAL_SLOT_IDS.map((slotId) => {
    const meal = template[slotId]
    const slotRefreshCount = options.slotRefreshCounts?.[slotId] ?? 0
    const slotMeal = resolveSlotTemplateMeal(
      variants,
      templateIndex,
      slotId,
      meal,
      slotRefreshCount
    )
    const slotTarget = slotTargets[slotId] ?? EMPTY_SLOT_TARGETS
    const baseSpecs = mergeDuplicateMenuItemSpecs(finalSpecs[slotId] ?? [])
    const addEntries = getSlotAddOverrides(slotId, options.itemSlotOverrides)
    const allSpecs = mergeDuplicateMenuItemSpecs([
      ...baseSpecs,
      ...addEntries.map((entry) => entry.spec),
    ])
    const addKeyByFoodId = new Map(
      addEntries.map((entry) => [entry.spec.foodId, entry.key] as const)
    )
    const items = allSpecs
      .map((spec) => {
        const item = buildMenuItem(spec)
        if (!item) return null
        const addKey = addKeyByFoodId.get(spec.foodId)
        return addKey ? { ...item, addOverrideKey: addKey } : item
      })
      .filter((item): item is RecommendedMenuItem => item !== null)
    const nutrition = sumSpecsNutrition(allSpecs)
    const explicitlyEmpty = isExplicitlyEmptyLockedSlot(
      options.savedSlotSpecs,
      slotId
    )
    const hasSlotCustomization =
      explicitlyEmpty ||
      Boolean(options.savedSlotSpecs?.[slotId]?.items?.length) ||
      Object.keys(options.itemRefreshCounts ?? {}).some((key) =>
        key.startsWith(`${slotId}:`)
      ) ||
      Object.keys(options.itemSlotOverrides ?? {}).some((key) =>
        key.startsWith(`${slotId}:`)
      )

    const savedTitle = options.savedSlotSpecs?.[slotId]?.title

    return {
      slotId,
      label: SLOT_LABELS[slotId],
      title: explicitlyEmpty
        ? savedTitle || "메뉴 없음"
        : hasSlotCustomization
          ? savedTitle || formatMealTitleFromItems(items) || slotMeal.title
          : slotMeal.title,
      items,
      targetCalories: slotTarget.calories,
      estimatedCalories: nutrition.calories,
      coachingNote: buildSportsNutritionNote(
        slotMeal.note,
        coachingMode,
        slotId,
        trainingHigh,
        slotTarget,
        nutrition
      ),
      coachingNoteBrief: shortenCoachingNote(slotMeal.note),
      nutrition,
      slotTargets: slotTarget,
    }
  })

  const dailyNutrition = sumDailyNutrition(meals)
  const totalEstimatedCalories = dailyNutrition.calories

  const trainingHint = schedule
    ? trainingHigh
      ? `오늘 ${schedule.type} · 훈련량 반영`
      : schedule.status === "rest"
        ? "오늘 휴식 · 가벼운 구성"
        : `오늘 ${schedule.type}`
    : null

  const goalLabel = coachingMode
    ? `${getGoalLabel(profile.goalType)} · ${getCoachingModeLabel(coachingMode)}`
    : `${getGoalLabel(profile.goalType)} · ${getDietModeLabel(profile.dietMode)}`

  return {
    headline: getHeadline(scenario, profile.goalType),
    subtitle: getSportsNutritionSubtitle(scenario, coachingMode, targets),
    subtitleBrief: getSubtitleBrief(scenario),
    goalLabel,
    trainingHint,
    meals,
    totalEstimatedCalories,
    targetCalories: targets.calories,
    dailyNutrition,
    variantIndex: rawVariantIndex,
    variantCount: variants.length,
  }
}
