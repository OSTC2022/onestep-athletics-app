"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  buildFocusPanelMeta,
  buildQualityJudgmentTags,
  focusFromJudgmentKind,
  focusToApiParam,
  getFocusedCombos,
  getFocusedFoodItems,
  type DietQualityFocus,
  type QualityFocusKind,
  type QualityJudgmentTag,
} from "@/lib/diet-quality-recommendations"
import {
  fetchDietQualityEvaluation,
  loadRecentRecommendationIds,
  loadRecentRecommendedFoodIds,
  loadStrategySettings,
  recommendItemToFoodDatabaseItem,
  saveRecentRecommendationIds,
  saveRecentRecommendedFoodIds,
} from "@/lib/food-recommendation-client"
import {
  hasTrainingToday,
  mealTimingToContext,
  trainingStatusToIntensity,
} from "@/lib/food-recommendation-strategy"
import type { LoggedFoodEntry } from "@/lib/daily-food-log"
import type { LoggedNutrition } from "@/lib/food-nutrition-utils"
import type {
  DietQualityEvaluationResponse,
  RecommendFoodCombo,
} from "@/lib/food-recommendation-types"
import { buildMealSlotAddPreviews } from "@/lib/meal-slot-add-preview"
import { buildMealSlotTargets, type FoodMealSlotId } from "@/lib/meal-slot-targets"
import type { MacroTargets } from "@/lib/user-profile"
import { MealSlotApplyDialog } from "@/components/meal-slot-apply-dialog"
import { cn } from "@/lib/utils"

function JudgmentChip({
  tag,
  active,
  onClick,
}: {
  tag: QualityJudgmentTag
  active: boolean
  onClick?: () => void
}) {
  const className = cn(
    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
    tag.tone === "ok" && "border-accent/40 bg-accent/10 text-accent",
    tag.tone === "warn" && "border-amber-500/40 bg-amber-500/10 text-amber-400",
    tag.tone === "caution" &&
      "border-orange-500/35 bg-orange-500/10 text-orange-300",
    tag.tone === "neutral" && "border-border/60 bg-secondary/30 text-muted-foreground",
    tag.actionable && "cursor-pointer hover:brightness-125",
    active && "ring-1 ring-accent/50 bg-accent/20"
  )

  if (tag.actionable && onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {tag.label}
      </button>
    )
  }

  return <span className={className}>{tag.label}</span>
}

function FocusFoodPickerDialog({
  open,
  onOpenChange,
  meta,
  foodItems,
  loading,
  onRefresh,
  onPickItem,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  meta: NonNullable<ReturnType<typeof buildFocusPanelMeta>>
  foodItems: ReturnType<typeof getFocusedFoodItems>
  loading: boolean
  onRefresh: () => void
  onPickItem: (
    item: RecommendFoodCombo["items"][number],
    combo: RecommendFoodCombo
  ) => void
}) {
  const categories = useMemo(
    () => new Set(foodItems.map(({ item }) => item.category)).size,
    [foodItems]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[340px] gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-3.5 pt-3.5 pb-2 space-y-1 border-b border-border/50">
          <div className="flex items-start justify-between gap-2 pr-6">
            <div className="min-w-0 text-left">
              <DialogTitle className="text-[13px] font-semibold text-accent leading-snug">
                {meta.title}
              </DialogTitle>
              <DialogDescription className="text-[10px] text-muted-foreground mt-0.5">
                {meta.subtitle}
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="shrink-0 inline-flex items-center gap-1 rounded-md border border-border/60 bg-secondary/30 px-2 py-1 text-[10px] font-medium text-muted-foreground hover:border-accent/30 hover:text-accent transition-colors disabled:opacity-50"
              aria-label="다른 음식으로 다시 추천"
            >
              {loading ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <RefreshCw className="size-3" />
              )}
              새로고침
            </button>
          </div>
          <p className="text-[10px] text-foreground/80 leading-relaxed line-clamp-3 text-left">
            {meta.expertReason}
          </p>
          <p className="text-[9px] text-muted-foreground/75 tabular-nums text-left">
            {foodItems.length}종 · 카테고리 {categories}개 · 하나씩 선택
          </p>
        </DialogHeader>

        <div className="px-2 py-2">
          {loading && foodItems.length === 0 ? (
            <p className="text-[11px] text-muted-foreground text-center py-6 flex items-center justify-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              추천 메뉴 불러오는 중…
            </p>
          ) : foodItems.length > 0 ? (
            <div
              className="max-h-[min(280px,50dvh)] overflow-y-auto overscroll-y-contain touch-pan-y [scrollbar-gutter:stable]"
              aria-label="추천 음식 목록"
            >
              <ul className="space-y-1">
                {foodItems.map(({ item, combo, hint }) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onPickItem(item, combo)}
                      className="w-full rounded-lg border border-border/50 bg-secondary/15 px-2.5 py-2 text-left hover:border-accent/35 hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-medium truncate">
                          {item.nameKo}
                        </p>
                        <span className="shrink-0 rounded-full border border-accent/25 bg-accent/10 px-1.5 py-0.5 text-[9px] font-medium text-accent">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                        {hint}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground text-center py-5">
              조건에 맞는 메뉴를 찾지 못했습니다.
              <br />
              새로고침을 눌러 다른 메뉴를 받아보세요.
            </p>
          )}
          {foodItems.length > 4 ? (
            <p className="text-[9px] text-muted-foreground/70 text-center pt-1.5">
              휠 또는 드래그로 더 보기
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function NutritionQualityPanel({
  totals,
  targets,
  entries,
  onApplyRecommendedItem,
}: {
  totals: LoggedNutrition & { count: number }
  targets: MacroTargets
  entries: LoggedFoodEntry[]
  onApplyRecommendedItem?: (
    item: RecommendFoodCombo["items"][number],
    combo: RecommendFoodCombo,
    slotId: FoodMealSlotId
  ) => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<DietQualityEvaluationResponse | null>(
    null
  )
  const [variantSeed, setVariantSeed] = useState(0)
  const [activeKind, setActiveKind] = useState<QualityFocusKind | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pendingApply, setPendingApply] = useState<{
    item: RecommendFoodCombo["items"][number]
    combo: RecommendFoodCombo
  } | null>(null)
  const [slotPickerOpen, setSlotPickerOpen] = useState(false)

  const mealSlotTargets = useMemo(
    () =>
      targets.perMealBySlot ??
      buildMealSlotTargets(
        targets,
        targets.breakdown.coachingMode ?? null,
        targets.breakdown.snackCalorieMax ?? null
      ),
    [targets]
  )

  const slotPreviews = useMemo(() => {
    if (!pendingApply) return []
    const food = recommendItemToFoodDatabaseItem(pendingApply.item)
    return buildMealSlotAddPreviews({
      entries,
      addItem: pendingApply.item,
      addFoodId: food.id,
      slotTargets: mealSlotTargets,
      coachingMode: targets.breakdown.coachingMode ?? null,
    })
  }, [pendingApply, entries, mealSlotTargets, targets.breakdown.coachingMode])

  const strategySettings = useMemo(() => loadStrategySettings(), [])

  const focus: DietQualityFocus = focusFromJudgmentKind(activeKind)

  const fetchEvaluation = useCallback(
    async (seed: number, focusParam: DietQualityFocus) => {
      setLoading(true)
      setError(null)
      try {
        const { data, message } = await fetchDietQualityEvaluation({
          targets: {
            calories: targets.calories,
            proteinG: targets.proteinG,
            carbsG: targets.carbsG,
            fatG: targets.fatG,
            fiberG: targets.fiberG,
            sodiumMg: targets.sodiumMg,
            sugarG: targets.sugarG,
          },
          consumed: {
            calories: totals.calories,
            carbsG: totals.carbsG,
            proteinG: totals.proteinG,
            fatG: totals.fatG,
            sodiumMg: totals.sodiumMg,
            sugarG: totals.sugarG,
            fiberG: totals.fiberG,
          },
          goal: strategySettings.goal,
          trainingStatus: strategySettings.trainingStatus,
          mealTiming: strategySettings.mealTiming,
          intensity: strategySettings.intensity,
          mealContext: mealTimingToContext(strategySettings.mealTiming),
          hasTrainingToday: hasTrainingToday(strategySettings.trainingStatus),
          trainingIntensity: trainingStatusToIntensity(
            strategySettings.trainingStatus
          ),
          recentFoodIds: loadRecentRecommendedFoodIds(),
          recentRecommendationIds: loadRecentRecommendationIds(),
          variantSeed: seed,
          recommendationFocus: focusToApiParam(focusParam),
        })

        if (data?.recommendations?.length || data?.quality) {
          setResponse(data)
          setError(data.recommendations?.length ? null : (message ?? null))
          if (data.recommendations?.length) {
            saveRecentRecommendationIds(data.recommendations.map((r) => r.id))
            saveRecentRecommendedFoodIds(
              data.recommendations.flatMap((r) => r.items.map((i) => i.id))
            )
          }
        } else {
          setResponse(null)
          setError(
            message ??
              "추천 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
          )
        }
      } catch {
        setError("추천 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.")
      } finally {
        setLoading(false)
      }
    },
    [targets, totals, strategySettings]
  )

  const judgmentTags = useMemo(
    () =>
      response?.analysis ? buildQualityJudgmentTags(response.analysis) : [],
    [response?.analysis]
  )

  useEffect(() => {
    if (totals.count === 0) return
    const focusParam = pickerOpen && activeKind ? focus : "all"
    void fetchEvaluation(variantSeed, focusParam)
  }, [
    totals.count,
    totals.calories,
    totals.proteinG,
    totals.carbsG,
    totals.fatG,
    totals.fiberG,
    totals.sodiumMg,
    totals.sugarG,
    variantSeed,
    focus,
    fetchEvaluation,
    pickerOpen,
    activeKind,
  ])

  const allCombos = useMemo(() => {
    if (!response) return []
    const fromSections = response.sections?.flatMap((s) => s.combos) ?? []
    const merged = [...response.recommendations, ...fromSections]
    const seen = new Set<string>()
    return merged.filter((c) => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })
  }, [response])

  const focusedCombos = useMemo(() => {
    if (!response?.analysis || focus === "all") return allCombos.slice(0, 4)
    return getFocusedCombos(allCombos, focus, response.analysis, 4)
  }, [allCombos, focus, response?.analysis])

  const focusedFoodItems = useMemo(() => {
    if (!response?.analysis || focus === "all") return []
    return getFocusedFoodItems(focusedCombos, focus, response.analysis, 8)
  }, [focusedCombos, focus, response?.analysis])

  const focusMeta = useMemo(() => {
    if (!response?.analysis || focus === "all") return null
    return buildFocusPanelMeta(focus, response.analysis)
  }, [focus, response?.analysis])

  const handleRefresh = () => {
    setVariantSeed((prev) => prev + 1)
  }

  const handleTagClick = (tag: QualityJudgmentTag) => {
    if (!tag.actionable || tag.kind === "deficit_fill" || tag.kind === "excess_control") {
      return
    }
    const kind = tag.kind as QualityFocusKind
    if (activeKind === kind && pickerOpen) {
      setPickerOpen(false)
      setActiveKind(null)
      return
    }
    setActiveKind(kind)
    setPickerOpen(true)
  }

  const handlePickItem = (
    item: RecommendFoodCombo["items"][number],
    combo: RecommendFoodCombo
  ) => {
    setPendingApply({ item, combo })
    setSlotPickerOpen(true)
  }

  const handleConfirmSlot = (slotId: FoodMealSlotId) => {
    if (!pendingApply) return
    onApplyRecommendedItem?.(pendingApply.item, pendingApply.combo, slotId)
    setPendingApply(null)
    setSlotPickerOpen(false)
    setPickerOpen(false)
    setActiveKind(null)
  }

  const handleDialogChange = (open: boolean) => {
    setPickerOpen(open)
    if (!open) setActiveKind(null)
  }

  return (
    <div className="rounded-xl border border-accent/25 bg-accent/5 px-3 py-2.5 space-y-3">
      <div>
        <p className="text-[10px] text-muted-foreground">
          태그를 눌러 부족·주의 영양소에 맞는 메뉴를 하나씩 골라보세요.
        </p>
        {response?.quality?.coachSummary ? (
          <p className="text-[11px] text-foreground/90 leading-relaxed mt-2">
            {response.quality.coachSummary}
          </p>
        ) : null}
      </div>

      {judgmentTags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {judgmentTags.map((tag) => (
            <JudgmentChip
              key={tag.label}
              tag={tag}
              active={tag.actionable && activeKind === tag.kind}
              onClick={tag.actionable ? () => handleTagClick(tag) : undefined}
            />
          ))}
        </div>
      ) : null}

      {loading && !response ? (
        <p className="text-[12px] text-muted-foreground text-center py-3 flex items-center justify-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          영양 상태 분석 중…
        </p>
      ) : null}

      {error && !response?.recommendations?.length && !loading ? (
        <div className="text-center space-y-2 py-2 rounded-xl border border-border/40 bg-secondary/10 px-3">
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            {error}
          </p>
          <Button type="button" size="sm" variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            다시 시도
          </Button>
        </div>
      ) : null}

      {focusMeta ? (
        <FocusFoodPickerDialog
          open={pickerOpen}
          onOpenChange={handleDialogChange}
          meta={focusMeta}
          foodItems={focusedFoodItems}
          loading={loading}
          onRefresh={handleRefresh}
          onPickItem={handlePickItem}
        />
      ) : null}

      <MealSlotApplyDialog
        foodName={pendingApply?.item.nameKo ?? null}
        slotPreviews={slotPreviews}
        open={slotPickerOpen}
        onOpenChange={(open) => {
          setSlotPickerOpen(open)
          if (!open) setPendingApply(null)
        }}
        onConfirm={handleConfirmSlot}
      />
    </div>
  )
}
