export interface WeightEntry {
  date: string
  weightKg: number
  updatedAt: string
}

export const WEIGHT_TRACKER_EVENT = "weight-tracker-updated"

const STORAGE_KEY = "one-step-coach-weight-log"

function getTodayDateKey(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function readAllWeightLogs(): Record<string, WeightEntry> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, WeightEntry>
  } catch {
    return {}
  }
}

function writeAllWeightLogs(logs: Record<string, WeightEntry>): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
  window.dispatchEvent(new CustomEvent(WEIGHT_TRACKER_EVENT))
}

function notifyWeightChange(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(WEIGHT_TRACKER_EVENT))
}

export function getLatestWeightKg(fallbackWeightKg: number): number {
  const logs = readAllWeightLogs()
  const entries = Object.values(logs).sort((a, b) =>
    b.date.localeCompare(a.date)
  )
  if (entries.length === 0) return fallbackWeightKg
  return entries[0].weightKg
}

export function getTodayWeightKg(): number | null {
  const entry = readAllWeightLogs()[getTodayDateKey()]
  return entry?.weightKg ?? null
}

export function saveWeightEntry(
  weightKg: number,
  now = new Date()
): WeightEntry {
  const date = getTodayDateKey(now)
  const entry: WeightEntry = {
    date,
    weightKg: Math.round(weightKg * 10) / 10,
    updatedAt: now.toISOString(),
  }
  const logs = readAllWeightLogs()
  logs[date] = entry
  writeAllWeightLogs(logs)
  return entry
}

export function recordWeightFromProfile(weightKg: number): void {
  if (typeof window === "undefined") return
  const rounded = Math.round(weightKg * 10) / 10
  const today = getTodayDateKey()
  const logs = readAllWeightLogs()
  const existing = logs[today]
  if (existing && existing.weightKg === rounded) return
  logs[today] = {
    date: today,
    weightKg: rounded,
    updatedAt: new Date().toISOString(),
  }
  writeAllWeightLogs(logs)
}

export function getRecentWeightEntries(limit = 14): WeightEntry[] {
  return Object.values(readAllWeightLogs())
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
}

export function getWeightChangeKg(days = 7, fallbackWeightKg = 0): number {
  const entries = getRecentWeightEntries(days + 1)
  if (entries.length === 0) return 0
  const latest = entries[0].weightKg
  const baseline =
    entries.length > 1
      ? entries[Math.min(entries.length - 1, days)].weightKg
      : fallbackWeightKg
  return Math.round((latest - baseline) * 10) / 10
}

export type WeightGoalDirection = "loss" | "gain" | "maintain"

export interface WeightProgressSummary {
  startWeightKg: number
  currentWeightKg: number
  targetWeightKg: number
  totalChangeKg: number
  lostKg: number
  gainedKg: number
  remainingToGoalKg: number
  goalProgressPercent: number
  recent7DayChangeKg: number
  startBmi: number
  currentBmi: number
  targetBmi: number
  totalBmiChange: number
  recent7DayBmiChange: number
  trackingDays: number
  hasHistory: boolean
  goalDirection: WeightGoalDirection
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export function calculateBmi(weightKg: number, heightCm: number): number {
  if (!heightCm || heightCm <= 0 || !weightKg || weightKg <= 0) return 0
  const heightM = heightCm / 100
  return round1(weightKg / (heightM * heightM))
}

function getRecentBmiChange(
  heightCm: number,
  days = 7,
  fallbackWeightKg = 0
): number {
  if (!heightCm || heightCm <= 0) return 0
  const entries = getRecentWeightEntries(days + 1)
  if (entries.length === 0) return 0
  const latestBmi = calculateBmi(entries[0].weightKg, heightCm)
  const baselineWeight =
    entries.length > 1
      ? entries[Math.min(entries.length - 1, days)].weightKg
      : fallbackWeightKg
  const baselineBmi = calculateBmi(baselineWeight, heightCm)
  return round1(latestBmi - baselineBmi)
}

function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  )
}

function resolveGoalDirection(goalType: string): WeightGoalDirection {
  if (goalType === "gain") return "gain"
  if (goalType === "maintain") return "maintain"
  return "loss"
}

export function getWeightProgressSummary(
  targetWeightKg: number,
  goalType: string,
  fallbackWeightKg: number,
  heightCm = 0
): WeightProgressSummary {
  const entries = Object.values(readAllWeightLogs()).sort((a, b) =>
    a.date.localeCompare(b.date)
  )
  const hasHistory = entries.length > 0
  const startWeightKg = hasHistory ? entries[0].weightKg : fallbackWeightKg
  const currentWeightKg = hasHistory
    ? entries[entries.length - 1].weightKg
    : fallbackWeightKg
  const totalChangeKg = round1(currentWeightKg - startWeightKg)
  const lostKg = round1(Math.max(0, startWeightKg - currentWeightKg))
  const gainedKg = round1(Math.max(0, currentWeightKg - startWeightKg))
  const remainingToGoalKg = round1(currentWeightKg - targetWeightKg)
  const goalDirection = resolveGoalDirection(goalType)

  let goalProgressPercent = 0
  if (goalDirection === "loss") {
    const totalNeeded = startWeightKg - targetWeightKg
    if (totalNeeded > 0) {
      goalProgressPercent = Math.min(
        100,
        Math.max(0, round1(((startWeightKg - currentWeightKg) / totalNeeded) * 100))
      )
    } else if (currentWeightKg <= targetWeightKg) {
      goalProgressPercent = 100
    }
  } else if (goalDirection === "gain") {
    const totalNeeded = targetWeightKg - startWeightKg
    if (totalNeeded > 0) {
      goalProgressPercent = Math.min(
        100,
        Math.max(0, round1(((currentWeightKg - startWeightKg) / totalNeeded) * 100))
      )
    } else if (currentWeightKg >= targetWeightKg) {
      goalProgressPercent = 100
    }
  } else {
    const tolerance = 0.5
    const diff = Math.abs(currentWeightKg - targetWeightKg)
    goalProgressPercent =
      diff <= tolerance ? 100 : Math.max(0, round1((1 - diff / 3) * 100))
  }

  const trackingDays =
    entries.length > 1
      ? daysBetween(entries[0].date, entries[entries.length - 1].date) + 1
      : entries.length

  const startBmi = calculateBmi(startWeightKg, heightCm)
  const currentBmi = calculateBmi(currentWeightKg, heightCm)
  const targetBmi = calculateBmi(targetWeightKg, heightCm)
  const totalBmiChange = round1(currentBmi - startBmi)

  return {
    startWeightKg,
    currentWeightKg,
    targetWeightKg,
    totalChangeKg,
    lostKg,
    gainedKg,
    remainingToGoalKg,
    goalProgressPercent,
    recent7DayChangeKg: getWeightChangeKg(7, fallbackWeightKg),
    startBmi,
    currentBmi,
    targetBmi,
    totalBmiChange,
    recent7DayBmiChange: getRecentBmiChange(heightCm, 7, fallbackWeightKg),
    trackingDays,
    hasHistory,
    goalDirection,
  }
}

export function seedWeightLogFromProfile(weightKg: number): void {
  if (typeof window === "undefined") return
  const logs = readAllWeightLogs()
  if (Object.keys(logs).length > 0) return
  saveWeightEntry(weightKg)
  notifyWeightChange()
}
