"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { embedKakaoPostcode, type AddressSearchResult } from "@/lib/kakao-postcode"
import { cn } from "@/lib/utils"

/** 다음 우편번호 embed가 결과 목록까지 보이도록 필요한 높이 */
export const POSTCODE_PANEL_HEIGHT = 500

export function AddressPostcodePanel({
  onSelect,
  className,
}: {
  onSelect: (result: AddressSearchResult) => void
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onSelectRef = useRef(onSelect)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let cancelled = false

    embedKakaoPostcode(el, (result) => {
      onSelectRef.current(result)
      toast.success("장소명·주소를 불러왔습니다")
    }).catch((err) => {
      if (!cancelled) {
        toast.error(
          err instanceof Error ? err.message : "주소 검색을 불러오지 못했습니다."
        )
      }
    })

    return () => {
      cancelled = true
      el.innerHTML = ""
    }
  }, [])

  return (
    <div className={cn("flex flex-col bg-white shrink-0", className)}>
      <div className="px-3 py-2 border-b border-border/60 shrink-0 bg-[#111811]">
        <p className="text-[11px] text-muted-foreground">
          도로명·지번·건물명 검색
        </p>
      </div>
      <div
        ref={containerRef}
        className="w-full shrink-0 overflow-hidden bg-white"
        style={{ height: POSTCODE_PANEL_HEIGHT }}
      />
    </div>
  )
}
