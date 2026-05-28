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

function missingVars(names: string[]): string {
  return names.join(", ")
}

export function isSupabaseServerConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  )
}

export function getSupabaseServerConfigError(): string | null {
  const missing: string[] = []
  if (!process.env.SUPABASE_URL?.trim()) missing.push("SUPABASE_URL")
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY")
  }
  if (missing.length === 0) return null
  return `Supabase 서버 설정이 필요합니다. .env.local에 ${missingVars(missing)}을(를) 추가하세요. (service role key는 서버 전용)`
}

export function assertSupabaseServerEnv(): {
  url: string
  serviceRoleKey: string
} {
  const url = process.env.SUPABASE_URL?.trim()
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
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  )
}

export function getSupabasePublicConfigError(): string | null {
  const missing: string[] = []
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL")
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }
  if (missing.length === 0) return null
  return `Supabase 클라이언트 설정이 필요합니다. .env.local에 ${missingVars(missing)}을(를) 추가하세요. (anon key는 Dashboard → Project Settings → API → anon public)`
}

export function assertSupabasePublicEnv(): {
  url: string
  anonKey: string
} {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!url || !anonKey) {
    throw new Error(
      getSupabasePublicConfigError() ??
        "Supabase 클라이언트 환경변수가 설정되지 않았습니다."
    )
  }

  return { url, anonKey }
}
