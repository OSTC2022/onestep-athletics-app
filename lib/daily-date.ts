export const DAILY_DATE_CHANGED_EVENT = "daily-date-changed"

export function getTodayDateKey(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function msUntilNextLocalMidnight(now = new Date()): number {
  const next = new Date(now)
  next.setHours(24, 0, 0, 0)
  return Math.max(1000, next.getTime() - now.getTime())
}
