import type { RaceEvent, RegistrationStatus } from "@/lib/race-schedule"
import { isRacePast, isRegistrationAvailable } from "@/lib/race-schedule"

const STORAGE_KEY = "one-step-coach-race-notifications"

export interface RaceNotificationSubscription {
  raceId: string
  raceName: string
  subscribedAt: string
  /** 알림 발송 판단용 — 구독 시점의 접수 상태 */
  lastKnownStatus: RegistrationStatus
}

function readAll(): RaceNotificationSubscription[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as RaceNotificationSubscription[]
  } catch {
    return []
  }
}

function writeAll(subs: RaceNotificationSubscription[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subs))
}

export function getRaceNotificationSubscriptions(): RaceNotificationSubscription[] {
  return readAll()
}

export function isRaceNotificationSubscribed(raceId: string): boolean {
  return readAll().some((s) => s.raceId === raceId)
}

export function canSubscribeRaceNotification(race: RaceEvent): boolean {
  if (isRacePast(race)) return false
  return race.registrationStatus === "closed"
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied"
  }
  if (Notification.permission === "granted") return "granted"
  if (Notification.permission === "denied") return "denied"
  return Notification.requestPermission()
}

export function subscribeRaceNotification(race: RaceEvent): RaceNotificationSubscription {
  const subs = readAll().filter((s) => s.raceId !== race.id)
  const entry: RaceNotificationSubscription = {
    raceId: race.id,
    raceName: race.name,
    subscribedAt: new Date().toISOString(),
    lastKnownStatus: race.registrationStatus,
  }
  writeAll([...subs, entry])
  return entry
}

export function unsubscribeRaceNotification(raceId: string): void {
  writeAll(readAll().filter((s) => s.raceId !== raceId))
}

export function toggleRaceNotification(race: RaceEvent): boolean {
  if (isRaceNotificationSubscribed(race.id)) {
    unsubscribeRaceNotification(race.id)
    return false
  }
  subscribeRaceNotification(race)
  return true
}

function updateLastKnownStatus(
  raceId: string,
  status: RegistrationStatus
): void {
  const subs = readAll()
  const next = subs.map((s) =>
    s.raceId === raceId ? { ...s, lastKnownStatus: status } : s
  )
  writeAll(next)
}

export function showRaceOpenNotification(race: RaceEvent): void {
  if (typeof window === "undefined") return

  const title = "대회 접수 시작"
  const body = `${race.name} 신청이 가능해졌습니다.`

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, {
      body,
      tag: `race-open-${race.id}`,
      icon: "/icon.svg",
    })
  }
}

/** 구독 중이던 대회 중 접수가 열린 대회 반환 */
export function detectNewlyOpenedRaces(races: RaceEvent[]): RaceEvent[] {
  const subs = readAll()
  const opened: RaceEvent[] = []

  for (const sub of subs) {
    const race = races.find((r) => r.id === sub.raceId)
    if (!race) continue

    const wasClosed = sub.lastKnownStatus === "closed"
    const nowAvailable = isRegistrationAvailable(race)

    if (wasClosed && nowAvailable) {
      opened.push(race)
    }

    if (sub.lastKnownStatus !== race.registrationStatus) {
      updateLastKnownStatus(sub.raceId, race.registrationStatus)
    }
  }

  return opened
}

export function getSubscribedRaceCount(): number {
  return readAll().length
}
