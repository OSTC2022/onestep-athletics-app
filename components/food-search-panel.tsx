"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Loader2, Minus, PenLine, Plus, Search, ShoppingCart, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { NutritionDailySummary } from "@/components/nutrition-daily-summary"
import {
  FoodEntryDetailDialog,
  type FoodEntryDetailItem,
} from "@/components/food-entry-detail-dialog"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FORM_INPUT_CLASS } from "@/lib/form-styles"
import { CustomFoodFormDialog } from "@/components/custom-food-form-dialog"
import {
  RecommendedMealMenuPanel,
  type RecommendedMealMenuPanelHandle,
  type RecommendedMenuItemSelectContext,
} from "@/components/recommended-meal-menu-panel"
import { CollapsibleInlineSection } from "@/components/collapsible-card"
import {
  searchFoodDatabase,
  formatFullFoodPortion,
  formatPortionAmount,
  getFoodById,
  getPieceWeightG,
  getServingUnit,
  gramsForServingCount,
  nutritionAtGrams,
  isFiberSearchQuery,
  getFiberPer100g,
  type FoodDatabaseItem,
} from "@/lib/food-database"
import {
  CUSTOM_FOOD_EVENT,
  getCustomFoodById,
  isCustomFood,
  type CustomFoodItem,
} from "@/lib/custom-food-store"
import {
  FOOD_NUTRITION_OVERRIDE_EVENT,
  isNutritionOverrideEditable,
} from "@/lib/food-nutrition-overrides"
import { getPortionUnitWarning } from "@/lib/food-portion-validation"
import { FoodNutritionOverrideDialog } from "@/components/food-nutrition-override-dialog"
import {
  calculateFoodPortionPlan,
  type PortionGoalScope,
  type PortionRecommendation,
} from "@/lib/food-portion-calculator"
import {
  addFoodLogEntries,
  clearMealSlotFoodLogEntries,
  clearTodayFoodLog,
  DAILY_FOOD_LOG_EVENT,
  loadTodayFoodLog,
  refreshTodayFoodLogNutrition,
  restoreTodayFoodLog,
  type LoggedFoodEntry,
  type DailyFoodLog,
} from "@/lib/daily-food-log"
import { DAILY_DATE_CHANGED_EVENT } from "@/lib/daily-date"
import { MEAL_SLOTS, type MealSlotId } from "@/lib/nutrition"
import type { FoodMealSlotId } from "@/lib/meal-slot-targets"
import { formatCalories, type MacroTargets } from "@/lib/user-profile"
import {
  formatMacroG,
  sumLoggedNutrition,
  buildDietWarningContextFromTotals,
} from "@/lib/food-nutrition-utils"
import { useHydrated } from "@/hooks/use-hydrated"
import { cn } from "@/lib/utils"

const FOOD_MEAL_SLOTS = MEAL_SLOTS.filter((slot) =>
  (["breakfast", "lunch", "dinner", "snack"] as MealSlotId[]).includes(slot.id)
)

type FoodCartItem = {
  cartId: string
  foodId: string
  name: string
  grams: number
  displayAmount: string
  servingCount: number
  scope: PortionGoalScope
  scopeLabel: string
  mealSlotId: MealSlotId
  nutrition: LoggedFoodEntry["nutrition"]
}

function createCartId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `cart-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function adjustCartServing(
  items: FoodCartItem[],
  cartId: string,
  delta: number
): FoodCartItem[] {
  return items.flatMap((item) => {
    if (item.cartId !== cartId) return [item]

    const nextCount = Math.round((item.servingCount + delta) * 2) / 2
    if (nextCount < 0.5) return []

    const food = getFoodById(item.foodId)
    if (!food) return [item]

    const unitGrams =
      getPieceWeightG(food) ??
      (item.servingCount > 0 ? item.grams / item.servingCount : item.grams)
    const grams = gramsForServingCount(food, nextCount, unitGrams)
    const nutrition = nutritionAtGrams(food, grams)

    return [
      {
        ...item,
        servingCount: nextCount,
        grams,
        displayAmount: formatFullFoodPortion(food, nextCount, unitGrams),
        nutrition: {
          calories: nutrition.calories,
          carbsG: nutrition.carbsG,
          proteinG: nutrition.proteinG,
          fatG: nutrition.fatG,
          sodiumMg: nutrition.sodiumMg,
          sugarG: nutrition.sugarG,
          fiberG: nutrition.fiberG,
        },
      },
    ]
  })
}

function MealSlotPicker({
  value,
  onChange,
  compact = false,
}: {
  value?: MealSlotId
  onChange: (id: MealSlotId) => void
  compact?: boolean
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", compact && "gap-1")}>
      {FOOD_MEAL_SLOTS.map((slot) => (
        <button
          key={slot.id}
          type="button"
          onClick={() => onChange(slot.id)}
          className={cn(
            "rounded-lg border font-medium transition-colors",
            compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1.5 text-[11px]",
            value === slot.id
              ? "border-accent/50 bg-accent/15 text-accent"
              : "border-border/60 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
          )}
        >
          {slot.label}
        </button>
      ))}
    </div>
  )
}

function NutritionFactsTable({
  rows,
}: {
  rows: { label: string; per100g: string; portion: string; pct?: string }[]
}) {
  return (
    <div className="rounded-xl border border-border/60 overflow-hidden text-[12px]">
      <div className="grid grid-cols-[1fr_72px_72px_52px] gap-1 px-3 py-2 bg-secondary/40 text-[10px] text-muted-foreground font-medium">
        <span>항목</span>
        <span className="text-right">100g</span>
        <span className="text-right">권장량</span>
        <span className="text-right">목표%</span>
      </div>
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-[1fr_72px_72px_52px] gap-1 px-3 py-2 border-t border-border/40 tabular-nums"
        >
          <span className="text-foreground">{row.label}</span>
          <span className="text-right text-muted-foreground">{row.per100g}</span>
          <span className="text-right font-medium">{row.portion}</span>
          <span className="text-right text-accent">{row.pct ?? "—"}</span>
        </div>
      ))}
    </div>
  )
}

function calcMatchPct(
  nutrition: PortionRecommendation["nutrition"],
  target: PortionRecommendation["target"]
) {
  const pct = (actual: number, goal: number) =>
    goal > 0 ? Math.round((actual / goal) * 100) : 0
  return {
    calories: pct(nutrition.calories, target.calories),
    carbs: pct(nutrition.carbsG, target.carbsG),
    protein: pct(nutrition.proteinG, target.proteinG),
    fat: pct(nutrition.fatG, target.fatG),
    sodium: pct(nutrition.sodiumMg, target.sodiumMg),
  }
}

function buildFactsRows(
  plan: ReturnType<typeof calculateFoodPortionPlan>,
  selected: PortionRecommendation,
  appliedNutrition: PortionRecommendation["nutrition"]
) {
  const p100 = plan.per100g
  const m = calcMatchPct(appliedNutrition, selected.target)

  return [
    {
      label: "칼로리",
      per100g: `${p100.calories}kcal`,
      portion: `${appliedNutrition.calories}kcal`,
      pct: `${m.calories}%`,
    },
    {
      label: "탄수화물",
      per100g: `${p100.carbsG}g`,
      portion: `${appliedNutrition.carbsG}g`,
      pct: `${m.carbs}%`,
    },
    {
      label: "단백질",
      per100g: `${p100.proteinG}g`,
      portion: `${appliedNutrition.proteinG}g`,
      pct: `${m.protein}%`,
    },
    {
      label: "지방",
      per100g: `${p100.fatG}g`,
      portion: `${appliedNutrition.fatG}g`,
      pct: `${m.fat}%`,
    },
    {
      label: "나트륨",
      per100g: `${p100.sodiumMg}mg`,
      portion: `${appliedNutrition.sodiumMg}mg`,
      pct: `${m.sodium}%`,
    },
  ]
}

function FoodDetailDialog({
  open,
  onOpenChange,
  food,
  targets,
  onAddToCart,
  onEditCustom,
  onEditNutritionOverride,
  recommendedMenuContext,
  onApplyToRecommendedMenu,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  food: FoodDatabaseItem | null
  targets: MacroTargets
  onAddToCart: (item: Omit<FoodCartItem, "cartId">) => void
  onEditCustom?: () => void
  onEditNutritionOverride?: () => void
  recommendedMenuContext?: RecommendedMenuItemSelectContext | null
  onApplyToRecommendedMenu?: (servingCount: number) => void
}) {
  const [applyScope, setApplyScope] = useState<"meal" | "daily">("meal")
  const [mealSlot, setMealSlot] = useState<MealSlotId>("breakfast")
  const [servingCount, setServingCount] = useState(1)

  const plan = useMemo(
    () => (food ? calculateFoodPortionPlan(food, targets) : null),
    [food, targets]
  )

  const selected = plan
    ? applyScope === "meal"
      ? plan.perMeal
      : plan.daily
    : null

  useEffect(() => {
    if (open) {
      setApplyScope("meal")
      if (recommendedMenuContext) {
        setServingCount(recommendedMenuContext.servingCount)
      } else {
        setMealSlot("breakfast")
        setServingCount(1)
      }
    }
  }, [open, food?.id, recommendedMenuContext])

  if (!food || !plan || !selected) return null

  const isRecommendedMenuMode = Boolean(recommendedMenuContext && onApplyToRecommendedMenu)
  const portionUnitGrams = isRecommendedMenuMode
    ? (getPieceWeightG(food) ?? 100)
    : selected.grams
  const appliedGrams = gramsForServingCount(food, servingCount, portionUnitGrams)
  const appliedNutrition = nutritionAtGrams(food, appliedGrams)
  const appliedDisplay = formatFullFoodPortion(food, servingCount, portionUnitGrams)
  const appliedPortionOnly = formatPortionAmount(food, servingCount, portionUnitGrams)
  const servingUnit = getServingUnit(food)
  const factsRows = buildFactsRows(plan, selected, appliedNutrition)
  const portionWarning = getPortionUnitWarning(food, appliedGrams, appliedNutrition)
  const canEditOverride = isNutritionOverrideEditable(food.id)
  const pieceWeight = getPieceWeightG(food)

  const handleAddToCart = () => {
    onAddToCart({
      foodId: food.id,
      name: food.name,
      grams: appliedGrams,
      displayAmount: appliedDisplay,
      servingCount,
      scope: selected.scope,
      scopeLabel: selected.scopeLabel,
      mealSlotId: mealSlot,
      nutrition: {
        calories: appliedNutrition.calories,
        carbsG: appliedNutrition.carbsG,
        proteinG: appliedNutrition.proteinG,
        fatG: appliedNutrition.fatG,
        sodiumMg: appliedNutrition.sodiumMg,
        sugarG: appliedNutrition.sugarG,
        fiberG: appliedNutrition.fiberG,
      },
    })
    toast.success(`「${food.name}」을 장바구니에 담았습니다`)
    onOpenChange(false)
  }

  const handleApplyToRecommendedMenu = () => {
    if (!onApplyToRecommendedMenu) return
    onApplyToRecommendedMenu(servingCount)
    toast.success(
      `「${recommendedMenuContext?.mealLabel}」 메뉴에 ${food.name} ${servingCount}${servingUnit} 반영했습니다`
    )
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="bg-card border-border max-w-md max-h-[90dvh] overflow-y-auto p-0 gap-0"
      >
        <DialogHeader className="px-4 pt-4 pb-2 border-b border-border/60">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base">{food.name}</DialogTitle>
              <p className="text-[12px] text-muted-foreground font-normal">
                {isRecommendedMenuMode && recommendedMenuContext
                  ? `${recommendedMenuContext.mealLabel} 추천 메뉴 · 수량 조정`
                  : null}
                {!isRecommendedMenuMode ? (
                  <>
                    {food.category}
                    {food.isCustom ? " · 내 음식" : ""}
                    {pieceWeight && food.servingLabel
                      ? ` · ${food.servingLabel} = ${pieceWeight}g`
                      : ""}
                    {" · "}
                    100g당 영양 기준
                  </>
                ) : null}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {canEditOverride && onEditNutritionOverride ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-[11px]"
                  onClick={onEditNutritionOverride}
                >
                  <PenLine className="h-3.5 w-3.5 mr-1" />
                  내 기준
                </Button>
              ) : null}
              {food.isCustom && onEditCustom ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-[11px]"
                  onClick={onEditCustom}
                >
                  <PenLine className="h-3.5 w-3.5 mr-1" />
                  수정
                </Button>
              ) : null}
              <DialogClose asChild>
                <button
                  type="button"
                  className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors shrink-0"
                  aria-label="닫기"
                >
                  <X className="h-4 w-4" />
                </button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        <div className="px-4 py-3 space-y-4">
          {portionWarning ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2">
              <p className="text-[11px] text-amber-200 leading-relaxed">{portionWarning}</p>
            </div>
          ) : null}
          <div className="flex rounded-xl bg-secondary/50 p-1 gap-1">
            {(
              [
                { id: "meal" as const, label: "1끼 목표", rec: plan.perMeal },
                { id: "daily" as const, label: "하루 목표", rec: plan.daily },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setApplyScope(item.id)}
                className={cn(
                  "flex-1 rounded-lg py-2 px-2 text-left transition-colors",
                  applyScope === item.id
                    ? "bg-accent/15 ring-1 ring-accent/40"
                    : "hover:bg-secondary/60"
                )}
              >
                <p className="text-[11px] text-muted-foreground">{item.label}</p>
                <p className="text-[13px] font-semibold text-accent tabular-nums mt-0.5">
                  {item.rec.displayAmount}
                </p>
                <p className="text-[10px] text-muted-foreground tabular-nums">
                  {formatCalories(item.rec.nutrition.calories)}kcal · 목표{" "}
                  {item.rec.matchPct.calories}%
                </p>
              </button>
            ))}
          </div>

          <div>
            <p className="text-[12px] font-medium mb-2">영양성분표</p>
            <NutritionFactsTable rows={factsRows} />
            <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
              권장량은 현재 설정된 {selected.scopeLabel}(
              {formatCalories(selected.target.calories)}kcal) 칼로리에 맞춘
              섭취량입니다. 목표%는 해당 영양소 대비 비율입니다.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">
              섭취량
              {food.servingLabel && pieceWeight
                ? ` (${food.servingLabel} = ${pieceWeight}g)`
                : " (g)"}
            </Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                disabled={servingCount <= 0.5}
                onClick={() =>
                  setServingCount((c) => Math.max(0.5, Math.round((c - 0.5) * 2) / 2))
                }
                aria-label="0.5 감소"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="flex-1 text-center">
                <p className="text-lg font-semibold tabular-nums text-accent">
                  {servingCount}
                  {servingUnit}
                </p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {appliedPortionOnly} · {formatCalories(appliedNutrition.calories)}kcal
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() =>
                  setServingCount((c) => Math.round((c + 0.5) * 2) / 2)
                }
                aria-label="0.5 증가"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!isRecommendedMenuMode ? (
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">어느 끼니에 넣을까요?</Label>
              <MealSlotPicker value={mealSlot} onChange={setMealSlot} />
            </div>
          ) : null}
        </div>

        <DialogFooter className="px-4 py-3 border-t border-border/60 gap-2 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            적용 안 함
          </Button>
          <Button
            type="button"
            className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={
              isRecommendedMenuMode ? handleApplyToRecommendedMenu : handleAddToCart
            }
          >
            {isRecommendedMenuMode ? "메뉴에 반영" : "장바구니에 담기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type MealGridItem = {
  id: string
  foodId: string
  name: string
  displayAmount: string
  servingCount: number
  grams: number
  mealSlotId?: MealSlotId
  nutrition: LoggedFoodEntry["nutrition"]
}

function groupByMealSlot(items: MealGridItem[]) {
  const grouped = Object.fromEntries(
    FOOD_MEAL_SLOTS.map((slot) => [slot.id, [] as MealGridItem[]])
  ) as Record<(typeof FOOD_MEAL_SLOTS)[number]["id"], MealGridItem[]>

  const unassigned: MealGridItem[] = []
  for (const item of items) {
    if (item.mealSlotId && grouped[item.mealSlotId]) {
      grouped[item.mealSlotId].push(item)
    } else {
      unassigned.push(item)
    }
  }
  return { grouped, unassigned }
}

function MealGroupedFoodGrid({
  items,
  onItemClick,
  onRemove,
  emptyMessage,
}: {
  items: MealGridItem[]
  onItemClick: (item: MealGridItem) => void
  onRemove: (id: string) => void
  emptyMessage: string
}) {
  const { grouped, unassigned } = useMemo(() => groupByMealSlot(items), [items])

  if (items.length === 0) {
    return (
      <p className="text-[12px] text-muted-foreground px-1 py-2">{emptyMessage}</p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-1.5">
        {FOOD_MEAL_SLOTS.map((slot) => {
          const columnItems = grouped[slot.id]
          const columnKcal = columnItems.reduce(
            (sum, item) => sum + item.nutrition.calories,
            0
          )

          return (
            <div key={slot.id} className="min-w-0 flex flex-col">
              <p className="text-[11px] font-semibold text-center text-accent mb-1.5">
                {slot.label}
              </p>
              <div className="flex-1 rounded-xl border border-border/50 bg-secondary/20 p-1.5 min-h-[72px] space-y-1.5">
                {columnItems.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground/60 text-center py-6">
                    —
                  </p>
                ) : (
                  columnItems.map((item) => {
                    const food = getFoodById(item.foodId)
                    const portionText =
                      food && item.grams > 0
                        ? formatPortionAmount(
                            food,
                            item.servingCount,
                            item.grams / Math.max(item.servingCount, 0.5)
                          )
                        : item.displayAmount
                    const n = item.nutrition
                    const portionWarning =
                      food && item.grams > 0
                        ? getPortionUnitWarning(food, item.grams, n)
                        : null

                    return (
                      <div
                        key={item.id}
                        className="relative rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => onRemove(item.id)}
                          className="absolute top-0.5 right-0.5 z-10 p-0.5 rounded text-muted-foreground hover:text-destructive"
                          aria-label={`${item.name} 삭제`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onItemClick(item)}
                          className="w-full rounded-lg px-1.5 py-1.5 pr-5 text-left"
                        >
                          <p className="text-[11px] font-semibold leading-snug line-clamp-2">
                            {item.name}
                          </p>
                          <p className="text-[9px] text-muted-foreground tabular-nums mt-0.5">
                            {portionText} · {formatCalories(n.calories)}kcal
                          </p>
                          <p className="text-[8px] text-muted-foreground/80 tabular-nums mt-0.5 leading-tight">
                            탄수 {formatMacroG(n.carbsG)}g · 단백{" "}
                            {formatMacroG(n.proteinG)}g · 지방 {formatMacroG(n.fatG)}g
                          </p>
                          {portionWarning ? (
                            <p className="text-[8px] text-amber-400/90 mt-0.5 leading-tight line-clamp-2">
                              ⚠ 단위 확인
                            </p>
                          ) : null}
                          <p className="text-[8px] text-accent/80 mt-0.5">탭 → 상세 영양</p>
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
              {columnItems.length > 0 ? (
                <p className="text-[9px] text-muted-foreground text-center tabular-nums mt-1">
                  {formatCalories(columnKcal)}kcal
                </p>
              ) : null}
            </div>
          )
        })}
      </div>

      {unassigned.length > 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-secondary/10 px-3 py-2">
          <p className="text-[10px] text-muted-foreground mb-1.5">미정</p>
          <div className="flex flex-wrap gap-1.5">
            {unassigned.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onItemClick(item)}
                className="rounded-lg px-2 py-1 text-[11px] border border-border/60 text-foreground hover:border-accent/40 hover:bg-accent/5"
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function FoodCartList({
  items,
  onRemove,
  onAdjustServing,
  onChangeMealSlot,
  onCheckout,
  onClear,
  onEditNutrition,
}: {
  items: FoodCartItem[]
  onRemove: (cartId: string) => void
  onAdjustServing: (cartId: string, delta: number) => void
  onChangeMealSlot: (cartId: string, slotId: MealSlotId) => void
  onCheckout: () => void
  onClear: () => void
  onEditNutrition?: (foodId: string) => void
}) {
  const [detailItem, setDetailItem] = useState<FoodEntryDetailItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  useEffect(() => {
    if (!detailItem) return
    const updated = items.find((item) => item.cartId === detailItem.id)
    if (!updated) {
      setDetailItem(null)
      setDetailOpen(false)
      return
    }
    setDetailItem({
      id: updated.cartId,
      foodId: updated.foodId,
      name: updated.name,
      displayAmount: updated.displayAmount,
      servingCount: updated.servingCount,
      grams: updated.grams,
      mealSlotId: updated.mealSlotId,
      nutrition: updated.nutrition,
    })
  }, [items, detailItem?.id])

  if (items.length === 0) return null

  const cartTotals = sumLoggedNutrition(items)
  const gridItems: MealGridItem[] = items.map((item) => ({
    id: item.cartId,
    foodId: item.foodId,
    name: item.name,
    displayAmount: item.displayAmount,
    servingCount: item.servingCount,
    grams: item.grams,
    mealSlotId: item.mealSlotId,
    nutrition: item.nutrition,
  }))

  const openItemDetail = (item: MealGridItem) => {
    setDetailItem(item)
    setDetailOpen(true)
  }

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 px-3 py-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium flex items-center gap-1.5">
          <ShoppingCart className="h-3.5 w-3.5 text-accent" />
          담은 음식
          <span className="text-accent tabular-nums">{items.length}개</span>
        </p>
        <button
          type="button"
          onClick={() => {
            onClear()
            setDetailItem(null)
            setDetailOpen(false)
          }}
          className="text-[11px] text-muted-foreground hover:text-destructive"
        >
          전체 비우기
        </button>
      </div>

      <MealGroupedFoodGrid
        items={gridItems}
        onItemClick={openItemDetail}
        onRemove={(id) => {
          onRemove(id)
          if (detailItem?.id === id) {
            setDetailItem(null)
            setDetailOpen(false)
          }
        }}
        emptyMessage=""
      />

      <p className="text-[11px] text-muted-foreground text-center tabular-nums">
        합계 {formatCalories(cartTotals.calories)}kcal
      </p>

      <Button
        type="button"
        className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
        onClick={onCheckout}
      >
        오늘 식단에 한번에 적용 ({items.length}개)
      </Button>

      <FoodEntryDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        item={detailItem}
        onAdjustServing={onAdjustServing}
        onChangeMealSlot={onChangeMealSlot}
        onEditNutrition={onEditNutrition}
      />
    </div>
  )
}

const EMPTY_FOOD_LOG: DailyFoodLog = {
  date: "",
  entries: [],
  updatedAt: "",
}

export function FoodSearchPanel({ targets }: { targets: MacroTargets }) {
  const hydrated = useHydrated()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<FoodDatabaseItem[]>([])
  const [selectedFood, setSelectedFood] = useState<FoodDatabaseItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [foodLog, setFoodLog] = useState<DailyFoodLog>(EMPTY_FOOD_LOG)
  const [cart, setCart] = useState<FoodCartItem[]>([])
  const [customFormOpen, setCustomFormOpen] = useState(false)
  const [editCustomFood, setEditCustomFood] = useState<CustomFoodItem | null>(null)
  const [customFormInitialName, setCustomFormInitialName] = useState("")
  const [customFoodVersion, setCustomFoodVersion] = useState(0)
  const [nutritionOverrideVersion, setNutritionOverrideVersion] = useState(0)
  const [overrideFood, setOverrideFood] = useState<FoodDatabaseItem | null>(null)
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false)
  const [recommendedMenuEdit, setRecommendedMenuEdit] =
    useState<RecommendedMenuItemSelectContext | null>(null)
  const recommendedMenuRef = useRef<RecommendedMealMenuPanelHandle>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [slotUndoSnapshots, setSlotUndoSnapshots] = useState<
    Partial<Record<FoodMealSlotId, LoggedFoodEntry[]>>
  >({})
  const [clearAllUndoSnapshot, setClearAllUndoSnapshot] = useState<
    LoggedFoodEntry[] | null
  >(null)

  useEffect(() => {
    setSlotUndoSnapshots((prev) => {
      let changed = false
      const next = { ...prev }
      for (const slot of FOOD_MEAL_SLOTS) {
        const slotId = slot.id as FoodMealSlotId
        if (
          prev[slotId] &&
          foodLog.entries.some((entry) => entry.mealSlotId === slotId)
        ) {
          delete next[slotId]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [foodLog.entries])

  useEffect(() => {
    if (clearAllUndoSnapshot && foodLog.entries.length > 0) {
      setClearAllUndoSnapshot(null)
    }
  }, [foodLog.entries, clearAllUndoSnapshot])

  const handleClearOrUndoMealSlot = useCallback(
    (slotId: FoodMealSlotId, label: string) => {
      const undo = slotUndoSnapshots[slotId]
      if (undo) {
        restoreTodayFoodLog({
          ...foodLog,
          entries: [
            ...undo.map((entry) => ({ ...entry })),
            ...foodLog.entries,
          ],
        })
        setSlotUndoSnapshots((prev) => {
          const next = { ...prev }
          delete next[slotId]
          return next
        })
        toast.message(`「${label}」 메뉴를 되돌렸습니다`)
        return
      }

      const toRemove = foodLog.entries.filter(
        (entry) => entry.mealSlotId === slotId
      )
      if (toRemove.length === 0) return

      setSlotUndoSnapshots((prev) => ({
        ...prev,
        [slotId]: toRemove.map((entry) => ({ ...entry })),
      }))
      setClearAllUndoSnapshot(null)
      clearMealSlotFoodLogEntries(slotId)
      toast.message(`「${label}」 메뉴를 비웠습니다`)
    },
    [foodLog, slotUndoSnapshots]
  )

  const handleClearAllOrUndoFoodLog = useCallback(() => {
    if (clearAllUndoSnapshot) {
      restoreTodayFoodLog({
        ...foodLog,
        entries: clearAllUndoSnapshot.map((entry) => ({ ...entry })),
      })
      setClearAllUndoSnapshot(null)
      setSlotUndoSnapshots({})
      toast.message("식단을 되돌렸습니다")
      return
    }

    if (foodLog.entries.length === 0) return

    setClearAllUndoSnapshot(
      foodLog.entries.map((entry) => ({ ...entry }))
    )
    setSlotUndoSnapshots({})
    clearTodayFoodLog()
    toast.message("오늘 식단을 모두 비웠습니다")
  }, [clearAllUndoSnapshot, foodLog])

  const mealSlotUndoAvailable = useMemo(
    () =>
      Object.fromEntries(
        FOOD_MEAL_SLOTS.map((slot) => [
          slot.id,
          Boolean(slotUndoSnapshots[slot.id as FoodMealSlotId]),
        ])
      ) as Partial<Record<FoodMealSlotId, boolean>>,
    [slotUndoSnapshots]
  )

  useEffect(() => {
    if (!hydrated) return
    const sync = () => setFoodLog(loadTodayFoodLog())
    const resetUndo = () => {
      setSlotUndoSnapshots({})
      setClearAllUndoSnapshot(null)
    }
    sync()
    window.addEventListener(DAILY_FOOD_LOG_EVENT, sync)
    window.addEventListener(DAILY_DATE_CHANGED_EVENT, resetUndo)
    return () => {
      window.removeEventListener(DAILY_FOOD_LOG_EVENT, sync)
      window.removeEventListener(DAILY_DATE_CHANGED_EVENT, resetUndo)
    }
  }, [hydrated])

  useEffect(() => {
    if (!hydrated) return
    const sync = () => setCustomFoodVersion((v) => v + 1)
    window.addEventListener(CUSTOM_FOOD_EVENT, sync)
    return () => window.removeEventListener(CUSTOM_FOOD_EVENT, sync)
  }, [hydrated])

  useEffect(() => {
    if (!hydrated) return
    const sync = () => setNutritionOverrideVersion((v) => v + 1)
    window.addEventListener(FOOD_NUTRITION_OVERRIDE_EVENT, sync)
    return () => window.removeEventListener(FOOD_NUTRITION_OVERRIDE_EVENT, sync)
  }, [hydrated])

  useEffect(() => {
    if (!selectedFood) return
    const refreshed = getFoodById(selectedFood.id)
    if (refreshed) setSelectedFood(refreshed)
  }, [nutritionOverrideVersion, selectedFood?.id])

  const runSearch = (q: string) => {
    setLoading(true)
    const warningContext = buildDietWarningContextFromTotals(
      sumLoggedNutrition(foodLog.entries),
      targets
    )
    const hits = searchFoodDatabase(q, 24, warningContext)
    setResults(hits)
    setLoading(false)
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim()
    if (q.length < 1) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(() => runSearch(q), 200)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, foodLog.entries, targets, customFoodVersion, nutritionOverrideVersion])

  const openNutritionOverride = (foodId: string) => {
    const food = getFoodById(foodId)
    if (!food || !isNutritionOverrideEditable(foodId)) return
    setOverrideFood(food)
    setOverrideDialogOpen(true)
  }

  const openCreateCustomFood = (name = "") => {
    setEditCustomFood(null)
    setCustomFormInitialName(name)
    setCustomFormOpen(true)
  }

  const openEditCustomFood = (food: FoodDatabaseItem) => {
    const custom = getCustomFoodById(food.id)
    if (!custom) return
    setEditCustomFood(custom)
    setCustomFormInitialName(custom.name)
    setCustomFormOpen(true)
    setDetailOpen(false)
  }

  const handleCustomFoodSaved = (food: CustomFoodItem) => {
    setQuery(food.name)
    setSelectedFood(food)
    if (!editCustomFood) {
      setDetailOpen(true)
    } else if (selectedFood?.id === food.id) {
      setSelectedFood(food)
    }
    runSearch(food.name)
  }

  const handleCustomFoodDeleted = (id: string) => {
    if (selectedFood?.id === id) {
      setSelectedFood(null)
      setDetailOpen(false)
    }
    runSearch(query.trim())
  }

  const openDetail = (food: FoodDatabaseItem) => {
    setRecommendedMenuEdit(null)
    setSelectedFood(food)
    setDetailOpen(true)
  }

  const openRecommendedMenuItem = (
    food: FoodDatabaseItem,
    context: RecommendedMenuItemSelectContext
  ) => {
    setRecommendedMenuEdit(context)
    setSelectedFood(food)
    setDetailOpen(true)
  }

  const handleAddToCart = (item: Omit<FoodCartItem, "cartId">) => {
    setCart((prev) => [{ ...item, cartId: createCartId() }, ...prev])
  }

  const handleCheckout = () => {
    if (cart.length === 0) return

    const count = cart.length
    addFoodLogEntries(
      cart.map(({ cartId: _cartId, ...entry }) => entry)
    )
    setCart([])
    setFoodLog(loadTodayFoodLog())
    toast.success(`${count}개 음식을 오늘 식단에 적용했습니다`)
  }

  const totals = useMemo(
    () => sumLoggedNutrition(foodLog.entries),
    [foodLog.entries]
  )

  const fiberSearch = isFiberSearchQuery(query)

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="먹은 음식 검색 (예: 닭가슴살, 현미밥)"
            className={cn(FORM_INPUT_CLASS, "pl-9 pr-9 h-11")}
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("")
                setResults([])
                inputRef.current?.focus()
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-label="검색어 지우기"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-11 shrink-0 px-3 border-accent/30 text-accent hover:bg-accent/10"
          onClick={() => openCreateCustomFood(query.trim())}
        >
          <Plus className="h-4 w-4 mr-1" />
          직접 추가
        </Button>
      </div>

      {!query.trim() ? (
        <RecommendedMealMenuPanel
          ref={recommendedMenuRef}
          targets={targets}
          onSelectFood={openRecommendedMenuItem}
        />
      ) : null}

      {loading && results.length === 0 && query.trim() ? (
        <p className="text-[12px] text-muted-foreground text-center py-3 flex items-center justify-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          검색 중…
        </p>
      ) : null}

      {!loading && query.trim() && results.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 px-3 py-4 text-center space-y-3">
          <p className="text-[12px] text-muted-foreground">
            「{query.trim()}」 검색 결과가 없습니다.
          </p>
          <Button
            type="button"
            variant="outline"
            className="border-accent/30 text-accent hover:bg-accent/10"
            onClick={() => openCreateCustomFood(query.trim())}
          >
            <Plus className="h-4 w-4 mr-1" />「{query.trim()}」직접 추가하기
          </Button>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            영양성분표(100g 기준)를 입력해 저장하면 다음부터 검색·기록·수정·삭제가 가능해요.
          </p>
        </div>
      ) : null}

      {results.length > 0 ? (
        <>
          {fiberSearch ? (
            <p className="text-[11px] text-accent/90 px-1 leading-relaxed">
              마트·편의점에서 쉽게 구할 수 있는 식이섬유 풍부 식품 순입니다.
            </p>
          ) : null}
        <ul className="rounded-xl border border-border/50 divide-y divide-border/40 overflow-hidden max-h-[320px] overflow-y-auto">
          {results.map((food) => (
            <li key={food.id}>
              <button
                type="button"
                onClick={() => openDetail(food)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-secondary/40 active:bg-secondary/60 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="text-[13px] font-medium truncate">{food.name}</p>
                    {isCustomFood(food) ? (
                      <span className="shrink-0 rounded-full border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[9px] font-medium text-accent">
                        내 음식
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {fiberSearch ? (
                      <>
                        1회 · 식이섬유{" "}
                        {Math.round(getFiberPer100g(food) * ((getPieceWeightG(food) ?? 100) / 100) * 10) / 10}
                        g · {food.per100g.calories}kcal
                        · 100g당 {getFiberPer100g(food)}g
                      </>
                    ) : (
                      <>
                        100g · {food.per100g.calories}kcal · 탄수 {food.per100g.carbsG}g
                        · 단백 {food.per100g.proteinG}g
                      </>
                    )}
                  </p>
                </div>
                <span className="text-[11px] text-accent shrink-0">상세</span>
              </button>
            </li>
          ))}
        </ul>
        </>
      ) : null}

      <FoodCartList
        items={cart}
        onRemove={(cartId) =>
          setCart((prev) => prev.filter((item) => item.cartId !== cartId))
        }
        onAdjustServing={(cartId, delta) =>
          setCart((prev) => adjustCartServing(prev, cartId, delta))
        }
        onChangeMealSlot={(cartId, slotId) =>
          setCart((prev) =>
            prev.map((item) =>
              item.cartId === cartId ? { ...item, mealSlotId: slotId } : item
            )
          )
        }
        onCheckout={handleCheckout}
        onClear={() => setCart([])}
        onEditNutrition={openNutritionOverride}
      />

      <div className="pt-1">
        {totals.count > 0 || clearAllUndoSnapshot ? (
          <CollapsibleInlineSection
            title="오늘 적용한 음식"
            summary={`${totals.count}개 · ${formatCalories(totals.calories)}kcal`}
            defaultOpen
            sectionId="food-log-today"
          >
            <NutritionDailySummary
              entries={foodLog.entries}
              targets={targets}
              onSelectFood={openDetail}
              clearAllUndoAvailable={Boolean(clearAllUndoSnapshot)}
              onClearAllOrUndo={handleClearAllOrUndoFoodLog}
              mealSlotUndoAvailable={mealSlotUndoAvailable}
              onClearOrUndoMealSlot={handleClearOrUndoMealSlot}
            />
          </CollapsibleInlineSection>
        ) : null}
      </div>

      <FoodDetailDialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) setRecommendedMenuEdit(null)
        }}
        food={selectedFood}
        targets={targets}
        onAddToCart={handleAddToCart}
        recommendedMenuContext={recommendedMenuEdit}
        onApplyToRecommendedMenu={(servingCount) => {
          if (!recommendedMenuEdit || !selectedFood) return
          recommendedMenuRef.current?.applyMenuItem(
            recommendedMenuEdit.slotId,
            recommendedMenuEdit.itemIndex,
            selectedFood.id,
            servingCount
          )
          setRecommendedMenuEdit(null)
        }}
        onEditCustom={
          selectedFood && isCustomFood(selectedFood)
            ? () => openEditCustomFood(selectedFood)
            : undefined
        }
        onEditNutritionOverride={
          selectedFood && isNutritionOverrideEditable(selectedFood.id)
            ? () => openNutritionOverride(selectedFood.id)
            : undefined
        }
      />

      <FoodNutritionOverrideDialog
        open={overrideDialogOpen}
        onOpenChange={setOverrideDialogOpen}
        food={overrideFood}
        onSaved={() => {
          setNutritionOverrideVersion((v) => v + 1)
          setFoodLog(refreshTodayFoodLogNutrition())
        }}
      />

      <CustomFoodFormDialog
        open={customFormOpen}
        onOpenChange={setCustomFormOpen}
        initialName={customFormInitialName}
        editFood={editCustomFood}
        onSaved={handleCustomFoodSaved}
        onDeleted={handleCustomFoodDeleted}
      />
    </div>
  )
}
