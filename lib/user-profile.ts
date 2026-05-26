import { getTodayScheduleDay, type WeeklyScheduleDay } from "@/lib/weekly-schedule"
import {
  buildMealSlotTargets,
  type FoodMealSlotId,
  type MealSlotMacroTargets,
} from "@/lib/meal-slot-targets"
import { getLatestWeightKg } from "@/lib/weight-tracker"
import {
  calculateCoachingMacroPlan,
  PROFILE_INCOMPLETE_MESSAGE,
  resolveCoachingMode,
  type DietCoachingMode,
} from "@/lib/diet-coaching"

export type Gender = "male" | "female"
export type GoalType =
  | "loss"
  | "maintain"
  | "gain"
  | "performance"
  | "competition"
export type MainEvent = "short" | "middle" | "long" | "trail"
export type TrainingIntensity = "low" | "moderate" | "high"
export type SnackFrequency = "rare" | "sometimes" | "often"
export type DietMode =
  | "performance_loss"
  | "normal_loss"
  | "fast_loss"
  | "maintain"
  | "gain"

export type TrainingNutritionCategory = "high" | "easy" | "rest"

export interface UserProfile {
  name: string
  gender: Gender
  age: number
  heightCm: number
  currentWeightKg: number
  targetWeightKg: number
  targetWeeks: number
  weeklyExerciseDays: number
  dailyExerciseMinutes: number
  weeklyRunningKm: number
  mainEvent: MainEvent
  trainingIntensity: TrainingIntensity
  goalType: GoalType
  dietMode: DietMode
  mealsPerDay: number
  hasBreakfast: boolean
  hasLateNightSnack: boolean
  snackFrequency: SnackFrequency
  lactoseIntolerant: boolean
  avoidedFoods: string
  preferredFoods: string
  coachMemo: string
  updatedAt: string
}

export interface NutritionCalculationBreakdown {
  maintenanceCalories: number
  dietAdjustment: number
  trainingAdjustment: number
  finalCalories: number
  goalModeLabel: string
  dietModeLabel: string
  expectedWeightChangeRange: string | null
  trainingDayLabel: string
  trainingCategory: TrainingNutritionCategory
  proteinPerKg: number
  fatPerKg: number
  macroBasisNote: string
  activeWeightKg: number
  profileWeightKg: number
  coachingMode: DietCoachingMode | null
  profileComplete: boolean
  profileIncompleteMessage: string | null
  snackCalorieMax: number | null
}

export interface MealMacroTargets {
  calories: number
  carbsG: number
  proteinG: number
  fatG: number
  waterMl: number
  sodiumMg: number
}

export interface MacroTargets {
  calories: number
  carbsG: number
  proteinG: number
  fatG: number
  sugarG: number
  fiberG: number
  waterL: number
  sodiumMg: number
  bmr: number
  tdee: number
  mealsPerDay: number
  /** 균등 1끼 (레거시·대체 UI) */
  perMeal: MealMacroTargets
  /** 아침 25% · 점심 35% · 저녁 30% · 간식 10% */
  perMealBySlot: Record<FoodMealSlotId, MealSlotMacroTargets>
  breakdown: NutritionCalculationBreakdown
}

export const NUTRITION_BASIS_LABEL =
  "Mifflin-St Jeor · ACSM · IOC 기준"

export const USER_PROFILE_EVENT = "user-profile-updated"

const STORAGE_KEY = "one-step-coach-user-profile"

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: "김민준",
  gender: "male",
  age: 24,
  heightCm: 175,
  currentWeightKg: 68,
  targetWeightKg: 65,
  targetWeeks: 8,
  weeklyExerciseDays: 5,
  dailyExerciseMinutes: 90,
  weeklyRunningKm: 42,
  mainEvent: "middle",
  trainingIntensity: "high",
  goalType: "loss",
  dietMode: "normal_loss",
  mealsPerDay: 3,
  hasBreakfast: true,
  hasLateNightSnack: false,
  snackFrequency: "sometimes",
  lactoseIntolerant: false,
  avoidedFoods: "",
  preferredFoods: "닭가슴살, 현미, 바나나",
  coachMemo: "",
  updatedAt: "",
}

export const GOAL_OPTIONS: { value: GoalType; label: string }[] = [
  { value: "loss", label: "감량" },
  { value: "maintain", label: "유지" },
  { value: "gain", label: "증량" },
  { value: "performance", label: "경기력 향상" },
  { value: "competition", label: "대회 전 컨디션 조절" },
]

export const MAIN_EVENT_OPTIONS: { value: MainEvent; label: string }[] = [
  { value: "short", label: "단거리" },
  { value: "middle", label: "중거리" },
  { value: "long", label: "장거리" },
  { value: "trail", label: "트레일" },
]

export const INTENSITY_OPTIONS: { value: TrainingIntensity; label: string }[] = [
  { value: "low", label: "낮음" },
  { value: "moderate", label: "보통" },
  { value: "high", label: "높음" },
]

export const SNACK_FREQUENCY_OPTIONS: {
  value: SnackFrequency
  label: string
}[] = [
  { value: "rare", label: "거의 없음" },
  { value: "sometimes", label: "가끔" },
  { value: "often", label: "자주" },
]

export const DIET_MODE_OPTIONS: { value: DietMode; label: string }[] = [
  { value: "performance_loss", label: "퍼포먼스 유지 감량" },
  { value: "normal_loss", label: "일반 감량" },
  { value: "fast_loss", label: "강한 감량" },
  { value: "maintain", label: "유지" },
  { value: "gain", label: "증량" },
]

const DIET_MODE_ADJUSTMENTS: Record<DietMode, number> = {
  performance_loss: -200,
  normal_loss: -400,
  fast_loss: -600,
  maintain: 0,
  gain: 250,
}

const DIET_MODE_LABELS: Record<DietMode, string> = {
  performance_loss: "퍼포먼스 유지 감량 모드",
  normal_loss: "일반 감량 모드",
  fast_loss: "강한 감량 모드",
  maintain: "유지 모드",
  gain: "증량 모드",
}

function notifyProfileChange(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(USER_PROFILE_EVENT))
}

export function hasSavedUserProfile(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(STORAGE_KEY) !== null
}

/** 상세 설정(키·나이·체중·운동량)이 저장되어 목표 계산에 충분한지 */
export function isCoachingProfileComplete(profile: UserProfile): boolean {
  if (!hasSavedUserProfile()) return false
  if (profile.age <= 0 || profile.heightCm <= 0 || profile.currentWeightKg <= 0) {
    return false
  }
  const hasActivity =
    profile.weeklyExerciseDays > 0 ||
    profile.dailyExerciseMinutes > 0 ||
    profile.weeklyRunningKm > 0
  return hasActivity
}

export function loadUserProfile(): UserProfile {
  if (typeof window === "undefined") return { ...DEFAULT_USER_PROFILE }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_USER_PROFILE }
    const parsed = { ...DEFAULT_USER_PROFILE, ...(JSON.parse(raw) as UserProfile) }
    if (!parsed.dietMode) {
      parsed.dietMode = inferDietModeFromGoalType(parsed.goalType)
    }
    return parsed
  } catch {
    return { ...DEFAULT_USER_PROFILE }
  }
}

function inferDietModeFromGoalType(goalType: GoalType): DietMode {
  switch (goalType) {
    case "loss":
      return "normal_loss"
    case "gain":
      return "gain"
    case "performance":
    case "competition":
      return "performance_loss"
    default:
      return "maintain"
  }
}

export function saveUserProfile(profile: UserProfile): UserProfile {
  const next = { ...profile, updatedAt: new Date().toISOString() }
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    notifyProfileChange()
  }
  return next
}

export function getGoalLabel(goalType: GoalType): string {
  return GOAL_OPTIONS.find((o) => o.value === goalType)?.label ?? "유지"
}

export function getDietModeLabel(dietMode: DietMode): string {
  return DIET_MODE_LABELS[dietMode]
}

export function getDietModeAdjustment(dietMode: DietMode): number {
  return DIET_MODE_ADJUSTMENTS[dietMode]
}

export function getGoalModeLabel(profile: UserProfile): string {
  return `${getGoalLabel(profile.goalType)} · ${getDietModeLabel(profile.dietMode)}`
}

export function getExpectedWeightChangeLabel(dietMode: DietMode): string {
  if (dietMode === "gain") return "예상 증량 속도"
  if (dietMode === "maintain") return "예상 변화"
  return "예상 감량 속도"
}

export function getExpectedWeightChangeRange(
  dietMode: DietMode
): string | null {
  switch (dietMode) {
    case "performance_loss":
      return "주 0.15~0.25kg"
    case "normal_loss":
      return "주 0.3~0.5kg"
    case "fast_loss":
      return "주 0.5~0.7kg"
    case "maintain":
      return "체중 유지"
    case "gain":
      return "주 0.2~0.35kg 증량"
    default:
      return null
  }
}

export function getTrainingNutritionCategory(
  day: WeeklyScheduleDay | null
): TrainingNutritionCategory {
  if (!day || day.type === "휴식") return "rest"
  if (["인터벌", "템포런", "장거리"].includes(day.type)) return "high"
  if (day.type === "조깅" || day.type.includes("회복")) return "easy"
  return "easy"
}

export function getActiveWeightKg(profile: UserProfile = loadUserProfile()): number {
  if (typeof window === "undefined") return profile.currentWeightKg
  return getLatestWeightKg(profile.currentWeightKg)
}

export function withActiveWeight(profile: UserProfile): UserProfile {
  return { ...profile, currentWeightKg: getActiveWeightKg(profile) }
}

export function getProfileInitials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return "?"
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  if (/^[A-Za-z]/.test(trimmed)) {
    return trimmed.slice(0, 2).toUpperCase()
  }
  if (trimmed.length >= 3) {
    return trimmed[0] + trimmed[trimmed.length - 1]
  }
  return trimmed.slice(0, 2)
}

function isHighIntensityDay(day: WeeklyScheduleDay | null): boolean {
  return getTrainingNutritionCategory(day) === "high"
}

function calculateBmr(profile: UserProfile): number {
  const { gender, currentWeightKg, heightCm, age } = profile
  // Mifflin-St Jeor (1990)
  if (gender === "male") {
    return 10 * currentWeightKg + 6.25 * heightCm - 5 * age + 5
  }
  return 10 * currentWeightKg + 6.25 * heightCm - 5 * age - 161
}

function calculateDailyExerciseKcal(profile: UserProfile): number {
  const weight = profile.currentWeightKg
  const dailyRunKm = profile.weeklyRunningKm / 7
  // ACSM: distance running ~1.036 kcal/kg/km
  const runningKcal = dailyRunKm * weight * 1.036

  const runMinutes = dailyRunKm * 6
  const otherMinutes = Math.max(0, profile.dailyExerciseMinutes - runMinutes)
  const met =
    profile.trainingIntensity === "high"
      ? 8.0
      : profile.trainingIntensity === "moderate"
        ? 6.0
        : 4.0
  // MET: kcal/min = MET × 3.5 × weight(kg) / 200
  const otherKcal = ((met * 3.5 * weight) / 200) * otherMinutes

  return runningKcal + otherKcal
}

function calculateTdee(profile: UserProfile): number {
  return calculateBmr(profile) * 1.2 + calculateDailyExerciseKcal(profile)
}

function getTrainingDayCalorieAdjustment(
  category: TrainingNutritionCategory,
  dietMode: DietMode
): number {
  switch (category) {
    case "high":
      return dietMode === "gain" || dietMode === "maintain" ? 100 : 150
    case "easy":
      return 0
    case "rest":
      return dietMode === "gain" ? 0 : -200
  }
}

function getProteinPerKg(dietMode: DietMode): number {
  if (dietMode === "fast_loss" || dietMode === "normal_loss") return 2.0
  if (dietMode === "performance_loss") return 1.9
  return 1.8
}

function getFatPerKg(
  dietMode: DietMode,
  category: TrainingNutritionCategory
): number {
  if (category === "high") return 0.7
  if (dietMode === "gain") return 0.9
  if (dietMode === "fast_loss") return 0.7
  return 0.8
}

function clampDietCalories(
  calories: number,
  dietMode: DietMode,
  category: TrainingNutritionCategory,
  profile: UserProfile
): number {
  const absoluteMin = profile.gender === "female" ? 1200 : 1500
  let min = absoluteMin
  let max = Number.POSITIVE_INFINITY

  switch (dietMode) {
    case "performance_loss":
      min = Math.max(min, 2000)
      max = category === "rest" ? 2300 : 2400
      break
    case "normal_loss":
      min = Math.max(min, 2100)
      max = category === "rest" ? 2200 : 2300
      break
    case "fast_loss":
      min = Math.max(min, 1800)
      max = category === "rest" ? 1950 : 2100
      break
    case "maintain":
      break
    case "gain":
      min = Math.max(min, 2200)
      break
  }

  if (category === "high" && dietMode !== "maintain" && dietMode !== "gain") {
    min = Math.max(min, dietMode === "fast_loss" ? 2000 : 2200)
  }

  return Math.round(Math.min(Math.max(calories, min), max))
}

function getMinimumCalories(profile: UserProfile): number {
  return profile.gender === "female" ? 1200 : 1500
}

function calculateWaterL(profile: UserProfile): number {
  // 35 ml/kg + 운동 시 500 ml/시간 (ACSM)
  const baseMl = profile.currentWeightKg * 35
  const exerciseMl = (profile.dailyExerciseMinutes / 60) * 500
  return Math.round((baseMl + exerciseMl) / 100) / 10
}

function calculateSodiumMg(
  profile: UserProfile,
  category: TrainingNutritionCategory
): number {
  // 성인 1일 나트륨 적정량 1,500mg · 상한 2,000mg (WHO·대한영양학회)
  let sodiumMg = 2000
  const exerciseHours = profile.dailyExerciseMinutes / 60

  if (category === "high") {
    // 고강도 훈련: 발한 손실 보충 ~700mg/시간 (ACSM)
    sodiumMg += Math.round(exerciseHours * 700)
  } else if (category === "easy") {
    sodiumMg += Math.round(exerciseHours * 400)
  }

  if (profile.dietMode === "fast_loss" || profile.dietMode === "normal_loss") {
    sodiumMg = Math.round(sodiumMg * 0.92)
  }

  return Math.round(Math.min(Math.max(sodiumMg, 1500), 3500))
}

function calculateSugarTarget(calories: number): number {
  return Math.min(50, Math.round((calories * 0.1) / 4))
}

function calculateFiberTarget(calories: number): number {
  return Math.max(25, Math.round((calories / 1000) * 14))
}

function dividePerMeal(
  totals: Pick<
    MacroTargets,
    "calories" | "carbsG" | "proteinG" | "fatG" | "waterL" | "sodiumMg"
  >,
  mealsPerDay: number
): MealMacroTargets {
  const n = Math.max(1, Math.min(mealsPerDay, 6))
  return {
    calories: Math.round(totals.calories / n),
    carbsG: Math.round(totals.carbsG / n),
    proteinG: Math.round(totals.proteinG / n),
    fatG: Math.round(totals.fatG / n),
    waterMl: Math.round((totals.waterL * 1000) / n),
    sodiumMg: Math.round(totals.sodiumMg / n),
  }
}

export function calculateDailyMacroTargets(
  profile: UserProfile = loadUserProfile(),
  todaySchedule: WeeklyScheduleDay | null = getTodayScheduleDay()
): MacroTargets {
  const activeWeightKg = profile.currentWeightKg
  const calcProfile = profile

  const bmr = Math.round(calculateBmr(calcProfile))
  const maintenanceCalories = Math.round(calculateTdee(calcProfile))
  const trainingCategory = getTrainingNutritionCategory(todaySchedule)
  const coachingMode = resolveCoachingMode(calcProfile.dietMode)
  const profileComplete = isCoachingProfileComplete(calcProfile)
  const profileIncompleteMessage = profileComplete
    ? null
    : PROFILE_INCOMPLETE_MESSAGE

  let calories: number
  let proteinG: number
  let fatG: number
  let carbsG: number
  let sugarG: number
  let fiberG: number
  let sodiumMg: number
  let proteinPerKg: number
  let fatPerKg: number
  let dietAdjustment: number
  let trainingAdjustment = 0
  let snackCalorieMax: number | null = null
  let macroBasisNote: string

  if (coachingMode) {
    const plan = calculateCoachingMacroPlan(
      coachingMode,
      activeWeightKg,
      maintenanceCalories,
      trainingCategory,
      getMinimumCalories(calcProfile)
    )
    calories = plan.calories
    proteinG = plan.proteinG
    fatG = plan.fatG
    carbsG = plan.carbsG
    sugarG = plan.sugarG
    fiberG = plan.fiberG
    sodiumMg = plan.sodiumMg
    proteinPerKg = plan.proteinPerKg
    fatPerKg = Math.round((fatG / activeWeightKg) * 10) / 10
    dietAdjustment = -plan.deficitKcal
    snackCalorieMax = plan.snackCalorieMax
    macroBasisNote =
      coachingMode === "fast_loss"
        ? `강한 감량 · 유지 ${maintenanceCalories}kcal - ${plan.deficitKcal}kcal · 단백 ${proteinPerKg}g/kg · 지방 ${Math.round(plan.fatCaloriePct * 100)}% · 간식 ${snackCalorieMax}kcal 이내`
        : `일반 감량 · 유지 ${maintenanceCalories}kcal - ${plan.deficitKcal}kcal · 단백 ${proteinPerKg}g/kg · 지방 ${Math.round(plan.fatCaloriePct * 100)}% · 당류 ${sugarG}g · 식이섬유 ${fiberG}g`
  } else {
    dietAdjustment = getDietModeAdjustment(calcProfile.dietMode)
    trainingAdjustment = getTrainingDayCalorieAdjustment(
      trainingCategory,
      calcProfile.dietMode
    )

    calories = maintenanceCalories + dietAdjustment + trainingAdjustment

    if (calcProfile.dietMode !== "maintain" && calcProfile.dietMode !== "gain") {
      calories = clampDietCalories(
        calories,
        calcProfile.dietMode,
        trainingCategory,
        calcProfile
      )
    } else {
      calories = Math.round(Math.max(calories, getMinimumCalories(calcProfile)))
    }

    const weight = activeWeightKg
    proteinPerKg = getProteinPerKg(calcProfile.dietMode)
    fatPerKg = getFatPerKg(calcProfile.dietMode, trainingCategory)
    proteinG = Math.round(weight * proteinPerKg)
    fatG = Math.round(weight * fatPerKg)
    carbsG = Math.round((calories - proteinG * 4 - fatG * 9) / 4)

    const minCarbsG = Math.round(weight * 2)
    if (carbsG < minCarbsG) {
      fatG = Math.max(
        Math.round(weight * 0.7),
        Math.round((calories - proteinG * 4 - minCarbsG * 4) / 9)
      )
      carbsG = Math.round((calories - proteinG * 4 - fatG * 9) / 4)
    }

    if (trainingCategory === "rest") {
      carbsG = Math.max(minCarbsG, Math.round(carbsG * 0.85))
    }

    carbsG = Math.max(carbsG, minCarbsG)
    sugarG = calculateSugarTarget(calories)
    fiberG = calculateFiberTarget(calories)
    sodiumMg = calculateSodiumMg(calcProfile, trainingCategory)
    macroBasisNote = `체중 ${activeWeightKg}kg 기준 · 단백질 ${proteinPerKg}g/kg · 지방 ${fatPerKg}g/kg · 탄수화물 잔여 칼로리`
  }

  const waterL = Math.max(calculateWaterL(calcProfile), 2)
  const mealsPerDay = Math.max(1, Math.min(calcProfile.mealsPerDay, 6))
  const totals = {
    calories,
    carbsG,
    proteinG,
    fatG,
    sugarG,
    fiberG,
    waterL,
    sodiumMg,
  }

  const trainingDayLabel = todaySchedule?.type ?? "휴식"
  const breakdown: NutritionCalculationBreakdown = {
    maintenanceCalories,
    dietAdjustment,
    trainingAdjustment,
    finalCalories: calories,
    goalModeLabel: getGoalModeLabel(calcProfile),
    dietModeLabel: getDietModeLabel(calcProfile.dietMode),
    expectedWeightChangeRange: getExpectedWeightChangeRange(calcProfile.dietMode),
    trainingDayLabel,
    trainingCategory,
    proteinPerKg,
    fatPerKg,
    macroBasisNote,
    activeWeightKg,
    profileWeightKg: activeWeightKg,
    coachingMode,
    profileComplete,
    profileIncompleteMessage,
    snackCalorieMax,
  }

  const perMeal = dividePerMeal(totals, mealsPerDay)

  return {
    ...totals,
    bmr,
    tdee: maintenanceCalories,
    mealsPerDay,
    perMeal,
    perMealBySlot: buildMealSlotTargets(totals, coachingMode, snackCalorieMax),
    breakdown,
  }
}

export function getWeeklyWeightGoalKg(profile: UserProfile): number {
  if (profile.targetWeeks <= 0) return 0
  return (
    Math.round(
      ((profile.targetWeightKg - profile.currentWeightKg) /
        profile.targetWeeks) *
        10
    ) / 10
  )
}

export function formatCalories(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString("ko-KR")
}

export function formatMacroSummary(targets: MacroTargets): string {
  return `탄수화물 ${targets.carbsG}g / 단백질 ${targets.proteinG}g / 지방 ${targets.fatG}g / 나트륨 ${formatCalories(targets.sodiumMg)}mg`
}

export function formatPerMealSummary(targets: MacroTargets): string {
  const m = targets.perMeal
  return `1끼 ${formatCalories(m.calories)}kcal · 탄수 ${m.carbsG}g · 단백 ${m.proteinG}g · 지방 ${m.fatG}g · 나트륨 ${formatCalories(m.sodiumMg)}mg`
}
