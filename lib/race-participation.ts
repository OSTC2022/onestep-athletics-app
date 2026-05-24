import type { RaceEvent } from "@/lib/race-schedule"
import {
  getMemberDisplayName,
  type MemberProfile,
} from "@/lib/member-session"

export interface RaceParticipationEntry {
  raceId: string
  userId: string
  displayName: string
  joinedAt: string
}

const STORAGE_KEY = "one-step-coach-race-participations"

function readAll(): RaceParticipationEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as RaceParticipationEntry[]
  } catch {
    return []
  }
}

function writeAll(entries: RaceParticipationEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export function getRaceParticipants(raceId: string): RaceParticipationEntry[] {
  return readAll()
    .filter((e) => e.raceId === raceId)
    .sort(
      (a, b) =>
        new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
    )
}

export function isMemberParticipating(
  raceId: string,
  userId: string
): boolean {
  return readAll().some((e) => e.raceId === raceId && e.userId === userId)
}

export function joinRaceParticipation(
  race: RaceEvent,
  profile: MemberProfile
): RaceParticipationEntry {
  const entries = readAll().filter(
    (e) => !(e.raceId === race.id && e.userId === profile.userId)
  )
  const entry: RaceParticipationEntry = {
    raceId: race.id,
    userId: profile.userId,
    displayName: getMemberDisplayName(profile),
    joinedAt: new Date().toISOString(),
  }
  writeAll([...entries, entry])
  return entry
}

export function leaveRaceParticipation(raceId: string, userId: string): void {
  writeAll(
    readAll().filter((e) => !(e.raceId === raceId && e.userId === userId))
  )
}

export function toggleRaceParticipation(
  race: RaceEvent,
  profile: MemberProfile
): boolean {
  if (isMemberParticipating(race.id, profile.userId)) {
    leaveRaceParticipation(race.id, profile.userId)
    return false
  }
  joinRaceParticipation(race, profile)
  return true
}

export function formatParticipationLabel(names: string[]): string {
  if (names.length === 0) return ""
  if (names.length === 1) return `${names[0]} 참가해요♥`
  if (names.length === 2) return `${names[0]}, ${names[1]} 참가해요♥`
  return `${names[0]} 외 ${names.length - 1}명 참가해요♥`
}

export function getMyParticipatingRaceIds(userId: string): string[] {
  return readAll()
    .filter((e) => e.userId === userId)
    .map((e) => e.raceId)
}
