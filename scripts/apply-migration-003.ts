/**
 * Supabase migration 003 적용 (service role REST + pg fallback)
 */
import { config } from "dotenv"
import path from "path"
import fs from "fs"
import dns from "dns"
import pg from "pg"
import { createClient } from "@supabase/supabase-js"

dns.setDefaultResultOrder("ipv6first")

config({ path: path.resolve(process.cwd(), ".env.local") })

const ref = "pvzwtbbvgcyszlvvqlyi"
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const sql = fs.readFileSync(
  path.resolve(process.cwd(), "supabase/migrations/003_food_items_public_read.sql"),
  "utf8"
)

async function verifyAnonRead(): Promise<number> {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const anon = createClient(url, anonKey, { auth: { persistSession: false } })
  const { count } = await anon
    .from("food_items")
    .select("id", { count: "exact", head: true })
  return count ?? 0
}

async function applyViaPg(): Promise<boolean> {
  const dbPassword = process.env.SUPABASE_DB_PASSWORD?.trim()
  const databaseUrl = process.env.DATABASE_URL?.trim()
  const configs: pg.ClientConfig[] = []

  if (databaseUrl) configs.push({ connectionString: databaseUrl })
  if (dbPassword) {
    configs.push({
      host: `db.${ref}.supabase.co`,
      port: 5432,
      user: "postgres",
      password: dbPassword,
      database: "postgres",
      ssl: { rejectUnauthorized: false },
    })
  }

  for (const config of configs) {
    const client = new pg.Client(config)
    try {
      await client.connect()
      await client.query(sql)
      await client.end()
      return true
    } catch (e) {
      console.log("pg apply failed:", (e as Error).message)
      try {
        await client.end()
      } catch {
        /* ignore */
      }
    }
  }
  return false
}

async function main() {
  const before = await verifyAnonRead()
  if (before > 0) {
    console.log(`anon 읽기 이미 가능 (${before}건)`)
    return
  }

  console.log("migration 003 적용 시도…")
  const applied = await applyViaPg()
  if (!applied) {
    console.log(`
자동 적용 실패. Supabase Dashboard → SQL Editor 에서 실행하세요:
  supabase/migrations/003_food_items_public_read.sql

또는 .env.local 에 DATABASE_URL 또는 SUPABASE_DB_PASSWORD 추가 후 다시 실행.
`)
    process.exit(1)
  }

  const after = await verifyAnonRead()
  console.log(`anon 읽기 OK (${after}건)`)
}

main()
