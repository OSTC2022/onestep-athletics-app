"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { PROFILE_INCOMPLETE_MESSAGE } from "@/lib/diet-coaching"

export const PROFILE_DETAIL_HREF = "/settings?section=detail"

export function ProfileIncompleteBanner({
  message = PROFILE_INCOMPLETE_MESSAGE,
}: {
  message?: string | null
}) {
  if (!message) return null

  return (
    <Link
      href={PROFILE_DETAIL_HREF}
      className="block rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 hover:bg-amber-500/15 active:bg-amber-500/20 transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] leading-relaxed text-amber-200/90">
          {message}
        </p>
        <ChevronRight className="h-4 w-4 shrink-0 text-amber-300/80" />
      </div>
    </Link>
  )
}
