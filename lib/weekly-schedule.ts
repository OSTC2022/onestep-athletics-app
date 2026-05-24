export type ScheduleDayStatus = "completed" | "today" | "upcoming" | "rest"

export interface TrainingLocation {
  name: string
  address: string
  /** 네이버 지도 검색어 (미입력 시 address 사용) */
  mapQuery?: string
}

export interface WeeklyScheduleDay {
  day: string
  date: string
  dateLabel: string
  type: string
  distance: string
  status: ScheduleDayStatus
  location: TrainingLocation | null
}

const weeklyScheduleTemplate: Omit<
  WeeklyScheduleDay,
  "date" | "dateLabel" | "status"
>[] = [
  {
    day: "월",
    type: "인터벌",
    distance: "5.2km",
    location: {
      name: "잠실 보조경기장 트랙",
      address: "서울특별시 송파구 올림픽로 25",
      mapQuery: "잠실 보조경기장",
    },
  },
  {
    day: "화",
    type: "조깅",
    distance: "8km",
    location: {
      name: "올림픽공원 러닝코스",
      address: "서울특별시 송파구 올림픽로 424",
      mapQuery: "올림픽공원 평화의 광장",
    },
  },
  {
    day: "수",
    type: "휴식",
    distance: "-",
    location: null,
  },
  {
    day: "목",
    type: "템포런",
    distance: "10km",
    location: {
      name: "한강공원 여의도구간",
      address: "서울특별시 영등포구 여의동로 330",
      mapQuery: "한강공원 여의도 러닝코스",
    },
  },
  {
    day: "금",
    type: "조깅",
    distance: "6km",
    location: {
      name: "양재천 러닝코스",
      address: "서울특별시 서초구 양재동 246-5",
      mapQuery: "양재천 수변공원",
    },
  },
  {
    day: "토",
    type: "장거리",
    distance: "15km",
    location: {
      name: "한강공원 반포·잠원구간",
      address: "서울특별시 서초구 신반포로 11",
      mapQuery: "한강공원 잠원지구",
    },
  },
  {
    day: "일",
    type: "휴식",
    distance: "-",
    location: null,
  },
]

function stripTime(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function getMondayOfWeek(date: Date): Date {
  const d = stripTime(date)
  const weekday = d.getDay()
  const diff = weekday === 0 ? -6 : 1 - weekday
  d.setDate(d.getDate() + diff)
  return d
}

function resolveDayStatus(
  date: Date,
  today: Date,
  isRestDay: boolean
): ScheduleDayStatus {
  if (isRestDay) return "rest"

  const day = stripTime(date).getTime()
  const now = stripTime(today).getTime()

  if (day === now) return "today"
  if (day < now) return "completed"
  return "upcoming"
}

export function getWeekSchedule(
  weekOffset = 0,
  now = new Date()
): WeeklyScheduleDay[] {
  const monday = getMondayOfWeek(now)
  monday.setDate(monday.getDate() + weekOffset * 7)
  const today = stripTime(now)

  return weeklyScheduleTemplate.map((template, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    const isRestDay = template.type === "휴식"

    return {
      ...template,
      date: toDateKey(date),
      dateLabel: `${date.getMonth() + 1}/${date.getDate()}`,
      status: resolveDayStatus(date, today, isRestDay),
    }
  })
}

export function getWeekRangeLabel(weekOffset = 0, now = new Date()): string {
  const days = getWeekSchedule(weekOffset, now)
  const start = days[0]
  const end = days[6]
  const [startMonth, startDay] = start.dateLabel.split("/")
  const [endMonth, endDay] = end.dateLabel.split("/")

  if (startMonth === endMonth) {
    return `${startMonth}월 ${startDay}일 – ${endDay}일`
  }

  return `${startMonth}/${startDay} – ${endMonth}/${endDay}`
}

export function getWeekCalendarMonth(
  weekOffset = 0,
  now = new Date()
): { year: number; month: number } {
  const days = getWeekSchedule(weekOffset, now)
  const today = stripTime(now)
  const todayKey = toDateKey(today)
  const refDate = days.find((d) => d.date === todayKey)?.date ?? days[0].date
  const [year, month] = refDate.split("-").map(Number)
  return { year, month }
}

export function getWeekOffsetForDate(target: Date, now = new Date()): number {
  const targetMonday = getMondayOfWeek(stripTime(target)).getTime()
  const todayMonday = getMondayOfWeek(stripTime(now)).getTime()
  return Math.round((targetMonday - todayMonday) / (7 * 86_400_000))
}

export function getNaverMapSearchUrl(query: string): string {
  return `https://map.naver.com/v5/search/${encodeURIComponent(query)}`
}

export function getScheduleMapQuery(location: TrainingLocation): string {
  return location.mapQuery?.trim() || location.address
}

export function openNaverMap(location: TrainingLocation): void {
  const url = getNaverMapSearchUrl(getScheduleMapQuery(location))
  window.open(url, "_blank", "noopener,noreferrer")
}

export function formatScheduleDayTitle(day: WeeklyScheduleDay): string {
  return `${day.day} ${day.dateLabel} · ${day.type}`
}

export function getTodayScheduleDay(now = new Date()): WeeklyScheduleDay | null {
  const days = getWeekSchedule(0, now)
  return days.find((day) => day.status === "today") ?? null
}
