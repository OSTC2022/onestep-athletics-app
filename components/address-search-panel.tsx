"use client"

import { useEffect, useRef, useState } from "react"
import { Building2, Loader2, MapPin, Search, X } from "lucide-react"
import { toast } from "sonner"
import type { AddressSearchResult } from "@/lib/kakao-postcode"
import {
  buildRelatedSearchTerms,
  clientGeocodeSearch,
  mergeSearchHits,
  type AddressSearchHit,
} from "@/lib/naver-geocode-client"
import { suggestPlaceName } from "@/lib/place-name"
import { cn } from "@/lib/utils"

/** 네이버 지도 앱 검색 UI 컬러 */
const NAVER_GREEN = "#03C75A"
const NAVER_TEXT = "#222222"
const NAVER_SUBTEXT = "#939396"
const NAVER_BORDER = "#ececec"
const NAVER_HOVER = "#f5fbf7"

export type { AddressSearchHit }

async function fetchSuggest(
  query: string,
  coordinate?: { lat: number; lng: number }
): Promise<{ results: AddressSearchHit[]; related: string[] }> {
  const params = new URLSearchParams({ q: query })
  if (coordinate) {
    params.set("lat", String(coordinate.lat))
    params.set("lng", String(coordinate.lng))
  }

  const res = await fetch(`/api/geocode/suggest?${params}`)
  const data = (await res.json().catch(() => ({}))) as {
    results?: AddressSearchHit[]
    related?: string[]
    error?: string
  }

  if (!res.ok) {
    throw new Error(data.error ?? "네이버 지도 검색에 실패했습니다.")
  }

  return {
    results: data.results ?? [],
    related: data.related ?? [],
  }
}

function ResultIcon({ kind }: { kind?: "place" | "address" }) {
  const isPlace = kind === "place"
  return (
    <div
      className="shrink-0 flex items-center justify-center rounded-full"
      style={{
        width: 36,
        height: 36,
        backgroundColor: isPlace ? "#e8f9ef" : "#f2f2f2",
      }}
    >
      {isPlace ? (
        <MapPin className="h-[18px] w-[18px]" style={{ color: NAVER_GREEN }} />
      ) : (
        <Building2 className="h-[17px] w-[17px]" style={{ color: "#888" }} />
      )}
    </div>
  )
}

export function NaverAddressSearchPanel({
  onSelectHit,
  onHoverHit,
  onLeaveHit,
  disabled = false,
  autoFocus = false,
  searchCenter,
  height,
  className,
}: {
  onSelectHit: (hit: AddressSearchHit, queryHint: string) => void
  onHoverHit?: (hit: AddressSearchHit) => void
  onLeaveHit?: () => void
  disabled?: boolean
  autoFocus?: boolean
  searchCenter?: { lat: number; lng: number } | null
  height?: number
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<AddressSearchHit[]>([])
  const [relatedTerms, setRelatedTerms] = useState<string[]>([])
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [focused, setFocused] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchSeqRef = useRef(0)

  const searchCenterRef = useRef(searchCenter)
  useEffect(() => {
    searchCenterRef.current = searchCenter
  }, [searchCenter])

  const runSearch = async (q: string, showEmptyToast = false) => {
    if (!q.trim() || disabled) {
      setResults([])
      setRelatedTerms([])
      return
    }

    const seq = ++searchSeqRef.current
    setLoading(true)

    try {
      const center = searchCenterRef.current ?? undefined
      const [server, client] = await Promise.all([
        fetchSuggest(q, center ?? undefined).catch(() => ({ results: [], related: [] })),
        clientGeocodeSearch(q, center ?? undefined).catch(() => [] as AddressSearchHit[]),
      ])

      if (seq !== searchSeqRef.current) return

      const merged = mergeSearchHits(server.results, client).map((hit) => ({
        ...hit,
        name: hit.name || suggestPlaceName(q, hit.address),
      }))

      const related = [
        ...new Set([...server.related, ...buildRelatedSearchTerms(q, merged)]),
      ].slice(0, 8)

      setResults(merged)
      setRelatedTerms(related)

      if (showEmptyToast && merged.length === 0) {
        toast.message("검색 결과가 없습니다.")
      }
    } catch (err) {
      if (seq !== searchSeqRef.current) return
      if (showEmptyToast) {
        toast.error(err instanceof Error ? err.message : "네이버 지도 검색에 실패했습니다.")
      }
      setResults([])
      setRelatedTerms([])
    } finally {
      if (seq === searchSeqRef.current) setLoading(false)
    }
  }

  const onLeaveHitRef = useRef(onLeaveHit)
  useEffect(() => {
    onLeaveHitRef.current = onLeaveHit
  }, [onLeaveHit])

  useEffect(() => {
    if (autoFocus && !disabled) {
      const t = setTimeout(() => inputRef.current?.focus(), 100)
      return () => clearTimeout(t)
    }
  }, [autoFocus, disabled])

  useEffect(() => {
    if (disabled) {
      setResults([])
      setRelatedTerms([])
      setHoverIndex(null)
      return
    }

    const q = query.trim()
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (q.length < 1) {
      setResults([])
      setRelatedTerms([])
      setHoverIndex(null)
      onLeaveHitRef.current?.()
      return
    }

    debounceRef.current = setTimeout(() => {
      void runSearch(q, false)
    }, 250)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, disabled])

  const pickHit = (hit: AddressSearchHit, hint?: string) => {
    onSelectHit(hit, hint ?? query.trim())
    toast.success("장소명·주소를 불러왔습니다")
  }

  const pickRelatedTerm = (term: string) => {
    setQuery(term)
    void runSearch(term, true)
  }

  const handleHover = (hit: AddressSearchHit, index: number) => {
    setHoverIndex(index)
    onHoverHit?.(hit)
  }

  const handleLeave = () => {
    setHoverIndex(null)
    onLeaveHit?.()
  }

  const clearQuery = () => {
    setQuery("")
    setResults([])
    setRelatedTerms([])
    setHoverIndex(null)
    onLeaveHitRef.current?.()
    inputRef.current?.focus()
  }

  const showEmpty =
    !disabled && !loading && query.trim().length >= 1 && results.length === 0

  return (
    <div
      className={cn("flex flex-col bg-white shrink-0 overflow-hidden", className)}
      style={height ? { height } : undefined}
    >
      <div
        className="shrink-0 px-3 pt-3 pb-2.5 bg-white"
        style={{ borderBottom: `1px solid ${NAVER_BORDER}` }}
      >
        <div
          className={cn(
            "flex items-center gap-2 h-11 px-3 rounded-lg bg-[#f5f6f7] transition-shadow",
            focused && "bg-white ring-2 ring-[#03C75A]/30 shadow-sm"
          )}
          style={{ border: `1px solid ${focused ? NAVER_GREEN : NAVER_BORDER}` }}
        >
          <Search className="h-[18px] w-[18px] shrink-0" style={{ color: NAVER_GREEN }} />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void runSearch(query.trim(), true)
            }}
            placeholder="장소, 주소 검색"
            disabled={disabled}
            enterKeyHint="search"
            className="flex-1 min-w-0 bg-transparent text-[15px] outline-none placeholder:text-[#b0b0b0]"
            style={{ color: NAVER_TEXT }}
          />
          {loading ? (
            <Loader2
              className="h-[18px] w-[18px] shrink-0 animate-spin"
              style={{ color: NAVER_GREEN }}
            />
          ) : query ? (
            <button
              type="button"
              onClick={clearQuery}
              className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-[#ddd]"
              aria-label="검색어 지우기"
            >
              <X className="h-3 w-3 text-white" strokeWidth={3} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto bg-white">
        {disabled ? (
          <p
            className="px-4 py-8 text-center text-[13px] leading-relaxed"
            style={{ color: NAVER_SUBTEXT }}
          >
            .env.local에 NEXT_PUBLIC_NAVER_MAP_CLIENT_ID와 NAVER_MAP_API_KEY를
            설정하면 네이버 지도 검색이 작동합니다.
          </p>
        ) : (
          <>
            {relatedTerms.length > 0 && (
              <div
                className="px-3 py-2.5"
                style={{ borderBottom: `1px solid ${NAVER_BORDER}` }}
              >
                <p
                  className="text-[11px] font-medium mb-2 px-1"
                  style={{ color: NAVER_SUBTEXT }}
                >
                  연관 검색어
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {relatedTerms.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => pickRelatedTerm(term)}
                      className="rounded-full px-2.5 py-1 text-[12px] transition-colors hover:bg-[#e8f9ef]"
                      style={{
                        color: NAVER_TEXT,
                        backgroundColor: "#f5f6f7",
                        border: `1px solid ${NAVER_BORDER}`,
                      }}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && results.length === 0 ? (
              <p
                className="px-4 py-6 text-center text-[13px]"
                style={{ color: NAVER_SUBTEXT }}
              >
                검색 중…
              </p>
            ) : showEmpty ? (
              <p
                className="px-4 py-6 text-center text-[13px]"
                style={{ color: NAVER_SUBTEXT }}
              >
                검색 결과가 없습니다.
              </p>
            ) : results.length === 0 ? (
              <p
                className="px-4 py-8 text-center text-[13px] leading-relaxed whitespace-pre-line"
                style={{ color: NAVER_SUBTEXT }}
              >
                장소명, 도로명, 지번으로{"\n"}검색해 보세요.
              </p>
            ) : (
              <ul>
                {results.map((hit, index) => {
                  const title = hit.name || hit.roadAddress || hit.address
                  const isHovered = hoverIndex === index

                  return (
                    <li key={`${hit.lat}-${hit.lng}-${index}`}>
                      <button
                        type="button"
                        onClick={() => pickHit(hit)}
                        onMouseEnter={() => handleHover(hit, index)}
                        onMouseLeave={handleLeave}
                        onFocus={() => handleHover(hit, index)}
                        onBlur={handleLeave}
                        className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors"
                        style={{
                          backgroundColor: isHovered ? NAVER_HOVER : "#ffffff",
                          borderBottom: `1px solid ${NAVER_BORDER}`,
                        }}
                      >
                        <ResultIcon kind={hit.kind} />
                        <div className="min-w-0 flex-1 pt-0.5">
                          <p
                            className="text-[15px] font-semibold leading-snug truncate"
                            style={{ color: NAVER_TEXT }}
                          >
                            {title}
                          </p>
                          <p
                            className="text-[12px] leading-snug mt-0.5 line-clamp-2"
                            style={{ color: NAVER_SUBTEXT }}
                          >
                            {hit.roadAddress || hit.address}
                          </p>
                          {hit.jibunAddress &&
                          hit.jibunAddress !== (hit.roadAddress || hit.address) ? (
                            <p className="text-[11px] mt-0.5" style={{ color: "#b0b0b0" }}>
                              지번 {hit.jibunAddress}
                            </p>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/** @deprecated NaverAddressSearchPanel 사용 */
export const AddressSearchPanel = NaverAddressSearchPanel

export function hitToAddressResult(
  hit: AddressSearchHit,
  queryHint?: string
): AddressSearchResult {
  const address = hit.roadAddress || hit.address
  const name = hit.name.trim() || suggestPlaceName(queryHint ?? "", address)

  return {
    name,
    address,
    zonecode: "",
    lat: hit.lat,
    lng: hit.lng,
  }
}
