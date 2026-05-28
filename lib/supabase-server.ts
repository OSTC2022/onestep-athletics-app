import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import {
  assertSupabaseServerEnv,
  getSupabaseServerConfigError,
  isSupabaseServerConfigured,
} from "@/lib/supabase-env"

let adminClient: SupabaseClient | null | undefined

/** @deprecated isSupabaseServerConfigured 사용 */
export function isSupabaseConfigured(): boolean {
  return isSupabaseServerConfigured()
}

export { isSupabaseServerConfigured, getSupabaseServerConfigError } from "@/lib/supabase-env"

/**
 * 서버 전용 Supabase admin 클라이언트
 * SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 만 사용합니다.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (adminClient !== undefined) return adminClient

  if (!isSupabaseServerConfigured()) {
    adminClient = null
    return null
  }

  const { url, serviceRoleKey } = assertSupabaseServerEnv()

  adminClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return adminClient
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
