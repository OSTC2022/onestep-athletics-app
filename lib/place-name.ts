/** 검색어가 주소와 다르면 장소명으로 추정 (예: 「잠실 보조경기장」) */
export function suggestPlaceName(searchQuery: string, address: string): string {
  const q = searchQuery.trim()
  if (!q || q.length < 2) return ""

  const compactQ = q.replace(/\s/g, "")
  const compactA = address.replace(/\s/g, "")
  if (!compactA.includes(compactQ)) return q

  return ""
}
