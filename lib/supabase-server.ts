import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import {
  assertSupabasePublicEnv,
  getSupabaseServerConfigError,
  isSupabasePublicConfigured,
  isSupabaseReadConfigured,
  resolveSupabaseServerUrl,
} from "@/lib/supabase-env"
import { DEFAULT_SUPABASE_SERVICE_ROLE_KEY } from "@/lib/supabase-server-defaults"

let adminClient: SupabaseClient | null | undefined
let readClient: SupabaseClient | null | undefined

function resolveServiceRoleKey(): string | undefined {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    DEFAULT_SUPABASE_SERVICE_ROLE_KEY
  )
}

/** @deprecated isSupabaseReadConfigured 사용 */
export function isSupabaseConfigured(): boolean {
  return isSupabaseReadConfigured()
}

export function isSupabaseServerConfigured(): boolean {
  return Boolean(resolveSupabaseServerUrl() && resolveServiceRoleKey())
}

export {
  isSupabaseReadConfigured,
  getSupabaseServerConfigError,
} from "@/lib/supabase-env"

/**
 * 서버 전용 Supabase admin 클라이언트 (쓰기·캐시 저장)
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (adminClient !== undefined) return adminClient

  const url = resolveSupabaseServerUrl()
  const serviceRoleKey = resolveServiceRoleKey()
  if (!url || !serviceRoleKey) {
    adminClient = null
    return null
  }

  adminClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return adminClient
}

/**
 * food_items 등 읽기용 클라이언트
 * service role 우선, 없으면 anon key (NEXT_PUBLIC_*)
 */
export function getSupabaseReadClient(): SupabaseClient | null {
  if (readClient !== undefined) return readClient

  const admin = getSupabaseAdmin()
  if (admin) {
    readClient = admin
    return readClient
  }

  if (!isSupabasePublicConfigured()) {
    readClient = null
    return null
  }

  const { url, anonKey } = assertSupabasePublicEnv()
  readClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return readClient
}

/** admin 클라이언트가 필요한 서버 코드용 — 미설정 시 throw */
export function getSupabaseAdminOrThrow(): SupabaseClient {
  const client = getSupabaseAdmin()
  if (!client) {
    throw new Error(
      getSupabaseServerConfigError() ??
        "Supabase 서버 환경변수가 설정되지 않았습니다."
    )
  }
  return client
}
