import { getMonthlyAttendanceRate } from "@/lib/attendance"
import { loadTodayCheckin } from "@/lib/daily-checkin"
import {
  calculateDailyMacroTargets,
  formatCalories,
  formatMacroSummary,
  formatPerMealSummary,
  getActiveWeightKg,
  getExpectedWeightChangeLabel,
  getExpectedWeightChangeRange,
  getGoalLabel,
  getGoalModeLabel,
  getDietModeLabel,
  getWeeklyWeightGoalKg,
  DEFAULT_USER_PROFILE,
  loadUserProfile,
  saveUserProfile,
  NUTRITION_BASIS_LABEL,
  type MacroTargets,
  type UserProfile,
} from "@/lib/user-profile"
import { getTodayScheduleDay, type WeeklyScheduleDay } from "@/lib/weekly-schedule"
import {
  getWeightChangeKg,
  saveWeightEntry,
  seedWeightLogFromProfile,
  WEIGHT_TRACKER_EVENT,
} from "@/lib/weight-tracker"

export type MealSlotId =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack"
  | "preWorkout"
  | "postWorkout"

export interface NutritionProfile {
  currentWeightKg: number
  targetWeightKg: number
  targetWeeks: number
  weeklyWeightGoalKg: number
  goalLabel: string
  goalModeLabel: string
  dietModeLabel: string
  expectedWeightChangeRange: string | null
  expectedWeightChangeLabel: string
  weightChangeKg: number
}

export interface MealSlot {
  id: MealSlotId
  label: string
}

export interface TodayMealLog {
  date: string
  recordedSlots: MealSlotId[]
  updatedAt: string
}

export interface CoachNutritionComment {
  message: string
  tips: string[]
}

export interface WeeklyNutritionReport {
  weightChangeKg: number
  attendanceRate: number
  trainingVolumeKm: number
  mealLogRate: number
}

export const MEAL_SLOTS: MealSlot[] = [
  { id: "breakfast", label: "아침" },
  { id: "lunch", label: "점심" },
  { id: "dinner", label: "저녁" },
  { id: "snack", label: "간식" },
  { id: "preWorkout", label: "운동 전" },
  { id: "postWorkout", label: "운동 후" },
]

export const NUTRITION_EVENT = "nutrition-updated"

const STORAGE_KEY = "one-step-coach-nutrition-meals"

function getTodayDateKey(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function readAllMealLogs(): Record<string, TodayMealLog> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, TodayMealLog>
  } catch {
    return {}
  }
}

function writeAllMealLogs(logs: Record<string, TodayMealLog>): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
  window.dispatchEvent(new CustomEvent(NUTRITION_EVENT))
}

function buildNutritionProfile(
  user: UserProfile,
  useStoredWeight: boolean
): NutritionProfile {
  const activeWeight = useStoredWeight
    ? getActiveWeightKg(user)
    : user.currentWeightKg
  return {
    currentWeightKg: activeWeight,
    targetWeightKg: user.targetWeightKg,
    targetWeeks: user.targetWeeks,
    weeklyWeightGoalKg: getWeeklyWeightGoalKg({
      ...user,
      currentWeightKg: activeWeight,
    }),
    goalLabel: getGoalLabel(user.goalType),
    goalModeLabel: getGoalModeLabel(user),
    dietModeLabel: getDietModeLabel(user.dietMode),
    expectedWeightChangeRange: getExpectedWeightChangeRange(user.dietMode),
    expectedWeightChangeLabel: getExpectedWeightChangeLabel(user.dietMode),
    weightChangeKg: useStoredWeight
      ? getWeightChangeKg(7, user.currentWeightKg)
      : 0,
  }
}

/** Server / pre-hydration snapshot — matches DEFAULT_USER_PROFILE, no localStorage. */
export function getDefaultNutritionProfile(): NutritionProfile {
  return buildNutritionProfile(DEFAULT_USER_PROFILE, false)
}

export function getNutritionProfile(): NutritionProfile {
  return buildNutritionProfile(loadUserProfile(), true)
}

export function saveCurrentWeight(weightKg: number): number {
  const rounded = Math.round(weightKg * 10) / 10
  saveWeightEntry(rounded)
  const user = loadUserProfile()
  saveUserProfile({ ...user, currentWeightKg: rounded })
  return rounded
}

export function ensureWeightLogSeeded(): void {
  seedWeightLogFromProfile(loadUserProfile().currentWeightKg)
}

/** Server / pre-hydration snapshot — matches DEFAULT_USER_PROFILE, no localStorage. */
export function getDefaultDailyMacroTargets(
  day: WeeklyScheduleDay | null = getTodayScheduleDay()
): MacroTargets {
  return calculateDailyMacroTargets({ ...DEFAULT_USER_PROFILE }, day)
}

export function getDailyMacroTargets(
  day: WeeklyScheduleDay | null = getTodayScheduleDay()
): MacroTargets {
  const user = loadUserProfile()
  return calculateDailyMacroTargets(
    { ...user, currentWeightKg: getActiveWeightKg(user) },
    day
  )
}

export function createEmptyTodayMealLog(now = new Date()): TodayMealLog {
  return {
    date: getTodayDateKey(now),
    recordedSlots: [],
    updatedAt: "",
  }
}

export function loadTodayMealLog(now = new Date()): TodayMealLog {
  const date = getTodayDateKey(now)
  const stored = readAllMealLogs()[date]
  return (
    stored ?? {
      date,
      recordedSlots: [],
      updatedAt: new Date().toISOString(),
    }
  )
}

export function toggleMealSlot(slotId: MealSlotId, now = new Date()): TodayMealLog {
  const date = getTodayDateKey(now)
  const logs = readAllMealLogs()
  const current = logs[date] ?? {
    date,
    recordedSlots: [],
    updatedAt: new Date().toISOString(),
  }

  const recorded = new Set(current.recordedSlots)
  if (recorded.has(slotId)) recorded.delete(slotId)
  else recorded.add(slotId)

  const next: TodayMealLog = {
    date,
    recordedSlots: [...recorded],
    updatedAt: new Date().toISOString(),
  }
  logs[date] = next
  writeAllMealLogs(logs)
  return next
}

export function getMealLogRateForWeek(now = new Date()): number {
  const logs = readAllMealLogs()
  let daysWithLogs = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const key = getTodayDateKey(d)
    const log = logs[key]
    if (log && log.recordedSlots.length > 0) daysWithLogs++
  }
  return Math.round((daysWithLogs / 7) * 100)
}

export function getRecentConditionLabel(): string {
  const checkin = loadTodayCheckin()
  if (!checkin?.condition) return "미입력"
  const labels: Record<number, string> = {
    5: "최상",
    4: "좋음",
    3: "보통",
    2: "피곤",
    1: "나쁨",
  }
  return labels[checkin.condition] ?? "보통"
}

export function getCoachNutritionComment(
  day: WeeklyScheduleDay | null = getTodayScheduleDay(),
  mealLog: TodayMealLog = loadTodayMealLog()
): CoachNutritionComment {
  const user = loadUserProfile()
  const tips: string[] = []
  let message = "오늘 훈련 강도에 맞춰 식단을 조절하세요."

  if (user.coachMemo.trim()) {
    tips.push(user.coachMemo.trim())
  }

  if (!day || day.type === "휴식") {
    message = "휴식일에는 탄수화물을 줄이고 단백질·채소 위주로 드세요."
    tips.push("가벼운 식사로 회복에 집중")
  } else if (day.type === "인터벌") {
    message = "오늘 인터벌 훈련 — 탄수화물을 충분히 섭취하세요."
    tips.push("훈련 전: 탄수화물 중심 간식")
    tips.push("훈련 후: 단백질 + 탄수화물 보충")
  } else if (day.type === "장거리") {
    message = "장거리 훈련일 — 에너지 보충과 회복 영양이 중요합니다."
    tips.push("훈련 후 30분 이내 단백질 + 탄수화물")
  }

  if (user.hasLateNightSnack) {
    tips.push("야식 습관은 회복과 체중 목표에 방해가 될 수 있어요")
  }
  if (user.lactoseIntolerant) {
    tips.push("유당불내증 — 우유 대신 두유·락토프리 선택")
  }
  if (user.avoidedFoods.trim()) {
    tips.push(`피해야 할 음식: ${user.avoidedFoods.trim()}`)
  }
  if (mealLog.recordedSlots.length === 0) {
    tips.push("오늘 식단 기록을 시작해 보세요")
  }

  return { message, tips: tips.slice(0, 4) }
}

export function getWeeklyNutritionReport(now = new Date()): WeeklyNutritionReport {
  const user = loadUserProfile()
  return {
    weightChangeKg: getWeightChangeKg(7, user.currentWeightKg),
    attendanceRate: getMonthlyAttendanceRate(),
    trainingVolumeKm: user.weeklyRunningKm,
    mealLogRate: getMealLogRateForWeek(now),
  }
}

export { formatCalories, formatMacroSummary, formatPerMealSummary, NUTRITION_BASIS_LABEL, WEIGHT_TRACKER_EVENT }
export { getMealFoodAlternatives, formatMealFoodAlternativesText } from "@/lib/food-alternatives"
export {
  applyMealMenuSelection,
  mergeTargetsWithSelection,
  MEAL_MENU_EVENT,
} from "@/lib/meal-menu-selection"
export type { AdjustedMealPlan } from "@/lib/meal-menu-selection"
