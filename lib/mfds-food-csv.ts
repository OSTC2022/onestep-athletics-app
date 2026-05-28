import fs from "node:fs"
import iconv from "iconv-lite"
import { parse } from "csv-parse/sync"
import type { FoodNutritionPer100g } from "@/lib/food-database"
import { normalizeFoodSearchQuery } from "@/lib/korean-food-search-normalizer"

export type MfdsCsvKind = "foods" | "processed_foods"

export type MfdsFoodCsvRow = Record<string, string>

export type MfdsFoodItemRecord = {
  id: string
  official_code: string
  name_ko: string
  normalized_name: string
  name_en: null
  category: string
  representative_name: string | null
  data_type: string
  data_source: "mfds"
  serving_label: string
  piece_weight_g: number
  serving_reference_raw: string | null
  food_weight_raw: string | null
  per100g: FoodNutritionPer100g
  metadata: Record<string, string | null>
}

export type MfdsFoodAliasRecord = {
  food_item_id: string
  alias: string
  normalized_alias: string
  alias_type: string
}

const NONE_VALUES = new Set(["", "해당없음", "-", "null", "NULL"])

const FOODS_SERVING_COLUMN = "1인(회)분량 참고량"
const PROCESSED_SERVING_COLUMN = "1회 섭취참고량"

export function readMfdsCsvFile(
  filePath: string,
  encoding: BufferEncoding | "cp949" = "cp949"
): MfdsFoodCsvRow[] {
  const buffer = fs.readFileSync(filePath)
  const text =
    encoding === "cp949"
      ? iconv.decode(buffer, "cp949")
      : buffer.toString(encoding)

  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  }) as MfdsFoodCsvRow[]
}

function parseNumber(value: string | undefined | null): number {
  if (value == null) return 0
  const trimmed = value.trim()
  if (!trimmed || NONE_VALUES.has(trimmed)) return 0
  const n = Number(trimmed.replace(/,/g, ""))
  return Number.isFinite(n) ? n : 0
}

function cleanText(value: string | undefined | null): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  if (!trimmed || NONE_VALUES.has(trimmed)) return null
  return trimmed
}

export function parseServingGrams(raw: string | null | undefined): number | null {
  const text = cleanText(raw)
  if (!text) return null

  const match = text.match(/([\d.]+)\s*(g|ml|그램|mL|ML)/i)
  if (match) {
    const grams = Number(match[1])
    return Number.isFinite(grams) && grams > 0 ? Math.round(grams) : null
  }

  const digits = text.match(/([\d.]+)/)
  if (!digits) return null
  const grams = Number(digits[1])
  return Number.isFinite(grams) && grams > 0 ? Math.round(grams) : null
}

function pickCategory(row: MfdsFoodCsvRow): string {
  const candidates = [
    row["식품중분류명"],
    row["식품소분류명"],
    row["식품세분류명"],
    row["대표식품명"],
    row["식품대분류명"],
  ]

  for (const value of candidates) {
    const cleaned = cleanText(value)
    if (cleaned) return cleaned
  }

  return "식품"
}

function buildPer100g(row: MfdsFoodCsvRow): FoodNutritionPer100g {
  const per100g: FoodNutritionPer100g = {
    calories: parseNumber(row["에너지(kcal)"]),
    carbsG: parseNumber(row["탄수화물(g)"]),
    proteinG: parseNumber(row["단백질(g)"]),
    fatG: parseNumber(row["지방(g)"]),
    sodiumMg: parseNumber(row["나트륨(mg)"]),
  }

  const sugarG = parseNumber(row["당류(g)"])
  const fiberG = parseNumber(row["식이섬유(g)"])
  const saturatedFatG = parseNumber(row["포화지방산(g)"])

  if (sugarG > 0) per100g.sugarG = sugarG
  if (fiberG > 0) per100g.fiberG = fiberG
  if (saturatedFatG > 0) per100g.saturatedFatG = saturatedFatG

  return per100g
}

function buildMetadata(row: MfdsFoodCsvRow, kind: MfdsCsvKind): Record<string, string | null> {
  const common = {
    csvKind: kind,
    dataTypeCode: cleanText(row["데이터구분코드"]),
    dataTypeName: cleanText(row["데이터구분명"]),
    originCode: cleanText(row["식품기원코드"]),
    originName: cleanText(row["식품기원명"]),
    majorCategoryCode: cleanText(row["식품대분류코드"]),
    majorCategoryName: cleanText(row["식품대분류명"]),
    representativeCode: cleanText(row["대표식품코드"]),
    representativeName: cleanText(row["대표식품명"]),
    middleCategoryCode: cleanText(row["식품중분류코드"]),
    middleCategoryName: cleanText(row["식품중분류명"]),
    smallCategoryCode: cleanText(row["식품소분류코드"]),
    smallCategoryName: cleanText(row["식품소분류명"]),
    detailCategoryCode: cleanText(row["식품세분류코드"]),
    detailCategoryName: cleanText(row["식품세분류명"]),
    nutrientBasis: cleanText(row["영양성분함량기준량"]),
    providerCode: cleanText(row["제공기관코드"]),
    providerName: cleanText(row["제공기관명"]),
    dataCreatedAt: cleanText(row["데이터생성일자"]),
    dataBaseDate: cleanText(row["데이터기준일자"]),
  }

  if (kind === "foods") {
    return {
      ...common,
      companyName: cleanText(row["업체명"]),
    }
  }

  return {
    ...common,
    manufacturerName: cleanText(row["제조사명"]),
    importerName: cleanText(row["수입업체명"]),
    distributorName: cleanText(row["유통업체명"]),
    importFlag: cleanText(row["수입여부"]),
    originCountryCode: cleanText(row["원산지국코드"]),
    originCountryName: cleanText(row["원산지국명"]),
  }
}

function getServingColumn(kind: MfdsCsvKind): string {
  return kind === "foods" ? FOODS_SERVING_COLUMN : PROCESSED_SERVING_COLUMN
}

export function mfdsRowToFoodItem(
  row: MfdsFoodCsvRow,
  kind: MfdsCsvKind
): MfdsFoodItemRecord | null {
  const officialCode = cleanText(row["식품코드"])
  const nameKo = cleanText(row["식품명"])
  if (!officialCode || !nameKo) return null

  const servingColumn = getServingColumn(kind)
  const servingReferenceRaw = cleanText(row[servingColumn])
  const foodWeightRaw = cleanText(row["식품중량"])
  const pieceWeightG =
    parseServingGrams(servingReferenceRaw) ??
    parseServingGrams(foodWeightRaw) ??
    100

  const representativeName = cleanText(row["대표식품명"])

  return {
    id: `mfds:${officialCode}`,
    official_code: officialCode,
    name_ko: nameKo,
    normalized_name: normalizeFoodSearchQuery(nameKo),
    name_en: null,
    category: pickCategory(row),
    representative_name: representativeName,
    data_type: cleanText(row["데이터구분코드"]) ?? (kind === "foods" ? "D" : "P"),
    data_source: "mfds",
    serving_label: "1회",
    piece_weight_g: pieceWeightG,
    serving_reference_raw: servingReferenceRaw,
    food_weight_raw: foodWeightRaw,
    per100g: buildPer100g(row),
    metadata: buildMetadata(row, kind),
  }
}

export function buildMfdsAliases(
  item: Pick<MfdsFoodItemRecord, "id" | "name_ko" | "representative_name">
): MfdsFoodAliasRecord[] {
  const aliases: MfdsFoodAliasRecord[] = []
  const seen = new Set<string>([normalizeFoodSearchQuery(item.name_ko)])

  const add = (alias: string, aliasType: string) => {
    const trimmed = alias.trim()
    if (trimmed.length < 2) return
    const normalized = normalizeFoodSearchQuery(trimmed)
    if (normalized.length < 2 || seen.has(normalized)) return
    seen.add(normalized)
    aliases.push({
      food_item_id: item.id,
      alias: trimmed,
      normalized_alias: normalized,
      alias_type: aliasType,
    })
  }

  if (item.representative_name && item.representative_name !== item.name_ko) {
    add(item.representative_name, "representative")
  }

  const underscoreIndex = item.name_ko.indexOf("_")
  if (underscoreIndex > 0 && underscoreIndex < item.name_ko.length - 1) {
    add(item.name_ko.slice(0, underscoreIndex), "prefix")
    add(item.name_ko.slice(underscoreIndex + 1), "short")
  }

  const withoutSizeSuffix = item.name_ko
    .replace(/\s*[\(\（][^)\）]*[\)\）]\s*$/g, "")
    .trim()
  if (withoutSizeSuffix !== item.name_ko) {
    add(withoutSizeSuffix, "cleaned")
  }

  const withoutPrefix = item.name_ko.replace(/^[^_]+_/, "").trim()
  if (withoutPrefix !== item.name_ko) {
    add(withoutPrefix, "cleaned")
  }

  return aliases
}

export function transformMfdsCsvRows(
  rows: MfdsFoodCsvRow[],
  kind: MfdsCsvKind
): { items: MfdsFoodItemRecord[]; aliases: MfdsFoodAliasRecord[] } {
  const items: MfdsFoodItemRecord[] = []
  const aliases: MfdsFoodAliasRecord[] = []

  for (const row of rows) {
    const item = mfdsRowToFoodItem(row, kind)
    if (!item) continue
    items.push(item)
    aliases.push(...buildMfdsAliases(item))
  }

  return { items, aliases }
}

/** 앱 FoodDatabaseItem 형식으로 변환 (API 응답용) */
export function mfdsItemToFoodDatabaseItem(item: MfdsFoodItemRecord) {
  return {
    id: item.id,
    name: item.name_ko,
    category: item.category,
    pieceWeightG: item.piece_weight_g,
    servingGrams: item.piece_weight_g,
    servingLabel: item.serving_label,
    per100g: item.per100g,
    isExternal: false as const,
  }
}
