import { isChecklistItemCompleted } from "@/lib/daily-checklist"

/**
 * 월·화·목·금·일 중 주 2회 선택 참여.
 * 월간 목표 = 2회 × 해당 월 주 수 (월마다 달라짐).
 */
export const SESSIONS_PER_WEEK = 2

/** 출석 인정 요일: 월·화·목·금·일 (수·토 제외) */
export const ATTENDANCE_WEEKDAYS = [1, 2, 4, 5, 0] as const

export const ATTENDANCE_DAY_LABELS = "월·화·목·금·일"

export const ATTENDANCE_EVENT = "attendance-updated"

const STORAGE_KEY = "one-step-coach-attendance"

interface StoredAttendance {
  dates: string[]
}

export interface MonthlyAttendanceSummary {
  count: number
  target: number
  weeksInMonth: number
  label: string
  detailLabel: string
}

function stripTime(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function getMondayOfWeek(date: Date): Date {
  const d = stripTime(date)
  const weekday = d.getDay()
  const diff = weekday === 0 ? -6 : 1 - weekday
  d.setDate(d.getDate() + diff)
  return d
}

function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function getTodayDateKey(now = new Date()): string {
  return toDateKey(stripTime(now))
}

function readStored(): StoredAttendance {
  if (typeof window === "undefined") return { dates: [] }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { dates: [] }
    const parsed = JSON.parse(raw) as StoredAttendance
    return { dates: Array.isArray(parsed.dates) ? parsed.dates : [] }
  } catch {
    return { dates: [] }
  }
}

function writeStored(data: StoredAttendance): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function notifyAttendanceChange(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(ATTENDANCE_EVENT))
}

export function isAttendanceDay(date: Date | string): boolean {
  const d =
    typeof date === "string" ? stripTime(parseDateKey(date)) : stripTime(date)
  return (ATTENDANCE_WEEKDAYS as readonly number[]).includes(d.getDay())
}

export function isTodayAttendanceDay(now = new Date()): boolean {
  return isAttendanceDay(now)
}

/** 해당 월에 하루라도 포함된 주(월~일) 개수 */
export function getWeeksInMonth(year: number, month: number): number {
  const first = new Date(year, month - 1, 1)
  const last = new Date(year, month, 0)
  const weekKeys = new Set<string>()

  const current = stripTime(first)
  const end = stripTime(last)
  while (current.getTime() <= end.getTime()) {
    weekKeys.add(toDateKey(getMondayOfWeek(current)))
    current.setDate(current.getDate() + 1)
  }

  return weekKeys.size
}

export function getMonthlySessionTarget(now = new Date()): number {
  return SESSIONS_PER_WEEK * getWeeksInMonth(now.getFullYear(), now.getMonth() + 1)
}

export function setAttendanceForDate(dateKey: string, attended: boolean): void {
  const dates = new Set(readStored().dates.filter(isAttendanceDay))

  if (attended) {
    if (!isAttendanceDay(dateKey)) return
    dates.add(dateKey)
  } else {
    dates.delete(dateKey)
  }

  writeStored({ dates: [...dates].sort() })
  notifyAttendanceChange()
}

export function syncTodayAttendanceFromChecklist(now = new Date()): void {
  const today = getTodayDateKey(now)
  const checked = isChecklistItemCompleted(1) && isAttendanceDay(today)
  setAttendanceForDate(today, checked)
}

export function getMonthlyAttendanceDates(
  year: number,
  month: number
): string[] {
  const prefix = `${year}-${String(month).padStart(2, "0")}-`
  return readStored().dates.filter(
    (dateKey) => dateKey.startsWith(prefix) && isAttendanceDay(dateKey)
  )
}

/** 주당 최대 2회까지만 월간 출석으로 인정 */
export function getMonthlyAttendanceCount(now = new Date()): number {
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const dates = getMonthlyAttendanceDates(year, month)
  const byWeek = new Map<string, string[]>()

  for (const dateKey of dates) {
    const weekKey = toDateKey(getMondayOfWeek(parseDateKey(dateKey)))
    const list = byWeek.get(weekKey) ?? []
    list.push(dateKey)
    byWeek.set(weekKey, list)
  }

  let total = 0
  for (const weekDates of byWeek.values()) {
    total += Math.min(weekDates.length, SESSIONS_PER_WEEK)
  }
  return total
}

export function calculateMonthlyAttendanceRate(
  attendedCount: number,
  target = getMonthlySessionTarget()
): number {
  if (target <= 0) return 0
  return Math.min(100, Math.round((attendedCount / target) * 100))
}

export function getMonthlyAttendanceRate(now = new Date()): number {
  return calculateMonthlyAttendanceRate(
    getMonthlyAttendanceCount(now),
    getMonthlySessionTarget(now)
  )
}

export function getMonthlyAttendanceSummary(
  now = new Date()
): MonthlyAttendanceSummary {
  const weeksInMonth = getWeeksInMonth(now.getFullYear(), now.getMonth() + 1)
  const count = getMonthlyAttendanceCount(now)
  const target = SESSIONS_PER_WEEK * weeksInMonth

  return {
    count,
    target,
    weeksInMonth,
    label: `${count}/${target}회`,
    detailLabel: `주 2회 선택 · ${weeksInMonth}주 · 목표 ${target}회`,
  }
}

export function formatMonthlyAttendanceSummary(now = new Date()): string {
  return getMonthlyAttendanceSummary(now).label
}

export function getCurrentMonthLabel(now = new Date()): string {
  return now.toLocaleDateString("ko-KR", { year: "numeric", month: "long" })
}
