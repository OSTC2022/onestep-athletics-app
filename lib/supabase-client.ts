import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import {
  assertSupabasePublicEnv,
  isSupabasePublicConfigured,
} from "@/lib/supabase-env"

let browserClient: SupabaseClient | null | undefined

/** 브라우저용 Supabase 클라이언트 설정 여부 */
export function isSupabaseBrowserConfigured(): boolean {
  return isSupabasePublicConfigured()
}

/**
 * 브라우저용 Supabase 클라이언트
 * NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY 만 사용합니다.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient

  const { url, anonKey } = assertSupabasePublicEnv()

  browserClient = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  })
  return browserClient
}
