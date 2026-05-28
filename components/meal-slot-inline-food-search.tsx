"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { FORM_INPUT_CLASS } from "@/lib/form-styles"
import {
  getFoodById,
  searchFoodDatabaseDetailed,
  type FoodDatabaseItem,
} from "@/lib/food-database"
import { buildDietWarningContextFromTotals, sumLoggedNutrition } from "@/lib/food-nutrition-utils"
import type { LoggedFoodEntry } from "@/lib/daily-food-log"
import type { MacroTargets } from "@/lib/user-profile"
import { cn } from "@/lib/utils"

type MealSlotInlineFoodSearchProps = {
  slotLabel: string
  targets: MacroTargets
  logEntries: LoggedFoodEntry[]
  onClose: () => void
  onSelectFood: (food: FoodDatabaseItem) => void
  className?: string
}

export function MealSlotInlineFoodSearch({
  slotLabel,
  targets,
  logEntries,
  onClose,
  onSelectFood,
  className,
}: MealSlotInlineFoodSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<FoodDatabaseItem[]>([])
  const [similarResults, setSimilarResults] = useState<FoodDatabaseItem[]>([])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const runSearch = useCallback(
    (q: string) => {
      const trimmed = q.trim()
      if (trimmed.length < 1) {
        setResults([])
        setSimilarResults([])
        setLoading(false)
        return
      }
      setLoading(true)
      const warningContext = buildDietWarningContextFromTotals(
        sumLoggedNutrition(logEntries),
        targets
      )
      const { items, similarItems } = searchFoodDatabaseDetailed(
        trimmed,
        12,
        warningContext
      )
      setResults(items)
      setSimilarResults(similarItems)
      setLoading(false)
    },
    [logEntries, targets]
  )

  useEffect(() => {
    const t = setTimeout(() => runSearch(query), 200)
    return () => clearTimeout(t)
  }, [query, runSearch])

  const displayItems = results.length > 0 ? results : similarResults
  const isSimilar = results.length === 0 && similarResults.length > 0

  return (
    <div
      className={cn(
        "rounded-lg border border-accent/30 bg-black/30 p-2 space-y-2",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium text-accent">{slotLabel}에 추가</p>
        <button
          type="button"
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/40"
          aria-label="닫기"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-accent/80" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="음식 이름 검색"
          className={cn(FORM_INPUT_CLASS, "h-8 pl-7 pr-7 text-[11px]")}
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-label="검색어 지우기"
          >
            <X className="h-3 w-3" />
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-[10px] text-muted-foreground text-center py-2 flex items-center justify-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          검색 중…
        </p>
      ) : null}

      {!loading && query.trim() && displayItems.length === 0 ? (
        <p className="text-[10px] text-muted-foreground text-center py-2">
          검색 결과가 없어요
        </p>
      ) : null}

      {!loading && displayItems.length > 0 ? (
        <div className="max-h-[140px] overflow-y-auto rounded-md border border-border/40 divide-y divide-border/30">
          {isSimilar ? (
            <p className="text-[9px] text-muted-foreground px-2 py-1 bg-secondary/20">
              비슷한 음식
            </p>
          ) : null}
          <ul>
            {displayItems.map((food) => (
              <li key={food.id}>
                <button
                  type="button"
                  onClick={() => {
                    const fresh = getFoodById(food.id) ?? food
                    onSelectFood(fresh)
                  }}
                  className="w-full px-2 py-1.5 text-left hover:bg-accent/10 transition-colors"
                >
                  <p className="text-[11px] font-medium truncate">{food.name}</p>
                  <p className="text-[9px] text-muted-foreground tabular-nums">
                    {food.category} · 100g {food.per100g.calories}kcal
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
