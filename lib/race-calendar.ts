import {
  getAllRaces,
  parseRaceDate,
  type RaceEvent,
} from "@/lib/race-schedule"

export interface CalendarDayCell {
  dateKey: string | null
  day: number | null
  isToday: boolean
  isCurrentMonth: boolean
}

function stripTime(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function getRaceDDay(race: RaceEvent, now = new Date()): number {
  const today = stripTime(now).getTime()
  const raceDay = stripTime(parseRaceDate(race.date)).getTime()
  return Math.round((raceDay - today) / 86_400_000)
}

export function formatDDay(days: number): string {
  if (days > 0) return `D-${days}`
  if (days === 0) return "D-Day"
  return `D+${Math.abs(days)}`
}

export function getRacesInMonth(
  year: number,
  month: number,
  races = getAllRaces()
): RaceEvent[] {
  return races
    .filter((race) => {
      const date = parseRaceDate(race.date)
      return date.getFullYear() === year && date.getMonth() + 1 === month
    })
    .sort(
      (a, b) =>
        parseRaceDate(a.date).getTime() - parseRaceDate(b.date).getTime()
    )
}

export function groupRacesByDateKey(
  races: RaceEvent[]
): Map<string, RaceEvent[]> {
  const map = new Map<string, RaceEvent[]>()
  for (const race of races) {
    const list = map.get(race.date) ?? []
    list.push(race)
    map.set(race.date, list)
  }
  return map
}

export function buildMonthCalendarGrid(
  year: number,
  month: number,
  now = new Date()
): CalendarDayCell[] {
  const first = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const startWeekday = first.getDay() === 0 ? 6 : first.getDay() - 1
  const today = stripTime(now)
  const cells: CalendarDayCell[] = []

  for (let i = 0; i < startWeekday; i++) {
    cells.push({
      dateKey: null,
      day: null,
      isToday: false,
      isCurrentMonth: false,
    })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day)
    cells.push({
      dateKey: toDateKey(date),
      day,
      isToday: date.getTime() === today.getTime(),
      isCurrentMonth: true,
    })
  }

  while (cells.length % 7 !== 0) {
    cells.push({
      dateKey: null,
      day: null,
      isToday: false,
      isCurrentMonth: false,
    })
  }

  while (cells.length < 42) {
    cells.push({
      dateKey: null,
      day: null,
      isToday: false,
      isCurrentMonth: false,
    })
  }

  return cells.slice(0, 42)
}

export function formatMonthTitle(year: number, month: number): string {
  return `${year}년 ${month}월`
}

export function getTodayMonth(now = new Date()): { year: number; month: number } {
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export function isCurrentMonth(
  year: number,
  month: number,
  now = new Date()
): boolean {
  return year === now.getFullYear() && month === now.getMonth() + 1
}

export function shortenRaceName(name: string, max = 9): string {
  const trimmed = name.replace(/^20\d{2}\s*/, "").trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max)}…`
}
