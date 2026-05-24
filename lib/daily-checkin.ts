export interface DailyCheckin {
  date: string
  condition: number | null
  painAreas: string[]
  painDetail: string
  updatedAt: string
}

const STORAGE_KEY = "one-step-coach-daily-checkins"

function getTodayDateKey(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function readAllCheckins(): Record<string, DailyCheckin> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, DailyCheckin>
  } catch {
    return {}
  }
}

function writeAllCheckins(checkins: Record<string, DailyCheckin>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(checkins))
}

export function loadTodayCheckin(): DailyCheckin | null {
  const today = getTodayDateKey()
  return readAllCheckins()[today] ?? null
}

export function saveTodayCheckin(
  data: Pick<DailyCheckin, "condition" | "painAreas" | "painDetail">
): DailyCheckin {
  const today = getTodayDateKey()
  const checkin: DailyCheckin = {
    date: today,
    condition: data.condition,
    painAreas: data.painAreas,
    painDetail: data.painDetail.trim(),
    updatedAt: new Date().toISOString(),
  }
  const all = readAllCheckins()
  all[today] = checkin
  writeAllCheckins(all)
  return checkin
}
