/**
 * Supabase 환경변수 — 서버 / 클라이언트 분리
 *
 * 서버 (API routes, import script):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * 클라이언트 (브라우저):
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * ⚠️ SUPABASE_SERVICE_ROLE_KEY 에 NEXT_PUBLIC_ 접두사를 붙이지 마세요.
 */

import {
  DEFAULT_SUPABASE_ANON_KEY,
  DEFAULT_SUPABASE_URL,
} from "@/lib/supabase-defaults"

function missingVars(names: string[]): string {
  return names.join(", ")
}

/** 사용자에게 보여줄 안내 (배포·로컬 공통) */
export const SUPABASE_RECOMMENDATION_USER_MESSAGE =
  "추천 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요."

export const SUPABASE_SEARCH_USER_MESSAGE =
  "공식 음식 검색을 일시적으로 사용할 수 없어요. 직접 추가하거나 잠시 후 다시 시도해 주세요."

export function getSupabaseServerUserMessage(): string {
  return SUPABASE_RECOMMENDATION_USER_MESSAGE
}

/** 서버 로그·운영자용 (사용자 UI에 노출하지 않음) */
export function resolveSupabaseServerUrl(): string | undefined {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    DEFAULT_SUPABASE_URL
  )
}

export function resolveSupabasePublicUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL
}

export function resolveSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    DEFAULT_SUPABASE_ANON_KEY
  )
}

export function isSupabaseServerConfigured(): boolean {
  return Boolean(
    resolveSupabaseServerUrl() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  )
}

export function getSupabaseServerConfigError(): string | null {
  const missing: string[] = []
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY")
  }
  if (missing.length === 0) return null
  return `[Supabase server] Missing env: ${missingVars(missing)}. Set in .env.local (dev) or Vercel Environment Variables (production). Do not use NEXT_PUBLIC_ for SERVICE_ROLE_KEY.`
}

export function assertSupabaseServerEnv(): {
  url: string
  serviceRoleKey: string
} {
  const url = resolveSupabaseServerUrl()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!url || !serviceRoleKey) {
    throw new Error(
      getSupabaseServerConfigError() ??
        "Supabase 서버 환경변수가 설정되지 않았습니다."
    )
  }

  return { url, serviceRoleKey }
}

export function isSupabasePublicConfigured(): boolean {
  return Boolean(resolveSupabasePublicUrl() && resolveSupabaseAnonKey())
}

/** food_items 읽기 — service role 또는 anon(public) 키·기본값 */
export function isSupabaseReadConfigured(): boolean {
  return isSupabaseServerConfigured() || isSupabasePublicConfigured()
}

export function getSupabasePublicConfigError(): string | null {
  return null
}

export function assertSupabasePublicEnv(): {
  url: string
  anonKey: string
} {
  const url = resolveSupabasePublicUrl()
  const anonKey = resolveSupabaseAnonKey()

  if (!url || !anonKey) {
    throw new Error("Supabase 클라이언트 환경변수가 설정되지 않았습니다.")
  }

  return { url, anonKey }
}
