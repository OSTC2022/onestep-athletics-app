export type RaceCategory = "marathon" | "trail"
export type RegistrationStatus = "open" | "closing" | "closed"
export type MarathonDistance = "5k" | "10k" | "half" | "full"

export interface RaceEvent {
  id: string
  category: RaceCategory
  name: string
  date: string
  dateLabel: string
  location: string
  courses: string
  /** 마라톤 거리 필터용 */
  distances?: MarathonDistance[]
  registrationStatus: RegistrationStatus
  registrationUrl: string
  /** 공식 홈페이지 (미입력 시 registrationUrl 사용) */
  officialUrl?: string
  organizer?: string
}

export function getRaceOfficialUrl(race: RaceEvent): string {
  return race.officialUrl ?? race.registrationUrl
}

export type RegistrationFilter = "all" | "available" | "closed"
export type DistanceFilter = "all" | MarathonDistance
export type RaceDisplayStatus = RegistrationStatus | "past"

export const marathonDistanceLabels: Record<MarathonDistance, string> = {
  "5k": "5km",
  "10k": "10km",
  half: "Half",
  full: "Full",
}

export const registrationStatusLabels: Record<
  RegistrationStatus,
  { label: string; className: string }
> = {
  open: {
    label: "접수중",
    className: "bg-accent/15 text-accent border-accent/30",
  },
  closing: {
    label: "마감임박",
    className: "bg-warning/15 text-warning border-warning/30",
  },
  closed: {
    label: "접수마감",
    className: "bg-muted text-muted-foreground border-border",
  },
}

export const pastRaceStatusLabel = {
  label: "날짜 지남",
  className: "bg-secondary text-muted-foreground border-border",
} as const

export function parseRaceDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function isRacePast(race: RaceEvent, now = new Date()): boolean {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return parseRaceDate(race.date).getTime() < today.getTime()
}

export function getRaceDisplayStatus(
  race: RaceEvent,
  now = new Date()
): RaceDisplayStatus {
  if (isRacePast(race, now)) return "past"
  return race.registrationStatus
}

export function getRaceStatusBadge(
  race: RaceEvent,
  now = new Date()
): { label: string; className: string } {
  const status = getRaceDisplayStatus(race, now)
  if (status === "past") return pastRaceStatusLabel
  return registrationStatusLabels[status]
}

export function canRegisterForRace(race: RaceEvent, now = new Date()): boolean {
  if (isRacePast(race, now)) return false
  return race.registrationStatus !== "closed"
}

/**
 * 공식 홈페이지·주최 기관 사이트를 교차 확인한 2026 대회만 포함합니다.
 * 미확인 일정·URL·2027년 추정 데이터는 제외했습니다.
 */
export const marathonRaces: RaceEvent[] = [
  {
    id: "daegu-marathon-2026",
    category: "marathon",
    name: "2026 대구마라톤",
    date: "2026-02-22",
    dateLabel: "2026. 2. 22 (일)",
    location: "대구스타디움 및 시내 일원",
    courses: "Full · 10.9km · 건강달리기",
    distances: ["full", "10k"],
    registrationStatus: "closed",
    registrationUrl: "https://daegumarathon.daegu.go.kr/",
    officialUrl: "https://daegumarathon.daegu.go.kr/",
    organizer: "대구광역시 · 대한육상연맹",
  },
  {
    id: "seoul-marathon-2026",
    category: "marathon",
    name: "2026 서울국제마라톤",
    date: "2026-03-15",
    dateLabel: "2026. 3. 15 (일)",
    location: "광화문광장 ~ 잠실종합운동장",
    courses: "Full · 10km",
    distances: ["full", "10k"],
    registrationStatus: "closed",
    registrationUrl: "https://seoul-marathon.com/",
    officialUrl: "https://seoul-marathon.com/",
    organizer: "서울마라톤 조직위원회",
  },
  {
    id: "yeongnam-half-2026",
    category: "marathon",
    name: "제18회 영남일보 국제 하프마라톤",
    date: "2026-04-12",
    dateLabel: "2026. 4. 12 (일)",
    location: "대구스타디움",
    courses: "Half · 10km · 5km",
    distances: ["half", "10k", "5k"],
    registrationStatus: "closed",
    registrationUrl: "http://ynmarathon.kr/home/main.ubs",
    officialUrl: "http://ynmarathon.kr/home/main.ubs",
    organizer: "영남일보",
  },
  {
    id: "kiwoom-run-2026",
    category: "marathon",
    name: "2026 키움런",
    date: "2026-04-18",
    dateLabel: "2026. 4. 18 (토)",
    location: "서울 여의도공원 문화의마당",
    courses: "5km · 10km",
    distances: ["5k", "10k"],
    registrationStatus: "closed",
    registrationUrl: "https://kiwoomrun.com/",
    officialUrl: "https://kiwoomrun.com/",
    organizer: "키움증권",
  },
  {
    id: "peace-jeju-marathon-2026",
    category: "marathon",
    name: "2026 평화의섬 제주국제마라톤",
    date: "2026-04-27",
    dateLabel: "2026. 4. 27 (일)",
    location: "제주대학교 대운동장",
    courses: "Half · 10km · 5km",
    distances: ["half", "10k", "5k"],
    registrationStatus: "closed",
    registrationUrl: "http://jeju-marathon.com/",
    officialUrl: "http://jeju-marathon.com/",
    organizer: "제민일보",
  },
  {
    id: "518-marathon-2026",
    category: "marathon",
    name: "제26회 5·18 마라톤",
    date: "2026-05-02",
    dateLabel: "2026. 5. 2 (토)",
    location: "국립 5·18민주묘지 광장",
    courses: "5.18km · 10km",
    distances: ["5k", "10k"],
    registrationStatus: "closed",
    registrationUrl: "https://www.518run.com/",
    officialUrl: "https://www.518run.com/",
    organizer: "5·18마라톤대회 조직위",
  },
  {
    id: "kb-star-run-2026",
    category: "marathon",
    name: "KB스타런 2026",
    date: "2026-05-03",
    dateLabel: "2026. 5. 3 (일)",
    location: "서울 여의도공원 문화의마당",
    courses: "5km · 10km",
    distances: ["5k", "10k"],
    registrationStatus: "closed",
    registrationUrl: "https://emarathon.or.kr/",
    officialUrl: "https://emarathon.or.kr/",
    organizer: "e-마라톤",
  },
  {
    id: "solo-run-2026",
    category: "marathon",
    name: "2026 나는 솔로런",
    date: "2026-05-09",
    dateLabel: "2026. 5. 9 (토)",
    location: "서울 여의도공원 문화의마당",
    courses: "10km",
    distances: ["10k"],
    registrationStatus: "closed",
    registrationUrl: "http://solorun.kr/",
    officialUrl: "http://solorun.kr/",
    organizer: "e-마라톤",
  },
  {
    id: "seoul-sinmun-half-2026",
    category: "marathon",
    name: "2026 서울신문 하프마라톤",
    date: "2026-05-16",
    dateLabel: "2026. 5. 16 (토)",
    location: "서울 상암동 평화의공원",
    courses: "Half · 10km · 5km",
    distances: ["half", "10k", "5k"],
    registrationStatus: "closed",
    registrationUrl: "https://marathon.seoul.co.kr/",
    officialUrl: "https://marathon.seoul.co.kr/",
    organizer: "서울신문",
  },
  {
    id: "burning-run-2026",
    category: "marathon",
    name: "버닝런 2026",
    date: "2026-05-25",
    dateLabel: "2026. 5. 25 (월)",
    location: "서울 여의도 한강공원 물빛무대",
    courses: "5km · 7km · 10km",
    distances: ["5k", "10k"],
    registrationStatus: "closed",
    registrationUrl: "http://burningrun.kr/",
    officialUrl: "http://burningrun.kr/",
    organizer: "비즈한국",
  },
  {
    id: "chuncheon-bomnae-2026",
    category: "marathon",
    name: "2026 춘천봄내마라톤",
    date: "2026-06-06",
    dateLabel: "2026. 6. 6 (토)",
    location: "춘천시청 호반광장",
    courses: "20km · 10km · 5km",
    distances: ["half", "10k", "5k"],
    registrationStatus: "closed",
    registrationUrl: "http://ccpmarathon.kr/",
    officialUrl: "http://ccpmarathon.kr/",
    organizer: "춘천시 · 강원도",
  },
  {
    id: "im-bank-korea-open-2026",
    category: "marathon",
    name: "2026 iM뱅크 코리아오픈 마라톤",
    date: "2026-06-07",
    dateLabel: "2026. 6. 7 (일)",
    location: "서울 여의도공원 문화의마당",
    courses: "Half · 10km · 5km",
    distances: ["half", "10k", "5k"],
    registrationStatus: "open",
    registrationUrl: "https://emarathon.or.kr/",
    officialUrl: "https://emarathon.or.kr/",
    organizer: "e-마라톤",
  },
  {
    id: "jeju-tourism-marathon-2026",
    category: "marathon",
    name: "제30회 제주국제관광마라톤축제",
    date: "2026-06-07",
    dateLabel: "2026. 6. 7 (일)",
    location: "제주 구좌종합운동장 · 일출고성운동장",
    courses: "Full · Half · 10km",
    distances: ["full", "half", "10k"],
    registrationStatus: "closed",
    registrationUrl: "https://jejumarathon.com/",
    officialUrl: "https://jejumarathon.com/",
    organizer: "제주특별자치도관광협회",
  },
  {
    id: "songdo-lee-bongju-2026",
    category: "marathon",
    name: "2026 송도 이봉주 마라톤",
    date: "2026-06-28",
    dateLabel: "2026. 6. 28 (일)",
    location: "인천대학교 송도캠퍼스",
    courses: "10km · 5km",
    distances: ["10k", "5k"],
    registrationStatus: "open",
    registrationUrl: "https://runsongdo.co.kr/entryperson.php",
    officialUrl: "https://runsongdo.co.kr/",
    organizer: "인천광역시육상연맹",
  },
  {
    id: "taejongdae-marathon-2026",
    category: "marathon",
    name: "2026 제16회 태종대 전국마라톤",
    date: "2026-07-19",
    dateLabel: "2026. 7. 19 (일)",
    location: "부산 태종대공원",
    courses: "21km · 14km · 7km",
    distances: ["half"],
    registrationStatus: "open",
    registrationUrl: "http://www.bsama.co.kr/run/1001.asp?T=3&wma=2",
    officialUrl: "http://www.bsama.co.kr/",
    organizer: "부산아마추어마라톤클럽연맹",
  },
  {
    id: "gongju-baekje-2026",
    category: "marathon",
    name: "2026 공주백제마라톤",
    date: "2026-09-20",
    dateLabel: "2026. 9. 20 (일)",
    location: "충남 공주시민운동장",
    courses: "Full · Half · 10km · 5km",
    distances: ["full", "half", "10k", "5k"],
    registrationStatus: "open",
    registrationUrl: "https://dongma.club/product/list.html?cate_no=44",
    officialUrl: "https://www.gongjumarathon.com/",
    organizer: "공주시 · 동아일보",
  },
  {
    id: "geo-marathon-2026",
    category: "marathon",
    name: "2026 무등산권 지오마라톤",
    date: "2026-10-10",
    dateLabel: "2026. 10. 10 (토)",
    location: "화순 금호화순스파리조트",
    courses: "Half · 10km · 5.18km · 2km 걷기",
    distances: ["half", "10k", "5k"],
    registrationStatus: "open",
    registrationUrl: "https://georun.kr/",
    officialUrl: "https://georun.kr/",
    organizer: "광주MBC",
  },
]

export const trailRaces: RaceEvent[] = [
  {
    id: "jeju-intl-trail-2026",
    category: "trail",
    name: "2026 파타고니아 제주국제트레일러닝",
    date: "2026-04-10",
    dateLabel: "2026. 4. 10 (금) ~ 12 (일)",
    location: "제주 성읍리 · 성산 · 가시리",
    courses: "100K · 36K · 10K",
    registrationStatus: "closed",
    registrationUrl: "http://www.jejutrail.com/16",
    officialUrl: "http://www.jejutrail.com/",
    organizer: "제주국제트레일러닝",
  },
  {
    id: "tnf100-2026",
    category: "trail",
    name: "TNF100 2026",
    date: "2026-05-16",
    dateLabel: "2026. 5. 16 (토) ~ 17 (일)",
    location: "강릉 경포호수광장",
    courses: "10K · 22K · 50K · 100K",
    registrationStatus: "closed",
    registrationUrl: "https://tnf100korea.co.kr/",
    officialUrl: "https://tnf100korea.co.kr/",
    organizer: "노스페이스 · 영원아웃도어",
  },
  {
    id: "jirisan-hwaeom-utmb-2026",
    category: "trail",
    name: "제37회 지리산 화대종주 UTMB",
    date: "2026-05-24",
    dateLabel: "2026. 5. 24 (일)",
    location: "전남 구례 화엄사 주차장",
    courses: "48km · 40km · 34km · 21km",
    registrationStatus: "closed",
    registrationUrl: "http://www.koreatrail.net/home/main.php",
    officialUrl: "http://www.koreatrail.net/home/main.php",
    organizer: "한국산악마라톤연맹",
  },
  {
    id: "hallasan-100-2026",
    category: "trail",
    name: "2026 한라산 100 트레일런",
    date: "2026-06-06",
    dateLabel: "2026. 6. 6 (토) ~ 7 (일)",
    location: "제주 서귀포 돈내코 캠핑장",
    courses: "100M · 100K · 50K · 36K · 10K",
    registrationStatus: "closed",
    registrationUrl: "https://ktra.kr/58",
    officialUrl: "https://ktra.kr/69",
    organizer: "대한트레일러닝협회",
  },
  {
    id: "seoraksan-utmb-2026",
    category: "trail",
    name: "제14회 설악산 공룡능선 UTMB",
    date: "2026-09-13",
    dateLabel: "2026. 9. 13 (일)",
    location: "강원 설악산 한계령휴게소",
    courses: "27km · 22km",
    registrationStatus: "open",
    registrationUrl: "http://www.koreatrail.net/home/main.php",
    officialUrl: "http://www.koreatrail.net/home/main.php",
    organizer: "한국산악마라톤연맹",
  },
  {
    id: "trans-jeju-2026",
    category: "trail",
    name: "TRANS JEJU by UTMB",
    date: "2026-10-02",
    dateLabel: "2026. 10. 2 (금) ~ 4 (일)",
    location: "제주 한라산 · 오름 일대",
    courses: "100M · 100K · 60K · 20K",
    registrationStatus: "open",
    registrationUrl: "https://transjeju.utmb.world/ko",
    officialUrl: "https://transjeju.utmb.world/ko",
    organizer: "UTMB World Series",
  },
]

export function getRaceYear(race: RaceEvent): number {
  return parseRaceDate(race.date).getFullYear()
}

export function getAvailableYears(races: RaceEvent[]): number[] {
  const years = new Set(races.map(getRaceYear))
  return [...years].sort((a, b) => a - b)
}

export interface YearSummary {
  year: number
  label: string
  total: number
  available: number
  closed: number
  past: number
}

export function getYearSummaries(races: RaceEvent[]): YearSummary[] {
  const map = new Map<number, YearSummary>()

  for (const race of races) {
    const year = getRaceYear(race)
    const existing = map.get(year) ?? {
      year,
      label: `${year}년`,
      total: 0,
      available: 0,
      closed: 0,
      past: 0,
    }
    existing.total += 1
    if (isRacePast(race)) {
      existing.past += 1
    } else if (race.registrationStatus === "closed") {
      existing.closed += 1
    } else {
      existing.available += 1
    }
    map.set(year, existing)
  }

  return [...map.values()].sort((a, b) => a.year - b.year)
}

export function getRaceMonthNumber(race: RaceEvent): number {
  return parseRaceDate(race.date).getMonth() + 1
}

export function getRaceYearMonthKey(race: RaceEvent): string {
  const d = parseRaceDate(race.date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export interface CalendarMonthSummary {
  /** 1–12 */
  month: number
  label: string
  total: number
  available: number
  closed: number
  past: number
  years: number[]
}

export function isRegistrationAvailable(
  race: RaceEvent,
  now = new Date()
): boolean {
  if (isRacePast(race, now)) return false
  return race.registrationStatus !== "closed"
}

export function getRacesByCategory(category: RaceCategory): RaceEvent[] {
  const races = category === "marathon" ? marathonRaces : trailRaces
  return [...races].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
}

export function getAllRaces(): RaceEvent[] {
  return [...marathonRaces, ...trailRaces]
}

export function findRaceById(id: string): RaceEvent | undefined {
  return getAllRaces().find((race) => race.id === id)
}

export function filterRaces(
  races: RaceEvent[],
  options: {
    year?: number | null
    /** 1–12, 여러 월 동시 선택 */
    monthNumbers?: number[]
    /** 5k · 10k · half · full 중복 선택 */
    distances?: MarathonDistance[]
    registration?: RegistrationFilter
    excludePast?: boolean
  }
): RaceEvent[] {
  return races.filter((race) => {
    if (options.excludePast && isRacePast(race)) return false

    if (options.year != null) {
      if (getRaceYear(race) !== options.year) return false
    }

    if (options.monthNumbers != null && options.monthNumbers.length > 0) {
      if (!options.monthNumbers.includes(getRaceMonthNumber(race))) return false
    }

    if (options.distances != null && options.distances.length > 0) {
      if (!race.distances?.some((d) => options.distances!.includes(d))) {
        return false
      }
    }

    if (options.registration && options.registration !== "all") {
      const available = isRegistrationAvailable(race)
      if (options.registration === "available" && !available) return false
      if (options.registration === "closed" && available) return false
    }

    return true
  })
}

export const filterMarathonRaces = filterRaces

export function getCalendarMonthSummaries(
  races: RaceEvent[]
): CalendarMonthSummary[] {
  const map = new Map<number, CalendarMonthSummary>()

  for (let m = 1; m <= 12; m++) {
    map.set(m, {
      month: m,
      label: `${m}월`,
      total: 0,
      available: 0,
      closed: 0,
      past: 0,
      years: [],
    })
  }

  for (const race of races) {
    const month = getRaceMonthNumber(race)
    const year = parseRaceDate(race.date).getFullYear()
    const existing = map.get(month)!
    existing.total += 1

    if (!existing.years.includes(year)) {
      existing.years.push(year)
    }

    if (isRacePast(race)) {
      existing.past += 1
    } else if (race.registrationStatus === "closed") {
      existing.closed += 1
    } else {
      existing.available += 1
    }
  }

  for (const summary of map.values()) {
    summary.years.sort((a, b) => a - b)
  }

  return [...map.values()]
}

export function groupRacesByYearMonth(
  races: RaceEvent[]
): { key: string; label: string; races: RaceEvent[] }[] {
  const map = new Map<string, { key: string; label: string; races: RaceEvent[] }>()

  for (const race of races) {
    const key = getRaceYearMonthKey(race)
    const d = parseRaceDate(race.date)
    const label = `${d.getMonth() + 1}월`

    const existing = map.get(key) ?? { key, label, races: [] }
    existing.races.push(race)
    map.set(key, existing)
  }

  return [...map.values()].sort(
    (a, b) => new Date(a.key + "-01").getTime() - new Date(b.key + "-01").getTime()
  )
}

export interface YearRaceGroup {
  year: number
  label: string
  months: { key: string; label: string; races: RaceEvent[] }[]
}

/** 연도 → 월 계층 그룹 (연도 전체 보기용) */
export function groupRacesByYearThenMonth(races: RaceEvent[]): YearRaceGroup[] {
  const yearMap = new Map<number, YearRaceGroup>()

  for (const race of races) {
    const year = getRaceYear(race)
    const monthKey = getRaceYearMonthKey(race)
    const month = getRaceMonthNumber(race)

    const yearGroup = yearMap.get(year) ?? {
      year,
      label: `${year}년`,
      months: [],
    }

    let monthGroup = yearGroup.months.find((m) => m.key === monthKey)
    if (!monthGroup) {
      monthGroup = { key: monthKey, label: `${month}월`, races: [] }
      yearGroup.months.push(monthGroup)
    }
    monthGroup.races.push(race)
    yearMap.set(year, yearGroup)
  }

  for (const group of yearMap.values()) {
    group.months.sort(
      (a, b) =>
        new Date(a.key + "-01").getTime() - new Date(b.key + "-01").getTime()
    )
  }

  return [...yearMap.values()].sort((a, b) => a.year - b.year)
}
