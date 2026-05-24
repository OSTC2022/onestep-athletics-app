"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  Bell,
  BellOff,
  Calendar,
  CalendarOff,
  ExternalLink,
  Globe,
  Heart,
  Link2,
  LogOut,
  MapPin,
  Mountain,
  Trophy,
  User,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  getMemberDisplayName,
  getMemberSession,
  loginMember,
  logoutMember,
  type MemberProfile,
} from "@/lib/member-session"
import {
  formatParticipationLabel,
  getRaceParticipants,
  isMemberParticipating,
  toggleRaceParticipation,
} from "@/lib/race-participation"
import {
  canSubscribeRaceNotification,
  detectNewlyOpenedRaces,
  getSubscribedRaceCount,
  isRaceNotificationSubscribed,
  requestNotificationPermission,
  showRaceOpenNotification,
  subscribeRaceNotification,
  unsubscribeRaceNotification,
} from "@/lib/race-notifications"
import {
  canRegisterForRace,
  filterRaces,
  findRaceById,
  getAvailableYears,
  getCalendarMonthSummaries,
  getRaceOfficialUrl,
  getRaceStatusBadge,
  getRaceYear,
  getRacesByCategory,
  getYearSummaries,
  groupRacesByYearMonth,
  groupRacesByYearThenMonth,
  marathonDistanceLabels,
  parseRaceDate,
  type MarathonDistance,
  type RaceEvent,
  type RegistrationFilter,
} from "@/lib/race-schedule"
import { copyRaceShareLink } from "@/lib/race-share"
import { cn } from "@/lib/utils"

const distanceOrder: MarathonDistance[] = ["5k", "10k", "half", "full"]

const distanceOptions: { value: MarathonDistance; label: string }[] = [
  { value: "5k", label: "5km" },
  { value: "10k", label: "10km" },
  { value: "half", label: "Half" },
  { value: "full", label: "Full" },
]

const registrationFilters: { value: RegistrationFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "available", label: "신청가능" },
  { value: "closed", label: "신청마감" },
]

function FilterChip({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors border",
        active
          ? "bg-accent text-accent-foreground border-accent"
          : "bg-secondary text-muted-foreground border-border hover:text-foreground",
        disabled && "opacity-40 cursor-not-allowed hover:text-muted-foreground"
      )}
    >
      {children}
    </button>
  )
}

function useRaceNotificationWatcher(allRaces: RaceEvent[]) {
  const checkOpened = useCallback(() => {
    const opened = detectNewlyOpenedRaces(allRaces)
    for (const race of opened) {
      showRaceOpenNotification(race)
      toast.success(`${race.name} 접수가 시작되었습니다`, {
        description: "지금 공식 사이트에서 신청할 수 있습니다.",
        action: {
          label: "신청하기",
          onClick: () => window.open(race.registrationUrl, "_blank"),
        },
      })
    }
  }, [allRaces])

  useEffect(() => {
    checkOpened()
    const interval = setInterval(checkOpened, 60_000)
    const onVisible = () => {
      if (document.visibilityState === "visible") checkOpened()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [checkOpened])
}

function MemberLoginDialog({
  open,
  onOpenChange,
  onLoggedIn,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLoggedIn: (profile: MemberProfile) => void
}) {
  const [name, setName] = useState("")
  const [nickname, setNickname] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("이름을 입력해 주세요")
      return
    }
    const profile = loginMember(name, nickname)
    onLoggedIn(profile)
    onOpenChange(false)
    setName("")
    setNickname("")
    toast.success(`${getMemberDisplayName(profile)}님, 환영합니다`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>회원 로그인</DialogTitle>
          <DialogDescription>
            로그인 후 대회 참가 표시를 할 수 있습니다. 이름 또는 닉네임이 다른
            회원에게 보입니다.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="member-name">이름</Label>
            <Input
              id="member-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="실명 또는 표시 이름"
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="member-nickname">
              닉네임 <span className="text-muted-foreground font-normal">(선택)</span>
            </Label>
            <Input
              id="member-nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임이 있으면 닉네임으로 표시"
              autoComplete="nickname"
            />
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full sm:w-auto">
              로그인
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function MemberAuthBar({
  member,
  onLogout,
  onLoginClick,
}: {
  member: MemberProfile | null
  onLogout: () => void
  onLoginClick: () => void
}) {
  if (!member) {
    return (
      <button
        type="button"
        onClick={onLoginClick}
        className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <User className="h-3.5 w-3.5" />
        로그인하고 참가 표시하기
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5">
      <User className="h-3.5 w-3.5 text-accent shrink-0" />
      <span className="text-[11px] font-medium text-accent truncate max-w-[140px]">
        {getMemberDisplayName(member)}님
      </span>
      <button
        type="button"
        onClick={onLogout}
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
        aria-label="로그아웃"
      >
        <LogOut className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function RaceParticipationBlock({
  race,
  member,
  participationVersion,
  onParticipationChange,
  onRequestLogin,
}: {
  race: RaceEvent
  member: MemberProfile | null
  participationVersion: number
  onParticipationChange: () => void
  onRequestLogin: () => void
}) {
  void participationVersion
  const participants = getRaceParticipants(race.id)
  const names = participants.map((p) => p.displayName)
  const isJoined = member
    ? isMemberParticipating(race.id, member.userId)
    : false
  const label = formatParticipationLabel(names)

  const handleToggle = () => {
    if (!member) {
      onRequestLogin()
      return
    }
    const joined = toggleRaceParticipation(race, member)
    onParticipationChange()
    toast.success(
      joined
        ? `${getMemberDisplayName(member)}님, 참가 표시했어요 ♥`
        : "참가 표시를 취소했습니다"
    )
  }

  if (participants.length === 0 && !member) return null

  const participantList = (
    <ul className="space-y-1">
      {participants.map((p) => (
        <li key={p.userId} className="text-xs text-foreground">
          • {p.displayName}
          {member?.userId === p.userId && (
            <span className="text-accent ml-1">(나)</span>
          )}
        </li>
      ))}
    </ul>
  )

  return (
    <div className="flex flex-col items-end gap-1 w-full">
      {participants.length > 0 && (
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent hover:bg-accent/15 transition-colors max-w-full text-right"
                >
                  <Heart className="h-2.5 w-2.5 fill-current shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[220px]">
              <p className="font-medium mb-1.5">참가 멤버</p>
              {participantList}
              {!member && (
                <p className="text-[10px] opacity-80 mt-1.5 border-t border-background/20 pt-1.5">
                  로그인하면 참가를 공유할 수 있어요
                </p>
              )}
              <p className="text-[10px] opacity-80 mt-1">탭하면 전체 목록</p>
            </TooltipContent>
          </Tooltip>
          <PopoverContent align="end" className="w-56 p-3">
            <p className="text-sm font-semibold mb-2">
              참가 멤버 ({participants.length})
            </p>
            {participantList}
            {!member && (
              <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border">
                로그인하면 「참가해요♥」로 참가를 공유할 수 있어요
              </p>
            )}
          </PopoverContent>
        </Popover>
      )}

      {member && (
        isJoined ? (
          <button
            type="button"
            onClick={handleToggle}
            className="text-[10px] text-muted-foreground/80 hover:text-muted-foreground transition-colors underline-offset-2 hover:underline"
          >
            참가 표시 취소
          </button>
        ) : (
          <button
            type="button"
            onClick={handleToggle}
            className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent hover:bg-accent/15 transition-colors"
          >
            <Heart className="h-2.5 w-2.5 shrink-0" />
            참가해요♥
          </button>
        )
      )}
    </div>
  )
}

function RaceCard({
  race,
  notifyVersion,
  onNotifyChange,
  member,
  participationVersion,
  onParticipationChange,
  onRequestLogin,
  highlighted,
}: {
  race: RaceEvent
  notifyVersion: number
  onNotifyChange: () => void
  member: MemberProfile | null
  participationVersion: number
  onParticipationChange: () => void
  onRequestLogin: () => void
  highlighted?: boolean
}) {
  const status = getRaceStatusBadge(race)
  const canRegister = canRegisterForRace(race)
  const canNotify = canSubscribeRaceNotification(race)
  const isSubscribed = isRaceNotificationSubscribed(race.id)
  const officialUrl = getRaceOfficialUrl(race)
  void notifyVersion

  const handleNotifyToggle = async () => {
    if (isSubscribed) {
      unsubscribeRaceNotification(race.id)
      onNotifyChange()
      toast("알림을 해제했습니다")
      return
    }

    const permission = await requestNotificationPermission()
    subscribeRaceNotification(race)
    onNotifyChange()

    if (permission === "granted") {
      toast.success("접수 오픈 알림을 설정했습니다", {
        description: "접수가 시작되면 브라우저 알림을 보내드립니다.",
      })
    } else if (permission === "denied") {
      toast.info("브라우저 알림이 차단되었습니다", {
        description: "앱 접속 시 접수 시작 여부를 확인해 드립니다.",
      })
    } else {
      toast.success("알림을 설정했습니다", {
        description: "접수가 시작되면 앱에서 알려드립니다.",
      })
    }
  }

  const handleCopyShareLink = async () => {
    const copied = await copyRaceShareLink(race)
    if (copied) {
      toast.success("대회 링크를 복사했어요", {
        description: "친구에게 보내면 이 대회로 바로 이동할 수 있어요.",
      })
    } else {
      toast.error("링크 복사에 실패했습니다", {
        description: "브라우저 권한을 확인해 주세요.",
      })
    }
  }

  return (
    <Card
      id={`race-card-${race.id}`}
      className={cn(
        "border-border bg-card/80 transition-shadow duration-500",
        highlighted && "ring-2 ring-accent/50 shadow-md",
        !canRegister && status.label === "날짜 지남" && "opacity-75"
      )}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1 flex-1">
            <h3 className="font-semibold text-[15px] leading-snug">{race.name}</h3>
            {race.organizer && (
              <p className="text-[11px] text-muted-foreground">{race.organizer}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  aria-label="링크 복사"
                  className="inline-flex items-center justify-center h-5 w-5 rounded text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
                >
                  <Link2 className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">링크 복사</TooltipContent>
            </Tooltip>
            <Badge variant="outline" className={cn("text-[10px]", status.className)}>
              {status.label}
            </Badge>
            {isSubscribed && (
              <Badge
                variant="outline"
                className="text-[10px] bg-accent/10 text-accent border-accent/30"
              >
                알림 ON
              </Badge>
            )}
            <RaceParticipationBlock
              race={race}
              member={member}
              participationVersion={participationVersion}
              onParticipationChange={onParticipationChange}
              onRequestLogin={onRequestLogin}
            />
          </div>
        </div>

        {race.distances && race.distances.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {race.distances.map((d) => (
              <Badge
                key={d}
                variant="outline"
                className="text-[10px] px-2 py-0 border-border text-muted-foreground"
              >
                {marathonDistanceLabels[d]}
              </Badge>
            ))}
          </div>
        )}

        <div className="space-y-1.5 text-[13px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-accent" />
            <span className="text-foreground">{race.dateLabel}</span>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-accent mt-0.5" />
            <span>{race.location}</span>
          </div>
          <p className="pl-[22px] text-[12px]">{race.courses}</p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            asChild
            variant="outline"
            className="w-full border-border hover:border-accent/50 hover:bg-accent/5"
          >
            <a href={officialUrl} target="_blank" rel="noopener noreferrer">
              <Globe className="h-4 w-4 mr-2 text-accent" />
              공식 홈페이지
              <ExternalLink className="h-3 w-3 ml-auto opacity-60" />
            </a>
          </Button>

          {canNotify && (
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full border-border",
                isSubscribed && "border-accent/40 bg-accent/5 text-accent"
              )}
              onClick={handleNotifyToggle}
            >
              {isSubscribed ? (
                <>
                  <BellOff className="h-4 w-4 mr-2" />
                  접수 오픈 알림 해제
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  접수 오픈 알림 받기
                </>
              )}
            </Button>
          )}

          {canRegister ? (
            <Button
              asChild
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <a
                href={race.registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                접수 신청하기
              </a>
            </Button>
          ) : (
            <Button
              disabled
              className="w-full bg-muted text-muted-foreground hover:bg-muted"
            >
              {status.label === "날짜 지남" ? "날짜 지남" : "접수 마감"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function YearFilterBar({
  years,
  yearSummaries,
  selectedYear,
  onSelectYear,
}: {
  years: number[]
  yearSummaries: ReturnType<typeof getYearSummaries>
  selectedYear: number | null
  onSelectYear: (year: number | null) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
        연도
      </p>
      <div className="flex gap-2 flex-wrap">
        <FilterChip active={selectedYear === null} onClick={() => onSelectYear(null)}>
          전체
        </FilterChip>
        {years.map((year) => {
          const summary = yearSummaries.find((s) => s.year === year)
          return (
            <FilterChip
              key={year}
              active={selectedYear === year}
              onClick={() => onSelectYear(selectedYear === year ? null : year)}
            >
              {year}년
              {summary ? ` (${summary.total})` : ""}
            </FilterChip>
          )
        })}
      </div>
    </div>
  )
}

function CalendarMonthGrid({
  summaries,
  selectedMonths,
  onToggleMonth,
  onClearMonths,
}: {
  summaries: ReturnType<typeof getCalendarMonthSummaries>
  selectedMonths: number[]
  onToggleMonth: (month: number) => void
  onClearMonths: () => void
}) {
  const activeSummaries = summaries.filter((s) => s.total > 0)
  const hasMonthFilter = selectedMonths.length > 0

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
        월별 대회
      </p>

      <div className="px-0.5">
        <FilterChip active={!hasMonthFilter} onClick={onClearMonths}>
          전체 월
        </FilterChip>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {summaries.map((summary) => {
          const isActive = selectedMonths.includes(summary.month)
          const hasRaces = summary.total > 0

          return (
            <button
              key={summary.month}
              type="button"
              disabled={!hasRaces}
              onClick={() => onToggleMonth(summary.month)}
              className={cn(
                "flex flex-col items-center justify-center rounded-xl border py-3 min-h-[64px] transition-colors active:scale-[0.97]",
                isActive
                  ? "border-accent bg-accent/15 text-accent"
                  : hasRaces
                    ? "border-border bg-card/70 hover:border-accent/50 hover:bg-accent/5"
                    : "border-border/50 bg-card/30 opacity-35 cursor-not-allowed"
              )}
            >
              <span className="text-sm font-bold">{summary.label}</span>
              {hasRaces ? (
                <span
                  className={cn(
                    "text-[11px] tabular-nums mt-0.5",
                    isActive ? "text-accent" : "text-muted-foreground"
                  )}
                >
                  {summary.total}개
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground mt-0.5">—</span>
              )}
            </button>
          )
        })}
      </div>

      {activeSummaries.length > 0 && !hasMonthFilter && (
        <p className="text-[10px] text-muted-foreground px-0.5">
          월을 탭해 선택하세요. 5월·6월처럼 여러 월을 동시에 선택할 수 있습니다.
        </p>
      )}
      {hasMonthFilter && (
        <p className="text-[10px] text-muted-foreground px-0.5">
          선택: {selectedMonths.map((m) => `${m}월`).join(", ")} · 다시 탭하면
          해제
        </p>
      )}
    </div>
  )
}

function RaceListSection({
  races,
  showDistanceFilter,
  notifyVersion,
  onNotifyChange,
  member,
  participationVersion,
  onParticipationChange,
  onRequestLogin,
  focusRaceId,
  highlightRaceId,
}: {
  races: RaceEvent[]
  showDistanceFilter?: boolean
  notifyVersion: number
  onNotifyChange: () => void
  member: MemberProfile | null
  participationVersion: number
  onParticipationChange: () => void
  onRequestLogin: () => void
  focusRaceId?: string | null
  highlightRaceId?: string | null
}) {
  const availableYears = useMemo(() => getAvailableYears(races), [races])

  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedMonths, setSelectedMonths] = useState<number[]>([])
  const [excludePast, setExcludePast] = useState(true)
  const [selectedDistances, setSelectedDistances] = useState<MarathonDistance[]>(
    []
  )
  const [registrationFilter, setRegistrationFilter] =
    useState<RegistrationFilter>("all")

  const appliedFocusRef = useRef<string | null>(null)

  useEffect(() => {
    if (!focusRaceId || appliedFocusRef.current === focusRaceId) return
    const race = findRaceById(focusRaceId)
    if (!race || !races.some((r) => r.id === race.id)) return

    appliedFocusRef.current = focusRaceId
    const raceDate = parseRaceDate(race.date)

    setSelectedYear(getRaceYear(race))
    setSelectedMonths([raceDate.getMonth() + 1])
    setExcludePast(false)
    setSelectedDistances([])
    setRegistrationFilter("all")

    window.setTimeout(() => {
      document
        .getElementById(`race-card-${focusRaceId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 150)
  }, [focusRaceId, races])

  const toggleDistance = (distance: MarathonDistance) => {
    setSelectedDistances((prev) =>
      prev.includes(distance)
        ? prev.filter((d) => d !== distance)
        : [...prev, distance].sort(
            (a, b) => distanceOrder.indexOf(a) - distanceOrder.indexOf(b)
          )
    )
  }

  const toggleMonth = (month: number) => {
    setSelectedMonths((prev) =>
      prev.includes(month)
        ? prev.filter((m) => m !== month)
        : [...prev, month].sort((a, b) => a - b)
    )
  }

  const baseForSummaries = useMemo(
    () =>
      filterRaces(races, {
        year: selectedYear,
        excludePast,
      }),
    [races, selectedYear, excludePast]
  )

  const yearSummaries = useMemo(
    () => getYearSummaries(filterRaces(races, { excludePast })),
    [races, excludePast]
  )

  const monthSummaries = useMemo(
    () => getCalendarMonthSummaries(baseForSummaries),
    [baseForSummaries]
  )

  const filteredRaces = useMemo(
    () =>
      filterRaces(races, {
        year: selectedYear,
        monthNumbers: selectedMonths,
        distances:
          showDistanceFilter && selectedDistances.length > 0
            ? selectedDistances
            : undefined,
        registration: registrationFilter,
        excludePast,
      }),
    [
      races,
      selectedYear,
      selectedMonths,
      selectedDistances,
      registrationFilter,
      showDistanceFilter,
      excludePast,
    ]
  )

  const groupedByYear = useMemo(
    () => groupRacesByYearThenMonth(filteredRaces),
    [filteredRaces]
  )

  const groupedByMonth = useMemo(
    () => groupRacesByYearMonth(filteredRaces),
    [filteredRaces]
  )

  const hasActiveFilters =
    selectedYear !== null ||
    selectedMonths.length > 0 ||
    !excludePast ||
    (showDistanceFilter && selectedDistances.length > 0) ||
    registrationFilter !== "all"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setExcludePast((v) => !v)}
          className={cn(
            "flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-medium transition-colors",
            excludePast
              ? "border-accent bg-accent/10 text-accent"
              : "border-border bg-secondary text-muted-foreground hover:text-foreground"
          )}
        >
          <CalendarOff className="h-3.5 w-3.5 shrink-0" />
          날짜 지난 대회 제외
        </button>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {excludePast ? "지난 대회 숨김" : "전체 표시"}
        </span>
      </div>

      <YearFilterBar
        years={availableYears}
        yearSummaries={yearSummaries}
        selectedYear={selectedYear}
        onSelectYear={(year) => {
          setSelectedYear(year)
          setSelectedMonths([])
        }}
      />

      <CalendarMonthGrid
        summaries={monthSummaries}
        selectedMonths={selectedMonths}
        onToggleMonth={toggleMonth}
        onClearMonths={() => setSelectedMonths([])}
      />

      {selectedMonths.length > 0 && (
        <p className="text-xs text-muted-foreground px-0.5">
          {selectedYear ? `${selectedYear}년 ` : ""}
          {selectedMonths.map((m) => `${m}월`).join(", ")} 대회
        </p>
      )}

      {showDistanceFilter && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
            거리
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <FilterChip
              active={selectedDistances.length === 0}
              onClick={() => setSelectedDistances([])}
            >
              전체
            </FilterChip>
            {distanceOptions.map((item) => (
              <FilterChip
                key={item.value}
                active={selectedDistances.includes(item.value)}
                onClick={() => toggleDistance(item.value)}
              >
                {item.label}
              </FilterChip>
            ))}
          </div>
          {selectedDistances.length > 0 && (
            <p className="text-[10px] text-muted-foreground px-0.5">
              선택:{" "}
              {selectedDistances
                .map((d) => marathonDistanceLabels[d])
                .join(", ")}{" "}
              · 다시 탭하면 해제
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
          접수 상태
        </p>
        <div className="flex gap-2 flex-wrap">
          {registrationFilters.map((item) => (
            <FilterChip
              key={item.value}
              active={registrationFilter === item.value}
              onClick={() => setRegistrationFilter(item.value)}
            >
              {item.label}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-0.5">
        <p className="text-xs text-muted-foreground">
          {filteredRaces.length}개 대회
        </p>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setSelectedYear(null)
              setSelectedMonths([])
              setExcludePast(true)
              setSelectedDistances([])
              setRegistrationFilter("all")
            }}
            className="text-xs text-accent hover:underline"
          >
            필터 초기화
          </button>
        )}
      </div>

      {filteredRaces.length === 0 ? (
        <Card className="border-border bg-card/50">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            조건에 맞는 대회가 없습니다.
          </CardContent>
        </Card>
      ) : selectedYear === null ? (
        <div className="space-y-6">
          {groupedByYear.map((yearGroup) => (
            <div key={yearGroup.year} className="space-y-4">
              <div className="flex items-center gap-2 px-0.5 border-b border-border pb-2">
                <h2 className="text-base font-bold text-foreground">
                  {yearGroup.label}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {yearGroup.months.reduce((n, m) => n + m.races.length, 0)}개
                </span>
              </div>
              {yearGroup.months.map((monthGroup) => (
                <div key={monthGroup.key} className="space-y-3 pl-1">
                  <h3 className="text-sm font-semibold text-accent px-0.5">
                    {monthGroup.label}
                  </h3>
                  {monthGroup.races.map((race) => (
                    <RaceCard
                      key={race.id}
                      race={race}
                      notifyVersion={notifyVersion}
                      onNotifyChange={onNotifyChange}
                      member={member}
                      participationVersion={participationVersion}
                      onParticipationChange={onParticipationChange}
                      onRequestLogin={onRequestLogin}
                      highlighted={highlightRaceId === race.id}
                    />
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {groupedByMonth.map((group) => (
            <div key={group.key} className="space-y-3">
              <h2 className="text-sm font-semibold text-accent px-0.5">
                {group.label}
              </h2>
              {group.races.map((race) => (
                <RaceCard
                  key={race.id}
                  race={race}
                  notifyVersion={notifyVersion}
                  onNotifyChange={onNotifyChange}
                  member={member}
                  participationVersion={participationVersion}
                  onParticipationChange={onParticipationChange}
                  onRequestLogin={onRequestLogin}
                  highlighted={highlightRaceId === race.id}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function CompetitionsPage() {
  const searchParams = useSearchParams()
  const sharedRaceId = searchParams.get("race")

  const marathonRaces = useMemo(() => getRacesByCategory("marathon"), [])
  const trailRaces = useMemo(() => getRacesByCategory("trail"), [])
  const allRaces = useMemo(
    () => [...marathonRaces, ...trailRaces],
    [marathonRaces, trailRaces]
  )

  const sharedRace = useMemo(
    () => (sharedRaceId ? findRaceById(sharedRaceId) : undefined),
    [sharedRaceId]
  )

  const [activeTab, setActiveTab] = useState<"marathon" | "trail">("marathon")
  const [highlightRaceId, setHighlightRaceId] = useState<string | null>(null)
  const [member, setMember] = useState<MemberProfile | null>(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [notifyVersion, setNotifyVersion] = useState(0)
  const [participationVersion, setParticipationVersion] = useState(0)

  useEffect(() => {
    setMember(getMemberSession())
  }, [])

  useEffect(() => {
    if (!sharedRace) return
    setActiveTab(sharedRace.category)
    setHighlightRaceId(sharedRace.id)
    const timer = window.setTimeout(() => setHighlightRaceId(null), 4000)
    return () => window.clearTimeout(timer)
  }, [sharedRace])

  const subscribedCount = useMemo(() => {
    void notifyVersion
    return getSubscribedRaceCount()
  }, [notifyVersion])

  useRaceNotificationWatcher(allRaces)

  const bumpNotify = () => setNotifyVersion((v) => v + 1)
  const bumpParticipation = () => setParticipationVersion((v) => v + 1)

  const handleLogout = () => {
    logoutMember()
    setMember(null)
    bumpParticipation()
    toast("로그아웃했습니다")
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      <MemberLoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onLoggedIn={setMember}
      />

      <div className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-accent shrink-0" />
              <h1 className="text-xl font-bold">대회 일정</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              마라톤 · 트레일런 일정 · 월별 조회 · 접수 오픈 알림
            </p>
          </div>
          <MemberAuthBar
            member={member}
            onLogout={handleLogout}
            onLoginClick={() => setLoginOpen(true)}
          />
        </div>
        {subscribedCount > 0 && (
          <p className="text-[11px] text-accent flex items-center gap-1">
            <Bell className="h-3 w-3" />
            접수 알림 {subscribedCount}개 설정됨
          </p>
        )}
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          참가 표시에 마우스를 올리면 누가 참가하는지 확인할 수 있습니다.
          {member ? (
            <>
              {" "}
              「참가해요♥」를 누르면 다른 회원에게 참가가 표시됩니다.
            </>
          ) : (
            <>
              {" "}
              로그인하면 「참가해요♥」로 참가를 다른 회원과 공유할 수
              있습니다.
            </>
          )}
          {" "}
          「링크 복사」로 대회를 친구에게 알릴 수 있어요.
        </p>
        {sharedRace && (
          <p className="text-[11px] text-accent">
            공유된 대회: {sharedRace.name}
          </p>
        )}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "marathon" | "trail")}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 h-10 bg-secondary">
          <TabsTrigger value="marathon" className="text-xs sm:text-sm gap-1.5">
            <Trophy className="h-3.5 w-3.5" />
            마라톤
          </TabsTrigger>
          <TabsTrigger value="trail" className="text-xs sm:text-sm gap-1.5">
            <Mountain className="h-3.5 w-3.5" />
            트레일런
          </TabsTrigger>
        </TabsList>

        <TabsContent value="marathon" className="mt-4">
          <RaceListSection
            races={marathonRaces}
            showDistanceFilter
            notifyVersion={notifyVersion}
            onNotifyChange={bumpNotify}
            member={member}
            participationVersion={participationVersion}
            onParticipationChange={bumpParticipation}
            onRequestLogin={() => setLoginOpen(true)}
            focusRaceId={
              sharedRace?.category === "marathon" ? sharedRace.id : null
            }
            highlightRaceId={highlightRaceId}
          />
        </TabsContent>

        <TabsContent value="trail" className="mt-4">
          <RaceListSection
            races={trailRaces}
            notifyVersion={notifyVersion}
            onNotifyChange={bumpNotify}
            member={member}
            participationVersion={participationVersion}
            onParticipationChange={bumpParticipation}
            onRequestLogin={() => setLoginOpen(true)}
            focusRaceId={
              sharedRace?.category === "trail" ? sharedRace.id : null
            }
            highlightRaceId={highlightRaceId}
          />
        </TabsContent>
      </Tabs>

      <p className="text-[11px] text-muted-foreground text-center leading-relaxed px-2">
        연도와 월을 선택해 대회를 찾을 수 있습니다.
        <br />
        접수 마감 대회에서 알림을 설정하면, 접수 시작 시 알려드립니다.
        <br />
        일정·접수 정보는 각 대회 공식 홈페이지 기준이며, 변경될 수 있습니다.
      </p>
    </div>
  )
}
