/**
 * 공식 식품영양성분 CSV → Supabase food_items / food_aliases import
 *
 * Usage:
 *   npm run import:foods
 *   npm run import:foods:dry-run
 *   npx tsx scripts/import-foods.ts --file foods --limit 100
 *   npx tsx scripts/import-foods.ts --batch-size 300
 *
 * CSV (CP949):
 *   data/raw-foods/foods.csv
 *   data/raw-foods/processed_foods.csv
 *
 * Requires .env.local (서버 전용):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import path from "node:path"
import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"
import {
  readMfdsCsvFile,
  transformMfdsCsvRows,
  type MfdsCsvKind,
  type MfdsFoodAliasRecord,
  type MfdsFoodItemRecord,
} from "../lib/mfds-food-csv"
import { assessNutritionDataQuality } from "../lib/food-nutrition-quality"
import { assertSupabaseServerEnv } from "../lib/supabase-env"

config({ path: path.resolve(process.cwd(), ".env.local") })
config({ path: path.resolve(process.cwd(), ".env") })

type ImportFile = "foods" | "processed_foods" | "all"

const FILE_PATHS: Record<Exclude<ImportFile, "all">, string> = {
  foods: path.resolve(process.cwd(), "data/raw-foods/foods.csv"),
  processed_foods: path.resolve(
    process.cwd(),
    "data/raw-foods/processed_foods.csv"
  ),
}

function parseArgs(argv: string[]) {
  const args = new Set(argv)
  const getValue = (flag: string, fallback: string) => {
    const index = argv.indexOf(flag)
    if (index === -1 || index === argv.length - 1) return fallback
    return argv[index + 1] ?? fallback
  }

  return {
    dryRun: args.has("--dry-run"),
    file: getValue("--file", "all") as ImportFile,
    limit: Math.max(0, Number(getValue("--limit", "0")) || 0),
    batchSize: Math.min(
      Math.max(Number(getValue("--batch-size", "400")) || 400, 50),
      1000
    ),
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size))
  }
  return batches
}

function loadCsvData(file: ImportFile, limit: number) {
  const sources: Array<{ kind: MfdsCsvKind; filePath: string }> = []

  if (file === "all" || file === "foods") {
    sources.push({ kind: "foods", filePath: FILE_PATHS.foods })
  }
  if (file === "all" || file === "processed_foods") {
    sources.push({
      kind: "processed_foods",
      filePath: FILE_PATHS.processed_foods,
    })
  }

  let items: MfdsFoodItemRecord[] = []
  let aliases: MfdsFoodAliasRecord[] = []

  for (const source of sources) {
    console.log(`Reading ${source.filePath} ...`)
    const rows = readMfdsCsvFile(source.filePath)
    const transformed = transformMfdsCsvRows(rows, source.kind)
    items = items.concat(transformed.items)
    aliases = aliases.concat(transformed.aliases)
    console.log(
      `  rows=${rows.length}, items=${transformed.items.length}, aliases=${transformed.aliases.length}`
    )
  }

  if (limit > 0) {
    items = items.slice(0, limit)
    const allowedIds = new Set(items.map((item) => item.id))
    aliases = aliases.filter((alias) => allowedIds.has(alias.food_item_id))
  }

  return { items, aliases }
}

/** onConflict: official_code — 영양성분 필드가 더 채워진 row 우선, 동점이면 마지막 row */
function scoreNutritionCompleteness(item: MfdsFoodItemRecord): number {
  const p = item.per100g
  const values = [
    p.calories,
    p.carbsG,
    p.proteinG,
    p.fatG,
    p.sodiumMg,
    p.sugarG,
    p.fiberG,
    p.saturatedFatG,
  ]
  return values.filter((v) => v != null).length
}

function enrichItemMetadata(item: MfdsFoodItemRecord): MfdsFoodItemRecord {
  const assessment = assessNutritionDataQuality(item.per100g, item.name_ko, item.category)
  return {
    ...item,
    metadata: {
      ...item.metadata,
      nutritionDataQuality: assessment.quality,
      nutritionQualityReasons: assessment.reasons,
    },
  }
}

function pickRicherFoodItem(
  existing: MfdsFoodItemRecord,
  candidate: MfdsFoodItemRecord
): MfdsFoodItemRecord {
  const existingScore = scoreNutritionCompleteness(existing)
  const candidateScore = scoreNutritionCompleteness(candidate)
  if (candidateScore > existingScore) return candidate
  if (candidateScore < existingScore) return existing
  return candidate
}

/** 전체 배열 dedupe — upsert onConflict: official_code */
function dedupeFoodItems(items: MfdsFoodItemRecord[]): MfdsFoodItemRecord[] {
  const byOfficialCode = new Map<string, MfdsFoodItemRecord>()

  for (const item of items) {
    const key = item.official_code
    const prev = byOfficialCode.get(key)
    byOfficialCode.set(key, prev ? pickRicherFoodItem(prev, item) : item)
  }

  return [...byOfficialCode.values()]
}

/** 전체 배열 dedupe — upsert onConflict: food_item_id,normalized_alias */
function dedupeFoodAliases(
  aliases: MfdsFoodAliasRecord[],
  allowedFoodItemIds?: Set<string>
): MfdsFoodAliasRecord[] {
  const byKey = new Map<string, MfdsFoodAliasRecord>()

  for (const alias of aliases) {
    if (allowedFoodItemIds && !allowedFoodItemIds.has(alias.food_item_id)) {
      continue
    }
    const key = `${alias.food_item_id}\0${alias.normalized_alias}`
    byKey.set(key, alias)
  }

  return [...byKey.values()]
}

function logDedupeStats(
  label: string,
  before: number,
  after: number
): void {
  console.log(`  ${label} before dedupe: ${before}`)
  console.log(`  ${label} after dedupe: ${after}`)
  console.log(`  duplicated ${label} removed: ${before - after}`)
}

async function upsertFoodItems(
  supabase: ReturnType<typeof createClient>,
  items: MfdsFoodItemRecord[],
  batchSize: number
) {
  const now = new Date().toISOString()
  let upserted = 0

  for (const batch of chunk(items, batchSize)) {
    const { error } = await supabase.from("food_items").upsert(
      batch.map((item) => {
        const enriched = enrichItemMetadata(item)
        return { ...enriched, updated_at: now }
      }),
      { onConflict: "official_code" }
    )

    if (error) {
      throw new Error(`food_items upsert failed: ${error.message}`)
    }

    upserted += batch.length
    console.log(`  food_items upserted: ${upserted}/${items.length}`)
  }
}

async function upsertFoodAliases(
  supabase: ReturnType<typeof createClient>,
  aliases: MfdsFoodAliasRecord[],
  batchSize: number
) {
  let upserted = 0

  for (const batch of chunk(aliases, batchSize)) {
    const { error } = await supabase
      .from("food_aliases")
      .upsert(batch, { onConflict: "food_item_id,normalized_alias" })

    if (error) {
      throw new Error(`food_aliases upsert failed: ${error.message}`)
    }

    upserted += batch.length
    console.log(`  food_aliases upserted: ${upserted}/${aliases.length}`)
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const loaded = loadCsvData(options.file, options.limit)

  const itemsBefore = loaded.items.length
  const items = dedupeFoodItems(loaded.items)
  const itemsAfter = items.length

  const allowedFoodItemIds = new Set(items.map((item) => item.id))
  const aliasesBefore = loaded.aliases.length
  const aliases = dedupeFoodAliases(loaded.aliases, allowedFoodItemIds)
  const aliasesAfter = aliases.length

  console.log("\nImport summary")
  console.log(`  file=${options.file}`)
  console.log(`  batchSize=${options.batchSize}`)
  logDedupeStats("food_items", itemsBefore, itemsAfter)
  logDedupeStats("food_aliases", aliasesBefore, aliasesAfter)

  const qualityCounts = items.reduce(
    (acc, item) => {
      const q = assessNutritionDataQuality(item.per100g, item.name_ko, item.category).quality
      acc[q] = (acc[q] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )
  console.log("  nutrition data quality:", qualityCounts)

  if (items.length === 0) {
    console.log("No rows to import.")
    return
  }

  if (options.dryRun) {
    console.log("\n[dry-run] Sample item:")
    console.log(JSON.stringify(items[0], null, 2))
    console.log("\n[dry-run] Sample aliases:")
    console.log(
      aliases
        .filter((alias) => alias.food_item_id === items[0].id)
        .slice(0, 5)
    )
    console.log("\n[dry-run] Done — no Supabase writes.")
    return
  }

  const { url, serviceRoleKey } = assertSupabaseServerEnv()

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log("\nUpserting food_items ...")
  await upsertFoodItems(supabase, items, options.batchSize)

  console.log("\nUpserting food_aliases ...")
  await upsertFoodAliases(supabase, aliases, options.batchSize)

  console.log("\nImport completed.")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
