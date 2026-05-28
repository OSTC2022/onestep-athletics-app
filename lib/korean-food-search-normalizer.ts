/** 검색어 정규화 — 소문자, 공백 제거, 대소문자 무시 */
export function normalizeFoodSearchQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, "")
}

const HANGUL_RE = /[\uAC00-\uD7A3]/
const LATIN_RE = /[a-zA-Z]/

export function containsHangul(text: string): boolean {
  return HANGUL_RE.test(text)
}

export function isLatinQuery(text: string): boolean {
  return LATIN_RE.test(text) && !containsHangul(text)
}

/** 검색어를 토큰으로 분해 (공백·특수문자 기준) */
export function splitSearchTokens(rawQuery: string): string[] {
  return rawQuery
    .trim()
    .split(/[\s,/+·]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
}

/** 복합 검색어에서 알려진 음식 토큰 추출 */
export function extractFoodTokensFromQuery(
  rawQuery: string,
  knownTokens: string[]
): string[] {
  const q = normalizeFoodSearchQuery(rawQuery)
  if (q.length < 2) return []

  const sorted = [...knownTokens].sort(
    (a, b) => normalizeFoodSearchQuery(b).length - normalizeFoodSearchQuery(a).length
  )

  const found: string[] = []
  let remaining = q

  for (const token of sorted) {
    const nt = normalizeFoodSearchQuery(token)
    if (nt.length < 2) continue
    if (remaining.includes(nt)) {
      found.push(token)
      remaining = remaining.replace(nt, "")
    }
  }

  if (found.length >= 2) return found

  if (splitSearchTokens(rawQuery).length >= 2) {
    return splitSearchTokens(rawQuery)
  }

  return found
}
