/**
 * .env.local 의 Supabase 변수를 Vercel Production/Preview에 등록합니다.
 *
 * 방법 1 (CLI): npx vercel login && npx vercel link && npm run sync:vercel-env
 * 방법 2 (API): .env.local 에 VERCEL_TOKEN 추가 후 npm run sync:vercel-env
 */

import { config } from "dotenv"
import { spawnSync } from "node:child_process"
import path from "node:path"

config({ path: path.resolve(process.cwd(), ".env.local") })

const PROJECT = process.env.VERCEL_PROJECT_NAME?.trim() || "onestep-athletics-app"
const TEAM_ID = process.env.VERCEL_TEAM_ID?.trim()

const KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "FOOD_DATA_CENTRAL_API_KEY",
] as const

type Target = "production" | "preview" | "development"

function addViaCli(name: string, value: string, target: Target) {
  const result = spawnSync(
    "npx",
    ["vercel", "env", "add", name, target, "--force"],
    {
      input: value,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
    }
  )
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "vercel cli failed")
  }
}

async function addViaApi(name: string, value: string, target: Target) {
  const token = process.env.VERCEL_TOKEN?.trim()
  if (!token) throw new Error("VERCEL_TOKEN missing")

  const teamQuery = TEAM_ID ? `?teamId=${TEAM_ID}` : ""
  const res = await fetch(
    `https://api.vercel.com/v10/projects/${PROJECT}/env${teamQuery}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key: name,
        value,
        type: "encrypted",
        target: [target],
      }),
    }
  )

  if (!res.ok) {
    throw new Error(`${name} (${target}): ${res.status} ${await res.text()}`)
  }
}

async function syncKey(name: string, value: string, useApi: boolean) {
  for (const target of ["production", "preview"] as const) {
    if (useApi) {
      await addViaApi(name, value, target)
    } else {
      addViaCli(name, value, target)
    }
    console.log(`✓ ${name} → ${target}`)
  }
}

async function main() {
  const useApi = Boolean(process.env.VERCEL_TOKEN?.trim())
  console.log(
    useApi
      ? `Vercel API sync (${PROJECT})…`
      : "Vercel CLI sync… (VERCEL_TOKEN 있으면 API 사용)"
  )

  for (const key of KEYS) {
    const value = process.env[key]?.trim()
    if (!value) {
      console.log(`- ${key} (skip)`)
      continue
    }
    await syncKey(key, value, useApi)
  }

  console.log("\n완료 → Vercel Deployments에서 Redeploy 하세요.")
}

main().catch((err) => {
  console.error((err as Error).message)
  console.error(`
다음 중 하나를 실행하세요:
  1) npx vercel login && npx vercel link && npm run sync:vercel-env
  2) Vercel → Account → Tokens 에서 VERCEL_TOKEN 발급 → .env.local 추가 → npm run sync:vercel-env
  3) Vercel Dashboard → Settings → Environment Variables 에 수동 등록
`)
  process.exit(1)
})
