"use client"

import { useCallback, useEffect, useImperativeHandle, useMemo, useState, forwardRef } from "react"
import { ChevronDown, Plus, RefreshCw, Sparkles, Trash2, Undo2, UtensilsCrossed, Bookmark } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  calculateDailyMacroTargets,
  formatCalories,
  DEFAULT_USER_PROFILE,
  loadUserProfile,
  type MacroTargets,
} from "@/lib/user-profile"
import { getTodayScheduleDay, type WeeklyScheduleDay } from "@/lib/weekly-schedule"
import { useHydrated } from "@/hooks/use-hydrated"
import {
  COACHING_DIET_MODE_OPTIONS,
  type DietCoachingMode,
} from "@/lib/diet-coaching"
import {
  buildDailyMealMenuPlan,
  getAddedMenuItemAlternativeCount,
  getMealSlotRefreshOptionCount,
  getRefreshedAddedMenuItemSpec,
  getMenuItemAlternativeCount,
  type DailyMealMenuPlan,
  type MenuItemSlotOverride,
  type RecommendedMenuItem,
  type SavedSlotMenuSpec,
} from "@/lib/meal-menu-recommendations"
import type { FoodDatabaseItem } from "@/lib/food-database"
import { getFoodById, searchFoodDatabase } from "@/lib/food-database"
import { FOOD_MEAL_SLOT_IDS, type FoodMealSlotId } from "@/lib/meal-slot-targets"
import {
  deleteSavedDailyMealMenu,
  deleteSavedMealSlot,
  listSavedDailyMealMenus,
  listSavedMealSlots,
  MEAL_SLOT_LABELS,
  saveDailyMealMenuFromPlan,
  saveMealSlotFromPlan,
  SAVED_MEAL_MENU_EVENT,
  type SavedDailyMealMenuRecord,
  type SavedMealMenuItem,
  type SavedMealSlotRecord,
} from "@/lib/saved-meal-menu-store"

export type RecommendedMenuItemSelectContext = {
  slotId: FoodMealSlotId
  itemIndex: number
  mealLabel: string
  servingCount: number
  /** API 추천 조합 — 오늘 식단에 직접 추가 */
  source?: "api" | "legacy"
  combo?: import("@/lib/food-recommendation-types").RecommendFoodCombo
}

export type RecommendedMealMenuPanelHandle = {
  applyMenuItem: (
    slotId: FoodMealSlotId,
    itemIndex: number,
    foodId: string,
    servings: number
  ) => void
}
import {
  fetchFoodRecommendations,
  loadRecentRecommendationIds,
  loadRecentRecommendedFoodIds,
  loadStrategySettings,
  recommendItemToFoodDatabaseItem,
  saveRecentRecommendationIds,
  saveRecentRecommendedFoodIds,
  saveStrategySettings,
} from "@/lib/food-recommendation-client"
import type { RecommendFoodCombo, RecommendFoodsResponse } from "@/lib/food-recommendation-types"
import type { NutritionStrategySettings } from "@/lib/food-recommendation-strategy"
import { mealTimingToContext } from "@/lib/food-recommendation-strategy"
import { hasTrainingToday, trainingStatusToIntensity } from "@/lib/food-recommendation-strategy"
import {
  DAILY_FOOD_LOG_EVENT,
  loadTodayFoodLog,
  replaceMealSlotFoodLogEntries,
  mealToFoodLogEntries,
} from "@/lib/daily-food-log"
import {
  confirmMealSlot,
  isMealSlotConfirmed,
  unconfirmMealSlot,
  CONFIRMED_MEAL_SLOTS_EVENT,
} from "@/lib/confirmed-meal-slots"
import { MealSlotConfirmButtons } from "@/components/meal-slot-confirm-buttons"
import { formatMacroG, nutritionPercent, sumLoggedNutrition } from "@/lib/food-nutrition-utils"
import {
  NutritionRecommendationPanel,
  RECOMMENDATION_LIST_SCROLL_CLASS,
} from "@/components/recommended-food-combos-view"
import { saveExternalFoodFromSearchResult } from "@/lib/external-food-store"
import { CollapsibleFoldPanel, CollapsibleInlineSection } from "@/components/collapsible-card"
import {
  formatSavedItemsSummary,
  MealSlotSaveLoadBar,
  SaveMealMenuDialog,
  SavedMealMenuPicker,
} from "@/components/meal-slot-save-load-bar"
import { MacroRangeLabel } from "@/components/macro-range-label"
import {
  CollapsibleGroupToolbar,
  CollapsibleSectionProvider,
  useCollapsibleOpen,
} from "@/components/collapsible-section-context"
import { cn } from "@/lib/utils"

function inferDefaultMealSlot(): FoodMealSlotId {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 10) return "breakfast"
  if (hour >= 10 && hour < 15) return "lunch"
  if (hour >= 17 && hour < 22) return "dinner"
  return "snack"
}

type MenuDescriptionMode = "brief" | "detailed"

function MealCoachingHint({
  text,
  mode,
}: {
  text: string
  mode: MenuDescriptionMode
}) {
  if (!text) return null
  if (mode === "brief") {
    return (
      <span className="inline-block rounded border border-border/40 bg-secondary/20 px-1.5 py-0.5 text-[9px] text-muted-foreground">
        {text}
      </span>
    )
  }
  return (
    <p className="text-[10px] leading-relaxed text-muted-foreground">{text}</p>
  )
}

function MenuDescriptionModeToggle({
  mode,
  onToggle,
}: {
  mode: MenuDescriptionMode
  onToggle: () => void
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 px-2.5 text-[11px] border-accent/30 text-accent hover:bg-accent/10 shrink-0"
      onClick={onToggle}
      aria-label={mode === "brief" ? "설명 상세히 보기" : "설명 간략히 보기"}
    >
      {mode === "brief" ? "설명 상세히" : "설명 간략히"}
    </Button>
  )
}

function ScopeToggle({
  value,
  onChange,
}: {
  value: "daily" | "perMeal"
  onChange: (value: "daily" | "perMeal") => void
}) {
  return (
    <div className="flex rounded-lg bg-secondary/50 p-0.5 gap-0.5">
      {(
        [
          { id: "daily" as const, label: "오늘 섭취량" },
          { id: "perMeal" as const, label: "끼니별" },
        ] as const
      ).map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={cn(
            "flex-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
            value === item.id
              ? "bg-accent/15 text-accent ring-1 ring-accent/30"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {item.id === "daily" ? (
            <span className="block leading-tight text-center">
              <span className="block">오늘</span>
              <span className="block">섭취량</span>
            </span>
          ) : (
            item.label
          )}
        </button>
      ))}
    </div>
  )
}

function MacroCard({
  label,
  value,
  target,
  unit,
  pct,
  formatValue,
  children,
}: {
  label: string
  value: number
  target: number
  unit: string
  pct: number
  formatValue?: (value: number) => string
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/40 px-3 py-2.5 min-w-0">
      <div className="flex flex-nowrap items-center justify-between gap-1.5 mb-1.5 min-w-0">
        <span className="text-[11px] font-medium text-foreground whitespace-nowrap shrink-0">
          {label}
        </span>
        <span className="text-[10px] sm:text-[11px] tabular-nums text-muted-foreground whitespace-nowrap shrink-0 text-right">
          <MacroRangeLabel
            value={value}
            target={target}
            unit={unit}
            formatValue={formatValue}
          />
        </span>
      </div>
      <Progress value={pct} className="h-1.5" />
      {children}
    </div>
  )
}

function MacroMiniRow({
  label,
  value,
  target,
  unit,
  nested,
}: {
  label: string
  value: number
  target: number
  unit: string
  nested?: boolean
}) {
  const pct = nutritionPercent(value, target)
  const format = unit === "kcal" || unit === "mg" ? formatCalories : formatMacroG

  return (
    <div className={nested ? "pl-2" : undefined}>
      <div className="flex flex-nowrap justify-between gap-1.5 text-[10px] tabular-nums min-w-0">
        <span className="text-muted-foreground whitespace-nowrap shrink-0">
          {nested ? "└ " : ""}
          {label}
        </span>
        <span className="text-muted-foreground whitespace-nowrap shrink-0 text-right">
          <MacroRangeLabel value={value} target={target} unit={unit} formatValue={format} />
        </span>
      </div>
      {target > 0 ? (
        <Progress
          value={pct}
          className={cn("h-1", nested && "ml-2")}
        />
      ) : null}
    </div>
  )
}

function RecommendedMenuDailyGraph({
  plan,
  targets,
}: {
  plan: DailyMealMenuPlan
  targets: MacroTargets
}) {
  const totals = plan.dailyNutrition
  const slotTargets = targets.perMealBySlot ?? {}

  const dailyPct = {
    calories: nutritionPercent(totals.calories, targets.calories),
    carbs: nutritionPercent(totals.carbsG, targets.carbsG),
    protein: nutritionPercent(totals.proteinG, targets.proteinG),
    fat: nutritionPercent(totals.fatG, targets.fatG),
    sodium: nutritionPercent(totals.sodiumMg, targets.sodiumMg),
    sugar: nutritionPercent(totals.sugarG ?? 0, targets.sugarG),
    fiber: nutritionPercent(totals.fiberG ?? 0, targets.fiberG),
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <MacroCard
        label="칼로리"
        value={totals.calories}
        target={targets.calories}
        unit=""
        pct={dailyPct.calories}
        formatValue={formatCalories}
      >
        <div className="mt-2 space-y-1 pl-1 border-l border-accent/20 ml-0.5">
          {plan.meals.map((meal) => {
            const slotTarget = slotTargets[meal.slotId]?.calories ?? meal.targetCalories
            const pct = nutritionPercent(meal.nutrition.calories, slotTarget)
            return (
              <div key={meal.slotId}>
                <div className="flex flex-nowrap justify-between gap-1.5 text-[10px] pl-2 min-w-0">
                  <span className="text-muted-foreground whitespace-nowrap shrink-0">
                    └ {meal.label}
                  </span>
                  <span className="tabular-nums text-muted-foreground whitespace-nowrap shrink-0 text-right">
                    <MacroRangeLabel
                      value={meal.nutrition.calories}
                      target={slotTarget}
                      unit=""
                      formatValue={formatCalories}
                    />
                  </span>
                </div>
                <Progress value={pct} className="h-1 ml-2" />
              </div>
            )
          })}
        </div>
      </MacroCard>

      <MacroCard
        label="단백질"
        value={totals.proteinG}
        target={targets.proteinG}
        unit="g"
        pct={dailyPct.protein}
      />

      <MacroCard
        label="탄수화물"
        value={totals.carbsG}
        target={targets.carbsG}
        unit="g"
        pct={dailyPct.carbs}
      >
        <div className="mt-2 space-y-1 pl-1 border-l border-accent/20 ml-0.5">
          <MacroMiniRow
            label="당류"
            value={totals.sugarG ?? 0}
            target={targets.sugarG}
            unit="g"
            nested
          />
          <MacroMiniRow
            label="식이섬유"
            value={totals.fiberG ?? 0}
            target={targets.fiberG}
            unit="g"
            nested
          />
        </div>
      </MacroCard>

      <MacroCard
        label="지방"
        value={totals.fatG}
        target={targets.fatG}
        unit="g"
        pct={dailyPct.fat}
      />

      <MacroCard
        label="나트륨"
        value={totals.sodiumMg}
        target={targets.sodiumMg}
        unit="mg"
        pct={dailyPct.sodium}
        formatValue={formatCalories}
      />
    </div>
  )
}

function RecommendedMenuItemEditDialog({
  itemName,
  mealLabel,
  onReplace,
  onDelete,
}: {
  itemName: string
  mealLabel: string
  onReplace: (food: FoodDatabaseItem) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const results = useMemo(
    () => (query.trim() ? searchFoodDatabase(query.trim(), 16) : []),
    [query]
  )

  const closeDialog = () => {
    setOpen(false)
    setQuery("")
  }

  const handleReplace = (food: FoodDatabaseItem) => {
    onReplace(food)
    closeDialog()
  }

  const handleDelete = () => {
    onDelete()
    closeDialog()
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className="shrink-0 p-2 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-md transition-colors"
        aria-label={`${mealLabel} ${itemName} 변경·삭제`}
        title="음식 변경·삭제"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setQuery("")
        }}
      >
        <DialogContent
          showCloseButton
          className="bg-card border-border max-w-sm p-0 gap-0"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader className="px-4 pt-4 pb-2 border-b border-border/60">
            <DialogTitle className="text-sm">
              {mealLabel} · {itemName}
            </DialogTitle>
            <p className="text-[11px] text-muted-foreground font-normal">
              이 끼니 메뉴에서만 변경·삭제됩니다
            </p>
          </DialogHeader>
          <div className="px-4 py-3 space-y-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="바꿀 음식 검색"
              className="h-9 text-[12px]"
              autoFocus
            />
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {query.trim() && results.length === 0 ? (
                <p className="text-[10px] text-muted-foreground px-1 py-2">
                  검색 결과가 없어요
                </p>
              ) : null}
              {results.map((food) => (
                <button
                  key={food.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleReplace(food)
                  }}
                  className="w-full rounded-md px-2.5 py-2 text-left text-[11px] hover:bg-secondary/60 transition-colors"
                >
                  <span className="font-medium text-foreground">{food.name}</span>
                  <span className="text-muted-foreground ml-1">
                    · {formatCalories(food.per100g.calories)}kcal/100g
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleDelete()
              }}
              className="w-full flex items-center justify-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/5 px-2 py-2 text-[11px] font-medium text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              이 항목 삭제
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function RecommendedMenuAddItemButton({
  mealLabel,
  onAdd,
}: {
  mealLabel: string
  onAdd: (food: FoodDatabaseItem) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const results = useMemo(
    () => (query.trim() ? searchFoodDatabase(query.trim(), 16) : []),
    [query]
  )

  const closeDialog = () => {
    setOpen(false)
    setQuery("")
  }

  const handleAdd = (food: FoodDatabaseItem) => {
    onAdd(food)
    closeDialog()
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/60 bg-background/20 px-2 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-accent/40 hover:bg-accent/5 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        메뉴 추가
      </button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setQuery("")
        }}
      >
        <DialogContent
          showCloseButton
          className="bg-card border-border max-w-sm p-0 gap-0"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader className="px-4 pt-4 pb-2 border-b border-border/60">
            <DialogTitle className="text-sm">{mealLabel} · 메뉴 추가</DialogTitle>
            <p className="text-[11px] text-muted-foreground font-normal">
              이 끼니 메뉴에 음식을 추가합니다
            </p>
          </DialogHeader>
          <div className="px-4 py-3 space-y-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="추가할 음식 검색"
              className="h-9 text-[12px]"
              autoFocus
            />
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {query.trim() && results.length === 0 ? (
                <p className="text-[10px] text-muted-foreground px-1 py-2">
                  검색 결과가 없어요
                </p>
              ) : null}
              {results.map((food) => (
                <button
                  key={food.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleAdd(food)
                  }}
                  className="w-full rounded-md px-2.5 py-2 text-left text-[11px] hover:bg-secondary/60 transition-colors"
                >
                  <span className="font-medium text-foreground">{food.name}</span>
                  {food.category ? (
                    <span className="ml-1.5 text-[10px] text-muted-foreground">
                      {food.category}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function RecommendedMenuItemRow({
  item,
  itemIndex,
  slotId,
  mealLabel,
  canRefresh,
  onRefresh,
  onReplace,
  onDelete,
  onSelectFood,
}: {
  item: RecommendedMenuItem
  itemIndex: number
  slotId: FoodMealSlotId
  mealLabel: string
  canRefresh?: boolean
  onRefresh?: () => void
  onReplace?: (food: FoodDatabaseItem) => void
  onDelete?: () => void
  onSelectFood?: (
    food: FoodDatabaseItem,
    context: RecommendedMenuItemSelectContext
  ) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const n = item.nutrition

  return (
    <li className="rounded-lg border border-border/40 bg-background/30 overflow-hidden">
      <div className="flex items-start gap-1">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 p-2 text-muted-foreground hover:text-foreground"
          aria-label="영양 상세 펼치기"
        >
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")}
          />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (!onSelectFood) return
            const food = getFoodById(item.foodId)
            if (food) {
              onSelectFood(food, {
                slotId,
                itemIndex,
                mealLabel,
                servingCount: item.servings,
              })
            }
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className={cn(
            "flex-1 min-w-0 py-2 pr-1 text-left",
            onSelectFood ? "hover:bg-accent/5" : "cursor-default"
          )}
        >
          <p className="text-[11px] font-semibold leading-snug">{item.name}</p>
          <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
            {item.displayAmount} · {formatCalories(item.calories)}kcal
          </p>
        </button>
        <div
          className="flex flex-col shrink-0 py-0.5"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {canRefresh && onRefresh ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRefresh()
              }}
              className="p-2 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-md transition-colors"
              aria-label={`${item.name} 다른 구성으로 바꾸기`}
              title="다른 음식으로 바꾸기"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {onReplace && onDelete ? (
            <RecommendedMenuItemEditDialog
              itemName={item.name}
              mealLabel={mealLabel}
              onReplace={onReplace}
              onDelete={onDelete}
            />
          ) : null}
        </div>
      </div>
      {expanded ? (
        <div className="px-3 pb-2.5 pt-0 border-t border-border/30 mx-2 mb-1 space-y-1">
          {(
            [
              ["칼로리", `${formatCalories(n.calories)}kcal`],
              ["탄수화물", `${formatMacroG(n.carbsG)}g`],
              ["단백질", `${formatMacroG(n.proteinG)}g`],
              ["지방", `${formatMacroG(n.fatG)}g`],
              ["당류", `${formatMacroG(n.sugarG ?? 0)}g`],
              ["식이섬유", `${formatMacroG(n.fiberG ?? 0)}g`],
              ["나트륨", `${formatCalories(n.sodiumMg)}mg`],
            ] as const
          ).map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between text-[10px] tabular-nums"
            >
              <span className="text-muted-foreground">{label}</span>
              <span>{value}</span>
            </div>
          ))}
          <p className="text-[9px] text-muted-foreground/80 pt-0.5">
            100g당 영양 기준 · 섭취 {item.grams}g
          </p>
        </div>
      ) : null}
    </li>
  )
}

type MealSlotCompositionUndoSnapshot = {
  savedSlotSpec?: SavedSlotMenuSpec
  itemSlotOverrides: Record<string, MenuItemSlotOverride>
  itemRefreshCounts: Record<string, number>
  slotFrozenSpec?: { foodId: string; servings: number }[]
  slotRefreshCount?: number
}

type AllMealsCompositionUndoSnapshot = Partial<
  Record<FoodMealSlotId, MealSlotCompositionUndoSnapshot>
>

function pickSlotRecord<T extends Record<string, unknown>>(
  record: T,
  slotId: FoodMealSlotId
): Record<string, T[keyof T]> {
  const prefix = `${slotId}:`
  return Object.fromEntries(
    Object.entries(record).filter(([key]) => key.startsWith(prefix))
  ) as Record<string, T[keyof T]>
}

function cloneSavedSlotSpec(spec: SavedSlotMenuSpec): SavedSlotMenuSpec {
  return {
    ...spec,
    items: spec.items.map((item) => ({ ...item })),
  }
}

function buildMealSlotUndoSnapshot(
  slotId: FoodMealSlotId,
  savedSlotSpecs: Partial<Record<FoodMealSlotId, SavedSlotMenuSpec>>,
  itemSlotOverrides: Record<string, MenuItemSlotOverride>,
  itemRefreshCounts: Record<string, number>,
  slotFrozenSpecs: Partial<Record<FoodMealSlotId, { foodId: string; servings: number }[]>>,
  slotRefreshCounts: Partial<Record<FoodMealSlotId, number>>
): MealSlotCompositionUndoSnapshot {
  const savedSlotSpec = savedSlotSpecs[slotId]
  return {
    savedSlotSpec: savedSlotSpec
      ? cloneSavedSlotSpec(savedSlotSpec)
      : undefined,
    itemSlotOverrides: pickSlotRecord(itemSlotOverrides, slotId),
    itemRefreshCounts: pickSlotRecord(itemRefreshCounts, slotId),
    slotFrozenSpec: slotFrozenSpecs[slotId]?.map((item) => ({ ...item })),
    slotRefreshCount: slotRefreshCounts[slotId],
  }
}

function MealSlotActionButtons({
  meal,
  undoAvailable = false,
  isConfirmed = false,
  onClearOrUndo,
  onApply,
  onUnlock,
}: {
  meal: DailyMealMenuPlan["meals"][number]
  undoAvailable?: boolean
  isConfirmed?: boolean
  onClearOrUndo: (meal: DailyMealMenuPlan["meals"][number]) => void
  onApply: (meal: DailyMealMenuPlan["meals"][number]) => void
  onUnlock: (meal: DailyMealMenuPlan["meals"][number]) => void
}) {
  return (
    <MealSlotConfirmButtons
      hasItems={meal.items.length > 0}
      undoAvailable={undoAvailable}
      isConfirmed={isConfirmed}
      onClearOrUndo={() => onClearOrUndo(meal)}
      onConfirm={() => onApply(meal)}
      onUnlock={() => onUnlock(meal)}
    />
  )
}

function AllMealsActionButtons({
  undoAvailable = false,
  canClear,
  canApply,
  allConfirmed = false,
  anyConfirmed = false,
  onClearOrUndo,
  onApplyAll,
  onUnlockAll,
}: {
  undoAvailable?: boolean
  canClear: boolean
  canApply: boolean
  allConfirmed?: boolean
  anyConfirmed?: boolean
  onClearOrUndo: () => void
  onApplyAll: () => void
  onUnlockAll: () => void
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={anyConfirmed || (!undoAvailable && !canClear)}
        onClick={onClearOrUndo}
        className={cn(
          "flex-1 h-9 rounded-lg text-[11px] font-semibold transition-colors inline-flex items-center justify-center gap-1",
          undoAvailable
            ? "border border-accent/35 bg-accent/10 text-accent hover:bg-accent/20"
            : "border border-border/60 bg-background/30 text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5",
          "disabled:opacity-40 disabled:pointer-events-none"
        )}
      >
        {undoAvailable ? (
          <>
            <Undo2 className="h-3.5 w-3.5" />
            되돌리기
          </>
        ) : (
          "모두 비우기"
        )}
      </button>
      <button
        type="button"
        disabled={!canApply}
        onClick={() => (allConfirmed ? onUnlockAll() : onApplyAll())}
        className={cn(
          "flex-1 h-9 rounded-lg text-[11px] font-semibold transition-colors",
          allConfirmed
            ? "border border-amber-500/35 bg-amber-500/10 text-amber-400 hover:bg-amber-500/15"
            : "border border-accent/35 bg-accent/10 text-accent hover:bg-accent/20",
          "disabled:opacity-40 disabled:pointer-events-none"
        )}
      >
        {allConfirmed ? "전체 수정" : "모두 결정"}
      </button>
    </div>
  )
}

function MealSlotRefreshButton({
  mealLabel,
  onRefresh,
}: {
  mealLabel: string
  onRefresh: () => void
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onRefresh()
      }}
      onMouseDown={(e) => e.stopPropagation()}
      className="h-6 w-6 flex items-center justify-center shrink-0 rounded-md text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
      aria-label={`${mealLabel} 메뉴 새로고침`}
      title="다른 메뉴 구성으로 바꾸기"
    >
      <RefreshCw className="h-3.5 w-3.5" />
    </button>
  )
}

function MealMenuCompositionCard({
  meal,
  loadRevision = 0,
  onSelectFood,
  onRefreshItem,
  canRefreshItem,
  onRefreshSlot,
  canRefreshSlot,
  onReplaceItem,
  onDeleteItem,
  onAddItem,
  savedSlots,
  onSaveSlot,
  onLoadSlot,
  onDeleteSavedSlot,
  onApplyToNutrition,
  onUnlockFromNutrition,
  onClearOrUndo,
  undoAvailable = false,
  isConfirmed = false,
  descriptionMode = "brief",
  defaultOpen = false,
}: {
  meal: DailyMealMenuPlan["meals"][number]
  loadRevision?: number
  onSelectFood?: (
    food: FoodDatabaseItem,
    context: RecommendedMenuItemSelectContext
  ) => void
  onRefreshItem?: (slotId: FoodMealSlotId, itemIndex: number) => void
  canRefreshItem?: (slotId: FoodMealSlotId, itemIndex: number) => boolean
  onRefreshSlot?: (slotId: FoodMealSlotId) => void
  canRefreshSlot?: boolean
  onReplaceItem?: (
    slotId: FoodMealSlotId,
    itemIndex: number,
    food: FoodDatabaseItem,
    addOverrideKey?: string
  ) => void
  onDeleteItem?: (
    slotId: FoodMealSlotId,
    itemIndex: number,
    addOverrideKey?: string
  ) => void
  onAddItem?: (slotId: FoodMealSlotId, food: FoodDatabaseItem) => void
  savedSlots: SavedMealSlotRecord[]
  onSaveSlot: (meal: DailyMealMenuPlan["meals"][number], name: string) => void
  onLoadSlot: (record: SavedMealSlotRecord) => void
  onDeleteSavedSlot: (id: string) => void
  onApplyToNutrition: (meal: DailyMealMenuPlan["meals"][number]) => void
  onUnlockFromNutrition: (meal: DailyMealMenuPlan["meals"][number]) => void
  onClearOrUndo: (meal: DailyMealMenuPlan["meals"][number]) => void
  undoAvailable?: boolean
  isConfirmed?: boolean
  descriptionMode?: MenuDescriptionMode
  defaultOpen?: boolean
}) {
  const itemSummary = meal.items.map((item) => item.name).join(" · ")
  const locked = isConfirmed
  const coachingText =
    descriptionMode === "brief"
      ? meal.coachingNoteBrief
      : meal.coachingNote
  const expandedByDefault = descriptionMode === "detailed"

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden",
      locked ? "border-accent/30 bg-accent/5" : "border-border/50 bg-secondary/15"
    )}>
    <CollapsibleFoldPanel
      defaultOpen={defaultOpen ?? expandedByDefault}
      sectionId={`recommended-meal-${meal.slotId}-composition`}
      className="border-0 rounded-none bg-transparent"
      toolbar={
        canRefreshSlot && onRefreshSlot && !locked ? (
          <MealSlotRefreshButton
            mealLabel={meal.label}
            onRefresh={() => onRefreshSlot(meal.slotId)}
          />
        ) : null
      }
      header={
        <>
          <div className="flex items-center gap-1.5">
            <p className="text-[11px] font-semibold text-accent leading-snug">{meal.label}</p>
            {locked ? (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[9px] font-medium text-accent">
                결정됨
              </span>
            ) : null}
          </div>
          <p className="text-[12px] font-medium mt-0.5 leading-snug">{meal.title}</p>
        </>
      }
      summary={
        descriptionMode === "brief" ? (
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
            {formatCalories(meal.nutrition.calories)}kcal · {coachingText}
          </p>
        ) : (
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
            {meal.items.length}개 · {itemSummary}
          </p>
        )
      }
    >
      <ul className="space-y-1">
        {meal.items.map((item, itemIndex) => (
          <RecommendedMenuItemRow
            key={`${meal.slotId}-${loadRevision}-${itemIndex}-${item.foodId}`}
            item={item}
            itemIndex={itemIndex}
            slotId={meal.slotId}
            mealLabel={meal.label}
            canRefresh={!locked && canRefreshItem?.(meal.slotId, itemIndex)}
            onRefresh={
              !locked && onRefreshItem
                ? () => onRefreshItem(meal.slotId, itemIndex)
                : undefined
            }
            onReplace={
              !locked && onReplaceItem
                ? (food) =>
                    onReplaceItem(
                      meal.slotId,
                      itemIndex,
                      food,
                      item.addOverrideKey
                    )
                : undefined
            }
            onDelete={
              !locked && onDeleteItem
                ? () =>
                    onDeleteItem(meal.slotId, itemIndex, item.addOverrideKey)
                : undefined
            }
            onSelectFood={!locked ? onSelectFood : undefined}
          />
        ))}
      </ul>

      {!locked && onAddItem ? (
        <RecommendedMenuAddItemButton
          mealLabel={meal.label}
          onAdd={(food) => onAddItem(meal.slotId, food)}
        />
      ) : null}

      {descriptionMode === "detailed" ? (
        <MealCoachingHint text={coachingText} mode={descriptionMode} />
      ) : null}
    </CollapsibleFoldPanel>
    <div className="px-3 pb-2.5 pt-1 border-t border-border/30 space-y-2">
      {!locked ? (
        <MealSlotSaveLoadBar
          slotId={meal.slotId}
          mealLabel={meal.label}
          savedSlots={savedSlots}
          saveDisabled={meal.items.length === 0}
          onSave={(name) => onSaveSlot(meal, name)}
          onLoadSlot={onLoadSlot}
          onDeleteSlot={onDeleteSavedSlot}
        />
      ) : null}
      <MealSlotActionButtons
        meal={meal}
        undoAvailable={undoAvailable}
        isConfirmed={isConfirmed}
        onClearOrUndo={onClearOrUndo}
        onApply={onApplyToNutrition}
        onUnlock={onUnlockFromNutrition}
      />
    </div>
    </div>
  )
}

function MealMenuCard({
  meal,
  loadRevision = 0,
  onSelectFood,
  onRefreshItem,
  canRefreshItem,
  onRefreshSlot,
  canRefreshSlot,
  onReplaceItem,
  onDeleteItem,
  onAddItem,
  savedSlots,
  onSaveSlot,
  onLoadSlot,
  onDeleteSavedSlot,
  onApplyToNutrition,
  onUnlockFromNutrition,
  onClearOrUndo,
  undoAvailable = false,
  isConfirmed = false,
  descriptionMode = "brief",
  defaultOpen,
}: {
  meal: DailyMealMenuPlan["meals"][number]
  loadRevision?: number
  onSelectFood?: (
    food: FoodDatabaseItem,
    context: RecommendedMenuItemSelectContext
  ) => void
  onRefreshItem?: (slotId: FoodMealSlotId, itemIndex: number) => void
  canRefreshItem?: (slotId: FoodMealSlotId, itemIndex: number) => boolean
  onRefreshSlot?: (slotId: FoodMealSlotId) => void
  canRefreshSlot?: boolean
  onReplaceItem?: (
    slotId: FoodMealSlotId,
    itemIndex: number,
    food: FoodDatabaseItem,
    addOverrideKey?: string
  ) => void
  onDeleteItem?: (
    slotId: FoodMealSlotId,
    itemIndex: number,
    addOverrideKey?: string
  ) => void
  onAddItem?: (slotId: FoodMealSlotId, food: FoodDatabaseItem) => void
  savedSlots: SavedMealSlotRecord[]
  onSaveSlot: (meal: DailyMealMenuPlan["meals"][number], name: string) => void
  onLoadSlot: (record: SavedMealSlotRecord) => void
  onDeleteSavedSlot: (id: string) => void
  onApplyToNutrition: (meal: DailyMealMenuPlan["meals"][number]) => void
  onUnlockFromNutrition: (meal: DailyMealMenuPlan["meals"][number]) => void
  onClearOrUndo: (meal: DailyMealMenuPlan["meals"][number]) => void
  undoAvailable?: boolean
  isConfirmed?: boolean
  descriptionMode?: MenuDescriptionMode
  defaultOpen?: boolean
}) {
  const t = meal.slotTargets
  const n = meal.nutrition
  const locked = isConfirmed
  const coachingText =
    descriptionMode === "brief"
      ? meal.coachingNoteBrief
      : meal.coachingNote
  const expandedByDefault = descriptionMode === "detailed"

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden",
      locked ? "border-accent/30 bg-accent/5" : "border-border/50 bg-secondary/15"
    )}>
    <CollapsibleFoldPanel
      defaultOpen={defaultOpen ?? expandedByDefault}
      sectionId={`recommended-meal-${meal.slotId}-detail`}
      className="border-0 rounded-none bg-transparent"
      toolbar={
        canRefreshSlot && onRefreshSlot && !locked ? (
          <MealSlotRefreshButton
            mealLabel={meal.label}
            onRefresh={() => onRefreshSlot(meal.slotId)}
          />
        ) : null
      }
      header={
        <>
          <div className="flex items-center gap-1.5">
            <p className="text-[11px] font-semibold text-accent leading-snug">{meal.label}</p>
            {locked ? (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[9px] font-medium text-accent">
                결정됨
              </span>
            ) : null}
          </div>
          <p className="text-[12px] font-medium mt-0.5 leading-snug">{meal.title}</p>
        </>
      }
      summary={
        descriptionMode === "brief" ? (
          <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5 truncate">
            {formatCalories(n.calories)}kcal · {coachingText}
          </p>
        ) : (
          <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
            {formatCalories(n.calories)}kcal · {meal.items.length}개 음식
          </p>
        )
      }
    >
      {descriptionMode === "detailed" ? (
      <div className="space-y-1.5 rounded-lg border border-border/40 bg-background/30 px-2 py-2">
        <MacroMiniRow
          label="칼로리"
          value={n.calories}
          target={t.calories}
          unit="kcal"
        />
        <MacroMiniRow
          label="단백질"
          value={n.proteinG}
          target={t.proteinG}
          unit="g"
        />
        <MacroMiniRow
          label="탄수화물"
          value={n.carbsG}
          target={t.carbsG}
          unit="g"
        />
        <MacroMiniRow
          label="당류"
          value={n.sugarG ?? 0}
          target={t.sugarG}
          unit="g"
          nested
        />
        <MacroMiniRow
          label="지방"
          value={n.fatG}
          target={t.fatG}
          unit="g"
        />
      </div>
      ) : null}

      <ul className="space-y-1">
        {meal.items.map((item, itemIndex) => (
          <RecommendedMenuItemRow
            key={`${meal.slotId}-${loadRevision}-${itemIndex}-${item.foodId}`}
            item={item}
            itemIndex={itemIndex}
            slotId={meal.slotId}
            mealLabel={meal.label}
            canRefresh={!locked && canRefreshItem?.(meal.slotId, itemIndex)}
            onRefresh={
              !locked && onRefreshItem
                ? () => onRefreshItem(meal.slotId, itemIndex)
                : undefined
            }
            onReplace={
              !locked && onReplaceItem
                ? (food) =>
                    onReplaceItem(
                      meal.slotId,
                      itemIndex,
                      food,
                      item.addOverrideKey
                    )
                : undefined
            }
            onDelete={
              !locked && onDeleteItem
                ? () =>
                    onDeleteItem(meal.slotId, itemIndex, item.addOverrideKey)
                : undefined
            }
            onSelectFood={!locked ? onSelectFood : undefined}
          />
        ))}
      </ul>

      {!locked && onAddItem ? (
        <RecommendedMenuAddItemButton
          mealLabel={meal.label}
          onAdd={(food) => onAddItem(meal.slotId, food)}
        />
      ) : null}

      {descriptionMode === "detailed" ? (
        <MealCoachingHint text={coachingText} mode={descriptionMode} />
      ) : null}
    </CollapsibleFoldPanel>
    <div className="px-3 pb-2.5 pt-1 border-t border-border/30 space-y-2">
      {!locked ? (
        <MealSlotSaveLoadBar
          slotId={meal.slotId}
          mealLabel={meal.label}
          savedSlots={savedSlots}
          saveDisabled={meal.items.length === 0}
          onSave={(name) => onSaveSlot(meal, name)}
          onLoadSlot={onLoadSlot}
          onDeleteSlot={onDeleteSavedSlot}
        />
      ) : null}
      <MealSlotActionButtons
        meal={meal}
        undoAvailable={undoAvailable}
        isConfirmed={isConfirmed}
        onClearOrUndo={onClearOrUndo}
        onApply={onApplyToNutrition}
        onUnlock={onUnlockFromNutrition}
      />
    </div>
    </div>
  )
}

function CoachingModeSelect({
  value,
  onChange,
}: {
  value: DietCoachingMode
  onChange: (mode: DietCoachingMode) => void
}) {
  const [open, setOpen] = useState(false)
  const current = COACHING_DIET_MODE_OPTIONS.find((option) => option.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="h-7 max-w-[9.5rem] shrink-0 rounded-full border border-accent/30 bg-accent/10 px-2 text-[9px] font-medium text-accent outline-none hover:bg-accent/15 flex items-center gap-0.5"
          aria-label="감량 모드 선택"
        >
          <span className="truncate">{current?.label}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-36 p-1 bg-card border-border">
        {COACHING_DIET_MODE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onChange(option.value)
              setOpen(false)
            }}
            className={cn(
              "w-full rounded-md px-2.5 py-1.5 text-left text-[11px] transition-colors",
              value === option.value
                ? "bg-accent/15 text-accent font-medium"
                : "text-foreground hover:bg-secondary/60"
            )}
          >
            {option.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

function TrainingReflectToggle({
  schedule,
  reflectTraining,
  onToggle,
}: {
  schedule: WeeklyScheduleDay | null
  reflectTraining: boolean
  onToggle: () => void
}) {
  if (!schedule || schedule.type === "휴식") return null

  const label = reflectTraining
    ? `오늘 ${schedule.type} · 훈련량 반영`
    : "훈련량 미반영"

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className={cn(
        "mt-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
        reflectTraining
          ? "border-accent/30 bg-accent/10 text-accent hover:bg-accent/15"
          : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
      )}
    >
      {label}
    </button>
  )
}

export const RecommendedMealMenuPanel = forwardRef<
  RecommendedMealMenuPanelHandle,
  {
    targets: MacroTargets
    onSelectFood?: (
      food: FoodDatabaseItem,
      context: RecommendedMenuItemSelectContext
    ) => void
    onApplyCombo?: (combo: RecommendFoodCombo) => void
    className?: string
  }
>(function RecommendedMealMenuPanel({ targets, onSelectFood, onApplyCombo, className }, ref) {
  const hydrated = useHydrated()
  const [recommendationMode, setRecommendationMode] = useState<"api" | "legacy">(
    "api"
  )
  const [apiResponse, setApiResponse] = useState<RecommendFoodsResponse | null>(
    null
  )
  const [apiLoading, setApiLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [variantSeed, setVariantSeed] = useState(0)
  const [requested, setRequested] = useState(false)
  const [strategySettings, setStrategySettings] = useState<NutritionStrategySettings>(
    () => loadStrategySettings()
  )
  const [variantIndex, setVariantIndex] = useState(0)
  const [itemRefreshCounts, setItemRefreshCounts] = useState<Record<string, number>>({})
  const [itemSlotOverrides, setItemSlotOverrides] = useState<
    Record<string, MenuItemSlotOverride>
  >({})
  const [savedSlotSpecs, setSavedSlotSpecs] = useState<
    Partial<Record<FoodMealSlotId, SavedSlotMenuSpec>>
  >({})
  const [slotFrozenSpecs, setSlotFrozenSpecs] = useState<
    Partial<Record<FoodMealSlotId, { foodId: string; servings: number }[]>>
  >({})
  const [slotRefreshCounts, setSlotRefreshCounts] = useState<
    Partial<Record<FoodMealSlotId, number>>
  >({})
  const [slotUndoSnapshots, setSlotUndoSnapshots] = useState<
    Partial<Record<FoodMealSlotId, MealSlotCompositionUndoSnapshot>>
  >({})
  const [allMealsUndoSnapshot, setAllMealsUndoSnapshot] =
    useState<AllMealsCompositionUndoSnapshot | null>(null)
  const [savedListVersion, setSavedListVersion] = useState(0)
  const [menuLoadRevision, setMenuLoadRevision] = useState(0)
  const [slotLoadRevisions, setSlotLoadRevisions] = useState<
    Partial<Record<FoodMealSlotId, number>>
  >({})
  const [dailySaveOpen, setDailySaveOpen] = useState(false)
  const [confirmedVersion, setConfirmedVersion] = useState(0)
  const [scope, setScope] = useState<"daily" | "perMeal">("daily")
  const [descriptionMode, setDescriptionMode] =
    useState<MenuDescriptionMode>("brief")
  const [panelOpen, setPanelOpen] = useCollapsibleOpen("recommended-meal-menu", true)
  const profile = useMemo(
    () => (hydrated ? loadUserProfile() : { ...DEFAULT_USER_PROFILE }),
    [hydrated, requested, variantIndex]
  )
  const actualSchedule = useMemo(
    (): WeeklyScheduleDay | null => (hydrated ? getTodayScheduleDay() : null),
    [hydrated]
  )
  const [reflectTraining, setReflectTraining] = useState(true)
  const effectiveSchedule = useMemo(
    () => (reflectTraining ? actualSchedule : null),
    [reflectTraining, actualSchedule]
  )
  const isLossGoal = profile.goalType === "loss"
  const [coachingMode, setCoachingMode] = useState<DietCoachingMode>(() => {
    if (targets.breakdown.coachingMode === "fast_loss") return "fast_loss"
    return "normal_loss"
  })

  const activeCoachingMode = isLossGoal
    ? coachingMode
    : targets.breakdown.coachingMode ?? null

  useEffect(() => {
    if (!hydrated) return
    setStrategySettings(loadStrategySettings())
  }, [hydrated])

  useEffect(() => {
    if (!hydrated) return
    const sync = () => setConfirmedVersion((version) => version + 1)
    window.addEventListener(CONFIRMED_MEAL_SLOTS_EVENT, sync)
    window.addEventListener(DAILY_FOOD_LOG_EVENT, sync)
    return () => {
      window.removeEventListener(CONFIRMED_MEAL_SLOTS_EVENT, sync)
      window.removeEventListener(DAILY_FOOD_LOG_EVENT, sync)
    }
  }, [hydrated])

  const handleStrategyChange = useCallback(
    (patch: Partial<NutritionStrategySettings>) => {
      setStrategySettings((prev) => {
        const next = { ...prev, ...patch }
        saveStrategySettings(next)
        return next
      })
    },
    []
  )

  const fetchSmartRecommendations = useCallback(
    async (seed = variantSeed) => {
      setApiLoading(true)
      setApiError(null)
      try {
        const consumed = hydrated
          ? sumLoggedNutrition(loadTodayFoodLog().entries)
          : sumLoggedNutrition([])

        const { data, message } = await fetchFoodRecommendations({
          targets: {
            calories: targets.calories,
            proteinG: targets.proteinG,
            carbsG: targets.carbsG,
            fatG: targets.fatG,
            fiberG: targets.fiberG,
            sodiumMg: targets.sodiumMg,
            sugarG: targets.sugarG,
          },
          consumed,
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
        })

        if (data?.recommendations.length) {
          setApiResponse(data)
          setApiError(null)
          saveRecentRecommendationIds(data.recommendations.map((r) => r.id))
          saveRecentRecommendedFoodIds(
            data.recommendations.flatMap((r) => r.items.map((i) => i.id))
          )
        } else {
          setApiResponse(data)
          setApiError(
            message ??
              "현재 조건에 맞는 추천을 찾지 못했습니다. 조건을 조금 완화해서 다시 추천해볼게요."
          )
        }
      } catch {
        setApiError(
          "추천 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
        )
      } finally {
        setApiLoading(false)
      }
    },
    [
      variantSeed,
      hydrated,
      targets,
      strategySettings,
    ]
  )

  const handleRequestSmartRecommendations = useCallback(() => {
    setRecommendationMode("api")
    setRequested(true)
    setVariantSeed(0)
    void fetchSmartRecommendations(0)
  }, [fetchSmartRecommendations])

  const handleRefreshSmartRecommendations = useCallback(() => {
    const next = variantSeed + 1
    setVariantSeed(next)
    void fetchSmartRecommendations(next)
  }, [variantSeed, fetchSmartRecommendations])

  const handleSelectRecommendItem = useCallback(
    (
      item: RecommendFoodsResponse["recommendations"][number]["items"][number],
      combo: RecommendFoodsResponse["recommendations"][number]
    ) => {
      const food = recommendItemToFoodDatabaseItem(item)
      saveExternalFoodFromSearchResult({
        id: item.id,
        name: item.nameKo,
        category: item.category,
        per100g: food.per100g,
        source: "official",
        isEstimated: false,
        pieceWeightG: item.amountG,
        servingLabel: "1회",
      })
      onSelectFood?.(food, {
        slotId: combo.applyMealSlotId,
        itemIndex: 0,
        mealLabel: combo.recommendedSlotLabel,
        servingCount: 1,
        source: "api",
        combo,
      })
    },
    [onSelectFood]
  )

  useEffect(() => {
    if (!hydrated) return
    const handler = () => setSavedListVersion((version) => version + 1)
    window.addEventListener(SAVED_MEAL_MENU_EVENT, handler)
    return () => window.removeEventListener(SAVED_MEAL_MENU_EVENT, handler)
  }, [hydrated])

  const savedDailyMenus = useMemo(
    () => (hydrated ? listSavedDailyMealMenus() : []),
    [hydrated, savedListVersion]
  )

  const savedSlotsByMeal = useMemo(() => {
    if (!hydrated) {
      return Object.fromEntries(
        FOOD_MEAL_SLOT_IDS.map((slotId) => [slotId, []])
      ) as Record<FoodMealSlotId, SavedMealSlotRecord[]>
    }
    const all = listSavedMealSlots()
    return Object.fromEntries(
      FOOD_MEAL_SLOT_IDS.map((slotId) => [
        slotId,
        all.filter((item) => item.slotId === slotId),
      ])
    ) as Record<FoodMealSlotId, SavedMealSlotRecord[]>
  }, [hydrated, savedListVersion])

  const menuTargets = useMemo(() => {
    if (!isLossGoal) {
      return calculateDailyMacroTargets(profile, effectiveSchedule)
    }
    const dietMode = coachingMode === "fast_loss" ? "fast_loss" : "normal_loss"
    return calculateDailyMacroTargets(
      { ...profile, dietMode, goalType: "loss" },
      effectiveSchedule
    )
  }, [coachingMode, isLossGoal, effectiveSchedule, profile])

  const plan = useMemo(() => {
    if (!requested) return null
    return buildDailyMealMenuPlan(menuTargets, profile, effectiveSchedule, {
      variantIndex,
      coachingModeOverride: isLossGoal ? coachingMode : undefined,
      itemRefreshCounts,
      itemSlotOverrides,
      savedSlotSpecs,
      slotFrozenSpecs,
      slotRefreshCounts,
    })
  }, [
    menuTargets,
    profile,
    effectiveSchedule,
    requested,
    variantIndex,
    coachingMode,
    isLossGoal,
    itemRefreshCounts,
    itemSlotOverrides,
    savedSlotSpecs,
    slotFrozenSpecs,
    slotRefreshCounts,
    menuLoadRevision,
  ])

  const canRefreshSlot = useMemo(
    () =>
      getMealSlotRefreshOptionCount(profile, effectiveSchedule, activeCoachingMode) >
      1,
    [profile, effectiveSchedule, activeCoachingMode]
  )

  const canRefreshItem = useCallback(
    (slotId: FoodMealSlotId, itemIndex: number) => {
      const meal = plan?.meals.find((entry) => entry.slotId === slotId)
      const item = meal?.items[itemIndex]
      const currentItems = meal?.items.map((entry) => ({
        foodId: entry.foodId,
        servings: entry.servings,
      }))
      if (!item) return false

      if (item.addOverrideKey) {
        return (
          getAddedMenuItemAlternativeCount(
            profile,
            effectiveSchedule,
            activeCoachingMode,
            slotId,
            item.foodId,
            currentItems
          ) > 1
        )
      }

      return (
        getMenuItemAlternativeCount(
          profile,
          effectiveSchedule,
          activeCoachingMode,
          slotId,
          itemIndex,
          currentItems
        ) > 1
      )
    },
    [profile, effectiveSchedule, activeCoachingMode, plan]
  )

  const captureSlotFrozenSpecs = useCallback(
    (
      slotId: FoodMealSlotId,
      prev: Partial<Record<FoodMealSlotId, { foodId: string; servings: number }[]>>
    ) => {
      if (prev[slotId]?.length || !plan) return prev
      const meal = plan.meals.find((entry) => entry.slotId === slotId)
      if (!meal) return prev
      return {
        ...prev,
        [slotId]: meal.items
          .filter((item) => !item.addOverrideKey)
          .map((item) => ({ foodId: item.foodId, servings: item.servings })),
      }
    },
    [plan]
  )

  const handleRefreshSlot = (slotId: FoodMealSlotId) => {
    invalidateMealEdits(slotId)
    clearSlotCustomizations(slotId)
    setSavedSlotSpecs((prev) => {
      if (!(slotId in prev)) return prev
      const next = { ...prev }
      delete next[slotId]
      return next
    })
    setSlotRefreshCounts((prev) => ({
      ...prev,
      [slotId]: (prev[slotId] ?? 0) + 1,
    }))
    setSlotLoadRevisions((prev) => ({
      ...prev,
      [slotId]: (prev[slotId] ?? 0) + 1,
    }))
  }

  const handleRefreshItem = (slotId: FoodMealSlotId, itemIndex: number) => {
    invalidateMealEdits(slotId)
    const meal = plan?.meals.find((entry) => entry.slotId === slotId)
    const item = meal?.items[itemIndex]
    const addKey = item?.addOverrideKey
    const key = addKey ?? `${slotId}:${itemIndex}`

    if (addKey && item) {
      const otherItems = meal!.items
        .filter((_, index) => index !== itemIndex)
        .map((entry) => ({ foodId: entry.foodId, servings: entry.servings }))
      const nextCount = (itemRefreshCounts[addKey] ?? 0) + 1
      const nextSpec = getRefreshedAddedMenuItemSpec(
        profile,
        effectiveSchedule,
        activeCoachingMode,
        slotId,
        { foodId: item.foodId, servings: item.servings },
        otherItems,
        nextCount
      )

      setItemSlotOverrides((prev) => ({
        ...prev,
        [addKey]: { action: "add", spec: nextSpec },
      }))
      setItemRefreshCounts((prev) => ({
        ...prev,
        [addKey]: nextCount,
      }))
      setSlotLoadRevisions((prev) => ({
        ...prev,
        [slotId]: (prev[slotId] ?? 0) + 1,
      }))
      return
    }

    setSlotFrozenSpecs((prev) => captureSlotFrozenSpecs(slotId, prev))
    setItemRefreshCounts((prev) => ({
      ...prev,
      [key]: (prev[key] ?? 0) + 1,
    }))
    setItemSlotOverrides((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const handleReplaceItem = (
    slotId: FoodMealSlotId,
    itemIndex: number,
    food: FoodDatabaseItem,
    addOverrideKey?: string,
    servings = 1,
    lockServings = false
  ) => {
    if (isMealSlotConfirmed(slotId)) {
      toast.message(`결정된 끼니는 수정할 수 없어요. 「수정」을 눌러주세요.`)
      return
    }
    invalidateMealEdits(slotId)
    if (addOverrideKey) {
      setItemSlotOverrides((prev) => ({
        ...prev,
        [addOverrideKey]: {
          action: "add",
          spec: { foodId: food.id, servings },
        },
      }))
      setSlotLoadRevisions((prev) => ({
        ...prev,
        [slotId]: (prev[slotId] ?? 0) + 1,
      }))
      return
    }

    const key = `${slotId}:${itemIndex}`
    const meal = plan?.meals.find((entry) => entry.slotId === slotId)
    if (
      meal?.items.some(
        (item, idx) => idx !== itemIndex && item.foodId === food.id
      )
    ) {
      toast.message(`「${food.name}」은 이미 이 끼니에 있어요`)
      return
    }

    setSlotFrozenSpecs((prev) => captureSlotFrozenSpecs(slotId, prev))
    setItemSlotOverrides((prev) => ({
      ...prev,
      [key]: {
        action: "replace",
        spec: { foodId: food.id, servings },
        lockServings,
      },
    }))
    setItemRefreshCounts((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  useImperativeHandle(ref, () => ({
    applyMenuItem: (
      slotId: FoodMealSlotId,
      itemIndex: number,
      foodId: string,
      servings: number
    ) => {
      const food = getFoodById(foodId)
      if (!food) return
      handleReplaceItem(slotId, itemIndex, food, undefined, servings, true)
    },
  }))

  const handleReplaceItemFromSearch = (
    slotId: FoodMealSlotId,
    itemIndex: number,
    food: FoodDatabaseItem,
    addOverrideKey?: string
  ) => {
    handleReplaceItem(slotId, itemIndex, food, addOverrideKey, 1, false)
  }

  const handleAddItem = (slotId: FoodMealSlotId, food: FoodDatabaseItem) => {
    if (isMealSlotConfirmed(slotId)) {
      toast.message(`결정된 끼니는 수정할 수 없어요. 「수정」을 눌러주세요.`)
      return
    }
    invalidateMealEdits(slotId)
    const meal = plan?.meals.find((entry) => entry.slotId === slotId)
    if (meal?.items.some((item) => item.foodId === food.id)) {
      toast.message(`「${food.name}」은 이미 이 끼니에 있어요`)
      return
    }

    const key = `${slotId}:+${Date.now()}`
    setItemSlotOverrides((prev) => ({
      ...prev,
      [key]: {
        action: "add",
        spec: { foodId: food.id, servings: 1 },
      },
    }))
    setSlotLoadRevisions((prev) => ({
      ...prev,
      [slotId]: (prev[slotId] ?? 0) + 1,
    }))
    toast.success(`「${food.name}」을 ${MEAL_SLOT_LABELS[slotId]} 메뉴에 추가했습니다`)
  }

  const handleDeleteItem = (
    slotId: FoodMealSlotId,
    itemIndex: number,
    addOverrideKey?: string
  ) => {
    if (isMealSlotConfirmed(slotId)) {
      toast.message(`결정된 끼니는 수정할 수 없어요. 「수정」을 눌러주세요.`)
      return
    }
    invalidateMealEdits(slotId)
    if (addOverrideKey) {
      setItemSlotOverrides((prev) => {
        const next = { ...prev }
        delete next[addOverrideKey]
        return next
      })
      setSlotLoadRevisions((prev) => ({
        ...prev,
        [slotId]: (prev[slotId] ?? 0) + 1,
      }))
      return
    }

    const meal = plan?.meals.find((entry) => entry.slotId === slotId)
    if (!meal?.items[itemIndex]) return

    const currentBase = meal.items.filter((entry) => !entry.addOverrideKey)
    const frozenIndex = meal.items
      .slice(0, itemIndex)
      .filter((entry) => !entry.addOverrideKey).length

    setSlotFrozenSpecs((prev) => ({
      ...prev,
      [slotId]: currentBase.map((entry) => ({
        foodId: entry.foodId,
        servings: entry.servings,
      })),
    }))

    const key = `${slotId}:${frozenIndex}`
    setItemSlotOverrides((prev) => {
      const next = { ...prev }
      for (const overrideKey of Object.keys(next)) {
        if (
          overrideKey.startsWith(`${slotId}:`) &&
          !overrideKey.startsWith(`${slotId}:+`) &&
          next[overrideKey]?.action === "delete"
        ) {
          delete next[overrideKey]
        }
      }
      next[key] = { action: "delete" }
      return next
    })
    setItemRefreshCounts((prev) => {
      const next = { ...prev }
      for (const refreshKey of Object.keys(next)) {
        if (refreshKey.startsWith(`${slotId}:`)) {
          delete next[refreshKey]
        }
      }
      return next
    })
    setSlotLoadRevisions((prev) => ({
      ...prev,
      [slotId]: (prev[slotId] ?? 0) + 1,
    }))
  }

  const resetItemCustomizations = () => {
    setItemRefreshCounts({})
    setItemSlotOverrides({})
    setSlotFrozenSpecs({})
    setSlotRefreshCounts({})
    setSlotUndoSnapshots({})
    setAllMealsUndoSnapshot(null)
  }

  const clearSlotUndoSnapshot = useCallback((slotId: FoodMealSlotId) => {
    setSlotUndoSnapshots((prev) => {
      if (!(slotId in prev)) return prev
      const next = { ...prev }
      delete next[slotId]
      return next
    })
  }, [])

  const invalidateMealEdits = useCallback(
    (slotId: FoodMealSlotId) => {
      clearSlotUndoSnapshot(slotId)
      setAllMealsUndoSnapshot(null)
    },
    [clearSlotUndoSnapshot]
  )

  const restoreMealSlotSnapshot = useCallback(
    (slotId: FoodMealSlotId, snapshot: MealSlotCompositionUndoSnapshot) => {
      setSavedSlotSpecs((prev) => {
        const next = { ...prev }
        if (snapshot.savedSlotSpec) {
          next[slotId] = cloneSavedSlotSpec(snapshot.savedSlotSpec)
        } else {
          delete next[slotId]
        }
        return next
      })
      setItemSlotOverrides((prev) => {
        const next = { ...prev }
        for (const key of Object.keys(next)) {
          if (key.startsWith(`${slotId}:`)) delete next[key]
        }
        return { ...next, ...snapshot.itemSlotOverrides }
      })
      setItemRefreshCounts((prev) => {
        const next = { ...prev }
        for (const key of Object.keys(next)) {
          if (key.startsWith(`${slotId}:`)) delete next[key]
        }
        return { ...next, ...snapshot.itemRefreshCounts }
      })
      setSlotFrozenSpecs((prev) => {
        const next = { ...prev }
        if (snapshot.slotFrozenSpec) {
          next[slotId] = snapshot.slotFrozenSpec.map((item) => ({ ...item }))
        } else {
          delete next[slotId]
        }
        return next
      })
      setSlotRefreshCounts((prev) => {
        const next = { ...prev }
        if (snapshot.slotRefreshCount !== undefined) {
          next[slotId] = snapshot.slotRefreshCount
        } else {
          delete next[slotId]
        }
        return next
      })
      setSlotLoadRevisions((prev) => ({
        ...prev,
        [slotId]: (prev[slotId] ?? 0) + 1,
      }))
      bumpMenuAfterLoad(slotId)
    },
    []
  )

  const clearSlotCustomizations = (slotId: FoodMealSlotId) => {
    setItemRefreshCounts((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(next)) {
        if (key.startsWith(`${slotId}:`)) delete next[key]
      }
      return next
    })
    setItemSlotOverrides((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(next)) {
        if (key.startsWith(`${slotId}:`)) delete next[key]
      }
      return next
    })
    setSlotFrozenSpecs((prev) => {
      if (!(slotId in prev)) return prev
      const next = { ...prev }
      delete next[slotId]
      return next
    })
  }

  const bumpMenuAfterLoad = (slotId?: FoodMealSlotId) => {
    setMenuLoadRevision((revision) => revision + 1)
    if (slotId) {
      setSlotLoadRevisions((prev) => ({
        ...prev,
        [slotId]: (prev[slotId] ?? 0) + 1,
      }))
    }
  }

  const handleSaveDaily = (name: string) => {
    if (!plan) return
    const record = saveDailyMealMenuFromPlan(plan, name)
    toast.success(`「${record.name}」을 저장했습니다`)
  }

  const handleLoadDaily = (record: SavedDailyMealMenuRecord) => {
    const specs: Partial<Record<FoodMealSlotId, SavedSlotMenuSpec>> = {}
    for (const slotId of FOOD_MEAL_SLOT_IDS) {
      const meal = record.meals[slotId]
      if (!meal?.items?.length) continue
      specs[slotId] = {
        items: meal.items.map((item) => ({
          foodId: item.foodId,
          servings: item.servings,
        })),
        title: meal.title,
        lockServings: true,
        loadToken: Date.now(),
      }
    }
    setSavedSlotSpecs(specs)
    resetItemCustomizations()
    setRecommendationMode("legacy")
    setApiResponse(null)
    setRequested(true)
    setSlotLoadRevisions((prev) => {
      const next = { ...prev }
      for (const slotId of FOOD_MEAL_SLOT_IDS) {
        next[slotId] = (prev[slotId] ?? 0) + 1
      }
      return next
    })
    bumpMenuAfterLoad()
    toast.success(`「${record.name}」을 불러왔습니다`)
  }

  const handleSaveSlot = (
    meal: DailyMealMenuPlan["meals"][number],
    name: string
  ) => {
    const record = saveMealSlotFromPlan(meal, name)
    toast.success(`「${record.name}」을 저장했습니다`)
  }

  const handleLoadSlot = (record: SavedMealSlotRecord) => {
    invalidateMealEdits(record.slotId)
    const loadToken = Date.now()
    setSavedSlotSpecs((prev) => ({
      ...prev,
      [record.slotId]: {
        items: record.items.map((item) => ({
          foodId: item.foodId,
          servings: item.servings,
        })),
        title: record.title,
        lockServings: true,
        loadToken,
      },
    }))
    clearSlotCustomizations(record.slotId)
    setRecommendationMode("legacy")
    setApiResponse(null)
    setRequested(true)
    bumpMenuAfterLoad(record.slotId)
    toast.success(`「${record.name}」을 불러왔습니다`)
  }

  const handleDeleteSavedDaily = (id: string) => {
    deleteSavedDailyMealMenu(id)
    toast.message("저장된 메뉴를 삭제했습니다")
  }

  const handleDeleteSavedSlot = (id: string) => {
    deleteSavedMealSlot(id)
    toast.message("저장된 끼니 메뉴를 삭제했습니다")
  }

  const handleApplyMealToNutrition = useCallback(
    (meal: DailyMealMenuPlan["meals"][number]) => {
      if (meal.items.length === 0) return
      if (isMealSlotConfirmed(meal.slotId)) return

      replaceMealSlotFoodLogEntries(
        meal.slotId,
        mealToFoodLogEntries(meal)
      )
      confirmMealSlot(meal.slotId)
      toast.success(`「${meal.label}」 식단을 결정했어요`)
    },
    []
  )

  const handleUnlockMealFromNutrition = useCallback(
    (meal: DailyMealMenuPlan["meals"][number]) => {
      if (!isMealSlotConfirmed(meal.slotId)) return
      unconfirmMealSlot(meal.slotId)
      toast.message(`「${meal.label}」 수정 모드 — 영양관리 표 반영을 해제했어요`)
    },
    []
  )

  const handleApplyAllMealsToNutrition = useCallback(() => {
    if (!plan) return
    const mealsWithItems = plan.meals.filter((meal) => meal.items.length > 0)
    if (mealsWithItems.length === 0) return

    for (const meal of mealsWithItems) {
      if (isMealSlotConfirmed(meal.slotId)) continue
      replaceMealSlotFoodLogEntries(
        meal.slotId,
        mealToFoodLogEntries(meal)
      )
      confirmMealSlot(meal.slotId)
    }
    toast.success(`추천 메뉴 ${mealsWithItems.length}끼를 결정했어요`)
  }, [plan])

  const handleUnlockAllMealsFromNutrition = useCallback(() => {
    if (!plan) return
    const confirmedMeals = plan.meals.filter(
      (meal) => meal.items.length > 0 && isMealSlotConfirmed(meal.slotId)
    )
    if (confirmedMeals.length === 0) return

    for (const meal of confirmedMeals) {
      unconfirmMealSlot(meal.slotId)
    }
    toast.message(`추천 메뉴 ${confirmedMeals.length}끼 수정 모드 — 영양관리 반영 해제`)
  }, [plan])

  const handleClearOrUndoAllMealCompositions = useCallback(() => {
    if (allMealsUndoSnapshot) {
      for (const slotId of FOOD_MEAL_SLOT_IDS) {
        const snapshot = allMealsUndoSnapshot[slotId]
        if (snapshot) {
          restoreMealSlotSnapshot(slotId, snapshot)
        }
      }
      setAllMealsUndoSnapshot(null)
      setSlotUndoSnapshots({})
      toast.message("추천 메뉴를 모두 되돌렸습니다")
      return
    }

    if (
      plan?.meals.some(
        (meal) => meal.items.length > 0 && isMealSlotConfirmed(meal.slotId)
      )
    ) {
      toast.message("결정된 끼니가 있어요. 「전체 수정」을 눌러주세요.")
      return
    }

    if (!plan) return
    const mealsWithItems = plan.meals.filter((meal) => meal.items.length > 0)
    if (mealsWithItems.length === 0) return

    const snapshot: AllMealsCompositionUndoSnapshot = {}
    for (const meal of mealsWithItems) {
      snapshot[meal.slotId] = buildMealSlotUndoSnapshot(
        meal.slotId,
        savedSlotSpecs,
        itemSlotOverrides,
        itemRefreshCounts,
        slotFrozenSpecs,
        slotRefreshCounts
      )
    }

    setAllMealsUndoSnapshot(snapshot)
    setSlotUndoSnapshots({})

    setSavedSlotSpecs((prev) => {
      const next = { ...prev }
      for (const meal of mealsWithItems) {
        next[meal.slotId] = {
          items: [],
          title: "메뉴 없음",
          lockServings: true,
          loadToken: Date.now(),
        }
      }
      return next
    })

    for (const meal of mealsWithItems) {
      clearSlotCustomizations(meal.slotId)
    }

    setSlotLoadRevisions((prev) => {
      const next = { ...prev }
      for (const meal of mealsWithItems) {
        next[meal.slotId] = (prev[meal.slotId] ?? 0) + 1
      }
      return next
    })
    bumpMenuAfterLoad()
    toast.message("추천 메뉴를 모두 비웠습니다")
  }, [
    allMealsUndoSnapshot,
    plan,
    savedSlotSpecs,
    itemSlotOverrides,
    itemRefreshCounts,
    slotFrozenSpecs,
    slotRefreshCounts,
    restoreMealSlotSnapshot,
  ])

  const handleClearOrUndoMealComposition = useCallback(
    (meal: DailyMealMenuPlan["meals"][number]) => {
      const slotId = meal.slotId

      if (isMealSlotConfirmed(slotId)) {
        toast.message(`「${meal.label}」는 결정된 상태예요. 수정하려면 「수정」을 눌러주세요.`)
        return
      }

      const undo = slotUndoSnapshots[slotId]

      if (undo) {
        restoreMealSlotSnapshot(slotId, undo)
        clearSlotUndoSnapshot(slotId)
        setAllMealsUndoSnapshot(null)
        toast.message(`「${meal.label}」 메뉴를 되돌렸습니다`)
        return
      }

      if (meal.items.length === 0) return

      setAllMealsUndoSnapshot(null)
      setSlotUndoSnapshots((prev) => ({
        ...prev,
        [slotId]: buildMealSlotUndoSnapshot(
          slotId,
          savedSlotSpecs,
          itemSlotOverrides,
          itemRefreshCounts,
          slotFrozenSpecs,
          slotRefreshCounts
        ),
      }))
      clearSlotCustomizations(slotId)
      setSavedSlotSpecs((prev) => ({
        ...prev,
        [slotId]: {
          items: [],
          title: "메뉴 없음",
          lockServings: true,
          loadToken: Date.now(),
        },
      }))
      setSlotLoadRevisions((prev) => ({
        ...prev,
        [slotId]: (prev[slotId] ?? 0) + 1,
      }))
      bumpMenuAfterLoad(slotId)
      toast.message(`「${meal.label}」 메뉴를 비웠습니다`)
    },
    [
      slotUndoSnapshots,
      savedSlotSpecs,
      itemSlotOverrides,
      itemRefreshCounts,
      slotFrozenSpecs,
      slotRefreshCounts,
      restoreMealSlotSnapshot,
      clearSlotUndoSnapshot,
    ]
  )

  const handleRefresh = () => {
    setVariantIndex((prev) => prev + 1)
    resetItemCustomizations()
    setSavedSlotSpecs({})
    setSlotLoadRevisions({})
  }

  const handleCoachingModeChange = (mode: DietCoachingMode) => {
    setCoachingMode(mode)
    setVariantIndex(0)
    resetItemCustomizations()
    setSavedSlotSpecs({})
    setSlotLoadRevisions({})
  }

  const handleTrainingReflectToggle = () => {
    setReflectTraining((prev) => !prev)
    setVariantIndex(0)
    resetItemCustomizations()
    setSavedSlotSpecs({})
    setSlotLoadRevisions({})
  }

  const dailySaveDefaultName = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, "0")
    const d = String(now.getDate()).padStart(2, "0")
    const h = String(now.getHours()).padStart(2, "0")
    const min = String(now.getMinutes()).padStart(2, "0")
    return `메뉴 ${y}.${m}.${d} ${h}:${min}`
  }, [dailySaveOpen])

  if (recommendationMode === "api") {
    return (
      <NutritionRecommendationPanel
        className={className}
        settings={strategySettings}
        onSettingsChange={handleStrategyChange}
        loading={apiLoading}
        error={apiError}
        response={apiResponse}
        hasRequested={requested}
        onRequest={handleRequestSmartRecommendations}
        onRefresh={handleRefreshSmartRecommendations}
        onSelectItem={onSelectFood ? handleSelectRecommendItem : undefined}
        onApplyCombo={onApplyCombo}
        descriptionMode={descriptionMode}
        onDescriptionModeToggle={() =>
          setDescriptionMode((mode) => (mode === "brief" ? "detailed" : "brief"))
        }
      />
    )
  }

  if (!plan) return null

  void confirmedVersion

  const dailyKcalSummary = `${formatCalories(plan.dailyNutrition.calories)}kcal · ${plan.meals.length}끼`

  return (
    <div className={cn("space-y-2.5", className)}>
      <Collapsible open={panelOpen} onOpenChange={setPanelOpen}>
        <div className="rounded-xl border border-accent/25 bg-accent/5 overflow-hidden">
          <div
            className={cn(
              "flex items-center gap-1 pr-1 transition-[padding]",
              panelOpen ? "pt-2 pb-1" : "py-1"
            )}
          >
            <div className="flex-1 min-w-0 flex items-center gap-2 px-3 py-0 text-left">
              <div
                className={cn(
                  "rounded-lg bg-accent/15 flex items-center justify-center shrink-0 h-7 w-7"
                )}
              >
                <UtensilsCrossed className="h-4 w-4 text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-accent leading-tight">
                  {plan.headline}
                </p>
                {!panelOpen ? (
                  <p className="text-[10px] text-muted-foreground tabular-nums leading-tight truncate">
                    {dailyKcalSummary}
                  </p>
                ) : (
                  <>
                    <p
                      className={cn(
                        "text-muted-foreground mt-1 leading-relaxed",
                        descriptionMode === "brief"
                          ? "text-[10px]"
                          : "text-[11px]"
                      )}
                    >
                      {descriptionMode === "brief"
                        ? plan.subtitleBrief
                        : plan.subtitle}
                    </p>
                    <TrainingReflectToggle
                      schedule={actualSchedule}
                      reflectTraining={reflectTraining}
                      onToggle={handleTrainingReflectToggle}
                    />
                  </>
                )}
              </div>
            </div>
            {isLossGoal ? (
              <CoachingModeSelect
                value={coachingMode}
                onChange={handleCoachingModeChange}
              />
            ) : (
              <span className="shrink-0 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[9px] font-medium text-accent">
                {plan.goalLabel}
              </span>
            )}
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="h-6 w-6 flex items-center justify-center shrink-0 rounded-md hover:bg-accent/10 transition-colors"
                aria-label={panelOpen ? "접기" : "펼치기"}
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    panelOpen && "rotate-180"
                  )}
                />
              </button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent>
            <div className="px-3 pb-3 space-y-2.5 border-t border-accent/15 pt-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <ScopeToggle value={scope} onChange={setScope} />
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-[11px] border-border/60 shrink-0"
                    onClick={() => setDailySaveOpen(true)}
                  >
                    <Bookmark className="h-3.5 w-3.5 mr-1" />
                    메뉴 저장
                  </Button>
                  <SavedMealMenuPicker
                    items={savedDailyMenus}
                    emptyLabel="저장된 메뉴가 없어요"
                    triggerLabel="메뉴 불러오기"
                    getSummary={(item) =>
                      FOOD_MEAL_SLOT_IDS.filter(
                        (slotId) => item.meals[slotId]?.items?.length
                      )
                        .map((slotId) => MEAL_SLOT_LABELS[slotId])
                        .join(" · ") || item.headline
                    }
                    onLoad={handleLoadDaily}
                    onDelete={handleDeleteSavedDaily}
                  />
                  <MenuDescriptionModeToggle
                    mode={descriptionMode}
                    onToggle={() =>
                      setDescriptionMode((mode) =>
                        mode === "brief" ? "detailed" : "brief"
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-[11px] border-accent/30 text-accent hover:bg-accent/10 shrink-0"
                    onClick={handleRefresh}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    다른 조합
                  </Button>
                </div>
              </div>

              <SaveMealMenuDialog
                open={dailySaveOpen}
                onOpenChange={setDailySaveOpen}
                title="메뉴 저장"
                defaultName={dailySaveDefaultName}
                onConfirm={handleSaveDaily}
              />

              {scope === "daily" ? (
                <>
                  <CollapsibleInlineSection
                    title="영양 그래프"
                    summary={dailyKcalSummary}
                    defaultOpen
                    sectionId="recommended-meal-daily-graph"
                  >
                    <RecommendedMenuDailyGraph
                      key={`daily-graph-${menuLoadRevision}`}
                      plan={plan}
                      targets={menuTargets}
                    />
                  </CollapsibleInlineSection>
                  <CollapsibleInlineSection
                    title="추천 메뉴 구성"
                    summary={plan.meals.map((m) => m.label).join(" · ")}
                    sectionId="recommended-meal-daily-composition"
                  >
                    <CollapsibleSectionProvider>
                      <CollapsibleGroupToolbar className="mb-1.5" />
                      <div
                        className={cn(
                          RECOMMENDATION_LIST_SCROLL_CLASS,
                          "rounded-xl border border-border/40 bg-black/10 px-1 py-1"
                        )}
                        aria-label="추천 메뉴 구성 목록"
                      >
                        <div className="grid gap-2 sm:grid-cols-2">
                          {plan.meals.map((meal) => (
                            <MealMenuCompositionCard
                            key={`${meal.slotId}-${menuLoadRevision}-${plan.variantIndex}-list`}
                            meal={meal}
                            loadRevision={slotLoadRevisions[meal.slotId] ?? 0}
                            onSelectFood={onSelectFood}
                            onRefreshItem={handleRefreshItem}
                            canRefreshItem={canRefreshItem}
                            onRefreshSlot={handleRefreshSlot}
                            canRefreshSlot={canRefreshSlot}
                            onReplaceItem={handleReplaceItemFromSearch}
                            onDeleteItem={handleDeleteItem}
                            onAddItem={handleAddItem}
                            savedSlots={savedSlotsByMeal[meal.slotId] ?? []}
                            onSaveSlot={handleSaveSlot}
                            onLoadSlot={handleLoadSlot}
                            onDeleteSavedSlot={handleDeleteSavedSlot}
                            onApplyToNutrition={handleApplyMealToNutrition}
                            onUnlockFromNutrition={handleUnlockMealFromNutrition}
                            onClearOrUndo={handleClearOrUndoMealComposition}
                            undoAvailable={Boolean(slotUndoSnapshots[meal.slotId])}
                            isConfirmed={isMealSlotConfirmed(meal.slotId)}
                            descriptionMode={descriptionMode}
                          />
                        ))}
                        </div>
                      </div>
                    </CollapsibleSectionProvider>
                  </CollapsibleInlineSection>
                </>
              ) : (
                <CollapsibleInlineSection
                  title="끼니별 상세"
                  summary={dailyKcalSummary}
                  defaultOpen
                  sectionId="recommended-meal-per-meal"
                >
                  <CollapsibleSectionProvider>
                    <CollapsibleGroupToolbar className="mb-1.5" />
                    <div
                      className={cn(
                        RECOMMENDATION_LIST_SCROLL_CLASS,
                        "rounded-xl border border-border/40 bg-black/10 px-1 py-1"
                      )}
                      aria-label="끼니별 추천 메뉴 목록"
                    >
                      <div className="grid gap-2 sm:grid-cols-2">
                        {plan.meals.map((meal) => (
                          <MealMenuCard
                          key={`${meal.slotId}-${menuLoadRevision}-${plan.variantIndex}`}
                          meal={meal}
                          loadRevision={slotLoadRevisions[meal.slotId] ?? 0}
                          onSelectFood={onSelectFood}
                          onRefreshItem={handleRefreshItem}
                          canRefreshItem={canRefreshItem}
                          onRefreshSlot={handleRefreshSlot}
                          canRefreshSlot={canRefreshSlot}
                          onReplaceItem={handleReplaceItemFromSearch}
                          onDeleteItem={handleDeleteItem}
                          onAddItem={handleAddItem}
                          savedSlots={savedSlotsByMeal[meal.slotId] ?? []}
                          onSaveSlot={handleSaveSlot}
                          onLoadSlot={handleLoadSlot}
                          onDeleteSavedSlot={handleDeleteSavedSlot}
                          onApplyToNutrition={handleApplyMealToNutrition}
                          onUnlockFromNutrition={handleUnlockMealFromNutrition}
                          onClearOrUndo={handleClearOrUndoMealComposition}
                          undoAvailable={Boolean(slotUndoSnapshots[meal.slotId])}
                          isConfirmed={isMealSlotConfirmed(meal.slotId)}
                          descriptionMode={descriptionMode}
                        />
                      ))}
                      </div>
                    </div>
                  </CollapsibleSectionProvider>
                </CollapsibleInlineSection>
              )}

              <AllMealsActionButtons
                undoAvailable={Boolean(allMealsUndoSnapshot)}
                canClear={Boolean(plan?.meals.some((meal) => meal.items.length > 0))}
                canApply={Boolean(plan?.meals.some((meal) => meal.items.length > 0))}
                allConfirmed={Boolean(
                  plan?.meals.some((meal) => meal.items.length > 0) &&
                    plan.meals
                      .filter((meal) => meal.items.length > 0)
                      .every((meal) => isMealSlotConfirmed(meal.slotId))
                )}
                anyConfirmed={Boolean(
                  plan?.meals.some(
                    (meal) =>
                      meal.items.length > 0 && isMealSlotConfirmed(meal.slotId)
                  )
                )}
                onClearOrUndo={handleClearOrUndoAllMealCompositions}
                onApplyAll={handleApplyAllMealsToNutrition}
                onUnlockAll={handleUnlockAllMealsFromNutrition}
              />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  )
})
