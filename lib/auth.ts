/** Supabase profiles.role 와 동일한 값 (추후 연동) */
export type UserRole = "admin" | "coach" | "athlete" | "member"

/** Supabase profiles 테이블과 1:1 매핑 예정 */
export interface AppUser {
  id: string
  name: string
  role: UserRole
  email?: string
}

export const AUTH_EVENT = "auth-updated"

const STORAGE_KEY = "one-step-coach-current-user"

/** 개발용 기본 관리자 — Supabase Auth 연동 전까지 사용 */
export const DEFAULT_CURRENT_USER: AppUser = {
  id: "local-admin",
  name: "KJ",
  role: "admin",
}

function normalizeUser(raw: unknown): AppUser | null {
  if (!raw || typeof raw !== "object") return null
  const u = raw as Partial<AppUser>
  const role = u.role
  if (
    role !== "admin" &&
    role !== "coach" &&
    role !== "athlete" &&
    role !== "member"
  ) {
    return null
  }
  if (!u.id || !u.name?.trim()) return null
  return {
    id: u.id,
    name: u.name.trim(),
    role,
    email: u.email?.trim() || undefined,
  }
}

function notifyAuthChange(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(AUTH_EVENT))
}

export function getCurrentUser(): AppUser {
  if (typeof window === "undefined") return DEFAULT_CURRENT_USER
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CURRENT_USER
    const parsed = normalizeUser(JSON.parse(raw))
    return parsed ?? DEFAULT_CURRENT_USER
  } catch {
    return DEFAULT_CURRENT_USER
  }
}

/** Supabase profiles 동기화·개발용 role 전환 시 사용 */
export function setCurrentUser(user: AppUser): AppUser {
  const normalized = normalizeUser(user)
  const next = normalized ?? DEFAULT_CURRENT_USER
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    notifyAuthChange()
  }
  return next
}

export function isAdmin(user: AppUser | null | undefined): boolean {
  return user?.role === "admin"
}
