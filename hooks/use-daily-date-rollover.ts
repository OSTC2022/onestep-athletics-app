"use client"

import { useEffect, useState } from "react"
import {
  DAILY_DATE_CHANGED_EVENT,
  getTodayDateKey,
  msUntilNextLocalMidnight,
} from "@/lib/daily-date"
import { DAILY_FOOD_LOG_EVENT } from "@/lib/daily-food-log"
import { NUTRITION_EVENT } from "@/lib/nutrition"
import { useHydrated } from "@/hooks/use-hydrated"

function notifyDailyDateRollover(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(DAILY_DATE_CHANGED_EVENT))
  window.dispatchEvent(new CustomEvent(DAILY_FOOD_LOG_EVENT))
  window.dispatchEvent(new CustomEvent(NUTRITION_EVENT))
}

/** 자정·탭 복귀 시 날짜 변경을 감지하고 일일 기록 UI를 갱신합니다. */
export function useDailyDateRollover(): string {
  const hydrated = useHydrated()
  const [dateKey, setDateKey] = useState(() => getTodayDateKey())

  useEffect(() => {
    if (!hydrated) return

    const sync = () => {
      const next = getTodayDateKey()
      setDateKey((prev) => {
        if (prev !== next) {
          notifyDailyDateRollover()
          return next
        }
        return prev
      })
    }

    sync()

    let timer = window.setTimeout(function scheduleNext() {
      sync()
      timer = window.setTimeout(scheduleNext, msUntilNextLocalMidnight())
    }, msUntilNextLocalMidnight())

    const onVisible = () => {
      if (document.visibilityState === "visible") sync()
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      window.clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [hydrated])

  return dateKey
}
