import type { AppUser } from "@/lib/auth"

/** 훈련 스케줄 추가·수정·삭제·복사·완료 처리 (현재 admin 전용) */
export function canManageTraining(user: AppUser | null | undefined): boolean {
  return user?.role === "admin"
}

/** canManageTraining 과 동일 — 편집 페이지·폼 접근 */
export function canEditTraining(user: AppUser | null | undefined): boolean {
  return canManageTraining(user)
}

export function canDeleteTraining(user: AppUser | null | undefined): boolean {
  return canManageTraining(user)
}

export function canCompleteTraining(user: AppUser | null | undefined): boolean {
  return canManageTraining(user)
}

export function canCopyTraining(user: AppUser | null | undefined): boolean {
  return canManageTraining(user)
}
