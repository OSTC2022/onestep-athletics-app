/**
 * 서버 전용 Supabase service role (API routes, import script)
 * ⚠️ 클라이언트 컴포넌트에서 import 금지
 * ⚠️ Vercel env에 SUPABASE_SERVICE_ROLE_KEY 등록 시 env 값이 우선합니다
 */
export const DEFAULT_SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2end0YmJ2Z2N5c3psdnZxbHlpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTk1OTg1MywiZXhwIjoyMDk1NTM1ODUzfQ.CIcWBDINjQk7EjOZ8mu5zznHfOiPygf9EW4m-bGw0AE"
