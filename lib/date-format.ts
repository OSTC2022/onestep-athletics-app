const WEEKDAY_SHORT = ["일", "월", "화", "수", "목", "금", "토"] as const

export function formatKoreanDateWithWeekday(date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY_SHORT[d.getDay()]})`
}
