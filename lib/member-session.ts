export interface MemberProfile {
  userId: string
  name: string
  nickname?: string
  loggedInAt: string
}

const STORAGE_KEY = "one-step-coach-member-session"

function readSession(): MemberProfile | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as MemberProfile
    if (!parsed.userId || !parsed.name?.trim()) return null
    return parsed
  } catch {
    return null
  }
}

function writeSession(profile: MemberProfile | null): void {
  if (typeof window === "undefined") return
  if (profile) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function getMemberSession(): MemberProfile | null {
  return readSession()
}

export function getMemberDisplayName(profile: MemberProfile): string {
  const nickname = profile.nickname?.trim()
  if (nickname) return nickname
  return profile.name.trim()
}

export function loginMember(name: string, nickname?: string): MemberProfile {
  const trimmedName = name.trim()
  const trimmedNickname = nickname?.trim()
  const profile: MemberProfile = {
    userId: crypto.randomUUID(),
    name: trimmedName,
    nickname: trimmedNickname || undefined,
    loggedInAt: new Date().toISOString(),
  }
  writeSession(profile)
  return profile
}

export function logoutMember(): void {
  writeSession(null)
}

export function isMemberLoggedIn(): boolean {
  return getMemberSession() != null
}
