/**
 * Supabase 프로젝트 공개 설정 (브라우저 노출 가능)
 * Vercel 등 env 미설정 배포에서도 추천·검색 API가 동작하도록 기본값으로 사용합니다.
 * RLS 정책(003_food_items_public_read.sql)으로 anon 읽기만 허용됩니다.
 */
export const DEFAULT_SUPABASE_URL =
  "https://pvzwtbbvgcyszlvvqlyi.supabase.co"

export const DEFAULT_SUPABASE_ANON_KEY =
  "sb_publishable_4GeAVGDLPXiqviVSiihOcw_W16qZaQR"
