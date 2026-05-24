export interface WeekRange {
  start: Date
  end: Date
  weekKey: string
  label: string
}

function stripTime(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function getCurrentWeekRange(now = new Date()): WeekRange {
  const today = stripTime(now)
  const weekday = today.getDay()
  const diff = weekday === 0 ? -6 : 1 - weekday
  const start = new Date(today)
  start.setDate(today.getDate() + diff)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  const weekKey = toDateKey(start)
  const label = `${start.getMonth() + 1}/${start.getDate()} – ${end.getMonth() + 1}/${end.getDate()}`

  return { start, end, weekKey, label }
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function formatDistanceKm(km: number): string {
  if (!Number.isFinite(km) || km <= 0) return "0"
  if (km >= 100) return km.toFixed(1)
  if (km >= 10) return km.toFixed(1)
  return km.toFixed(1).replace(/\.0$/, "")
}
