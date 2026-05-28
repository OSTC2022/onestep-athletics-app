/**
 * anon 키로 food_items 읽기 가능 여부 확인
 *
 * Usage: npx tsx scripts/apply-public-read-policy.ts
 *
 * service_role count > 0 이고 anon count === 0 이면
 * Supabase SQL Editor에서 003_food_items_public_read.sql 을 실행해야 합니다.
 */

import fs from "node:fs"
import path from "node:path"
import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"
import {
  assertSupabasePublicEnv,
  assertSupabaseServerEnv,
  isSupabasePublicConfigured,
} from "../lib/supabase-env"

config({ path: path.resolve(process.cwd(), ".env.local") })
config({ path: path.resolve(process.cwd(), ".env") })

const MIGRATION = path.resolve(
  process.cwd(),
  "supabase/migrations/003_food_items_public_read.sql"
)

async function countFoodItems(
  url: string,
  key: string
): Promise<number> {
  const client = createClient(url, key, {
    auth: { persistSession: false },
  })
  const { count, error } = await client
    .from("food_items")
    .select("id", { count: "exact", head: true })
  if (error) throw new Error(error.message)
  return count ?? 0
}

async function main() {
  console.log("=== food_items anon 읽기 점검 ===\n")

  const { url, serviceRoleKey } = assertSupabaseServerEnv()
  const adminCount = await countFoodItems(url, serviceRoleKey)
  console.log(`service_role: ${adminCount}건`)

  if (!isSupabasePublicConfigured()) {
    console.log("\nNEXT_PUBLIC_SUPABASE_* 가 없습니다.")
    process.exit(1)
  }

  const { anonKey } = assertSupabasePublicEnv()
  const anonCount = await countFoodItems(url, anonKey)
  console.log(`anon:         ${anonCount}건`)

  if (adminCount > 0 && anonCount > 0) {
    console.log("\n✓ anon 읽기 정상 — Vercel에 NEXT_PUBLIC_SUPABASE_* 만 있어도 추천 가능합니다.")
    return
  }

  if (adminCount === 0) {
    console.log("\nfood_items 데이터가 없습니다. npm run import:foods 를 먼저 실행하세요.")
    process.exit(1)
  }

  console.log(`
anon 키로 데이터를 읽을 수 없습니다 (RLS 정책 필요).

Supabase Dashboard → SQL Editor → New query 에 아래 파일 내용을 붙여넣고 Run:

  ${MIGRATION}

--- SQL 미리보기 ---
${fs.readFileSync(MIGRATION, "utf8")}
`)
  process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
