"use client"

import { useEffect, useMemo, useState } from "react"
import type { MacroTargets } from "@/lib/user-profile"
import { formatCalories } from "@/lib/user-profile"
import {
  formatOptionMacroHint,
  getFoodAlternativeGroupForScope,
  type FoodOption,
  type MacroNutrientKey,
  type MealMenuSelection,
  type MenuSelectionScope,
} from "@/lib/food-alternatives"
import {
  applyMealMenuSelection,
  clearMealMenuSelection,
  loadMealMenuSelection,
  saveMealMenuSelection,
  MEAL_MENU_EVENT,
  type AdjustedMealPlan,
} from "@/lib/meal-menu-selection"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CollapsibleInlineSection } from "@/components/collapsible-card"
import { Check, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useHydrated } from "@/hooks/use-hydrated"

type ViewMode = "daily" | "meal"

const MAIN_MACROS: {
  key: MacroNutrientKey
  label: string
  short: string
  dailyValue: (plan: AdjustedMealPlan) => number
  dailyUnit: string
  perMealValue: (plan: AdjustedMealPlan) => number
  perMealUnit: string
}[] = [
  {
    key: "carbs",
    label: "탄수화물",
    short: "탄수",
    dailyValue: (p) => p.daily.carbsG,
    dailyUnit: "g",
    perMealValue: (p) => p.perMeal.carbsG,
    perMealUnit: "g",
  },
  {
    key: "protein",
    label: "단백질",
    short: "단백",
    dailyValue: (p) => p.daily.proteinG,
    dailyUnit: "g",
    perMealValue: (p) => p.perMeal.proteinG,
    perMealUnit: "g",
  },
  {
    key: "fat",
    label: "지방",
    short: "지방",
    dailyValue: (p) => p.daily.fatG,
    dailyUnit: "g",
    perMealValue: (p) => p.perMeal.fatG,
    perMealUnit: "g",
  },
]

const SECONDARY_NUTRIENTS: {
  key: MacroNutrientKey
  label: string
  dailyValue: (plan: AdjustedMealPlan) => number
  dailyUnit: string
  perMealValue: (plan: AdjustedMealPlan) => number
  perMealUnit: string
}[] = [
  {
    key: "water",
    label: "수분",
    dailyValue: (p) => p.daily.waterL,
    dailyUnit: "L",
    perMealValue: (p) => p.perMeal.waterMl,
    perMealUnit: "ml",
  },
  {
    key: "sodium",
    label: "나트륨",
    dailyValue: (p) => p.daily.sodiumMg,
    dailyUnit: "mg",
    perMealValue: (p) => p.perMeal.sodiumMg,
    perMealUnit: "mg",
  },
]

const ALL_FOOD_NUTRIENTS = [...MAIN_MACROS, ...SECONDARY_NUTRIENTS]

function formatMacroAmount(value: number, unit: string): string {
  const rounded =
    unit === "g"
      ? Math.round(value * 10) / 10
      : unit === "L"
        ? Math.round(value * 10) / 10
        : Math.round(value)
  if (unit === "mg") return `${formatCalories(rounded)}mg`
  if (unit === "ml") return `${formatCalories(rounded)}ml`
  if (unit === "L") return `${rounded}L`
  return `${Number.isInteger(rounded) ? rounded : rounded}g`
}

function primaryValueForKey(key: MacroNutrientKey, option: FoodOption): number {
  switch (key) {
    case "carbs":
      return option.carbsG
    case "protein":
      return option.proteinG
    case "fat":
      return option.fatG
    case "water":
      return option.waterMl
    case "sodium":
      return option.sodiumMg
  }
}

function ViewModeToggle({
  mode,
  onChange,
}: {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
}) {
  return (
    <div className="flex rounded-xl bg-secondary/50 p-1 gap-1">
      {(
        [
          { id: "daily" as const, label: "하루 기준" },
          { id: "meal" as const, label: "1끼 기준" },
        ] as const
      ).map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={cn(
            "flex-1 h-9 rounded-lg text-[13px] font-medium transition-colors",
            mode === item.id
              ? "bg-accent/20 text-accent shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

function formatLinkedFoodLabel(
  option: FoodOption,
  nutrientKey: MacroNutrientKey,
  entryScope: MenuSelectionScope,
  viewMode: ViewMode,
  mealsPerDay: number,
  nutrientDef: (typeof ALL_FOOD_NUTRIENTS)[number]
): string {
  const primary = primaryValueForKey(nutrientKey, option)

  if (viewMode === "meal" && entryScope === "daily") {
    return `1끼 ${formatMacroAmount(primary / mealsPerDay, nutrientDef.perMealUnit)}`
  }
  if (viewMode === "daily" && entryScope === "meal") {
    return `${option.label} · 하루 ${formatMacroAmount(primary * mealsPerDay, nutrientDef.dailyUnit)}`
  }
  return option.label
}

function FoodPickerRow({
  nutrientKey,
  label,
  baseTargets,
  plan,
  viewMode,
  selectionEntry,
  onSelect,
}: {
  nutrientKey: MacroNutrientKey
  label: string
  baseTargets: MacroTargets
  plan: AdjustedMealPlan
  viewMode: ViewMode
  selectionEntry?: MealMenuSelection[MacroNutrientKey]
  onSelect: (option: FoodOption, scope: MenuSelectionScope) => void
}) {
  const scope: MenuSelectionScope = viewMode === "daily" ? "daily" : "meal"
  const [open, setOpen] = useState(false)
  const group = getFoodAlternativeGroupForScope(nutrientKey, baseTargets, scope)
  const selectedOption = plan.selectedOptions[nutrientKey]
  const isSelected = Boolean(selectedOption && selectionEntry)
  const nutrientDef = ALL_FOOD_NUTRIENTS.find((n) => n.key === nutrientKey)!
  const selectedId = selectionEntry?.optionId

  const displayValue =
    viewMode === "daily"
      ? formatMacroAmount(
          nutrientDef.dailyValue(plan),
          nutrientDef.dailyUnit
        )
      : formatMacroAmount(
          nutrientDef.perMealValue(plan),
          nutrientDef.perMealUnit
        )

  const linkedLabel =
    isSelected && selectedOption && selectionEntry
      ? formatLinkedFoodLabel(
          selectedOption,
          nutrientKey,
          selectionEntry.scope,
          viewMode,
          baseTargets.mealsPerDay,
          nutrientDef
        )
      : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full flex items-center gap-3 py-2.5 px-2.5 rounded-lg text-left transition-colors",
            "hover:bg-secondary/40 active:bg-secondary/60",
            isSelected && "bg-accent/10 ring-1 ring-accent/30"
          )}
        >
          <span className="text-sm text-muted-foreground w-14 shrink-0">
            {label}
          </span>
          <span className="flex-1 min-w-0">
            {linkedLabel ? (
              <>
                <span className="text-[13px] font-medium truncate block">
                  {viewMode === "meal" && selectionEntry?.scope === "daily"
                    ? selectedOption!.label.replace(/\s+\d+.*$/, "").trim() ||
                      selectedOption!.label
                    : selectedOption!.label}
                </span>
                {viewMode === "meal" && selectionEntry?.scope === "daily" && (
                  <span className="text-[11px] text-accent tabular-nums">
                    {linkedLabel}
                  </span>
                )}
                {viewMode === "daily" && selectionEntry?.scope === "meal" && (
                  <span className="text-[11px] text-accent tabular-nums truncate block">
                    {linkedLabel}
                  </span>
                )}
              </>
            ) : (
              <span className="text-[13px] text-muted-foreground">
                식품 선택
              </span>
            )}
            <span className="text-[11px] text-muted-foreground tabular-nums">
              목표 {displayValue}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className="w-[min(calc(100vw-2rem),300px)] p-0 rounded-xl border-border bg-card"
      >
        <div className="px-3.5 py-3 border-b border-border/60">
          <p className="text-sm font-semibold">
            {label} 식품 예시
            {scope === "daily" ? " (하루)" : " (1끼)"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
            목표 {displayValue}
          </p>
          {isSelected && selectionEntry?.scope !== scope && (
            <p className="text-[10px] text-accent mt-1">
              {selectionEntry?.scope === "daily"
                ? "하루 기준 선택 · 1끼로 나눠 반영 중"
                : "1끼 기준 선택 · 하루 총량으로 합산 중"}
            </p>
          )}
        </div>
        <ul className="py-2 px-1.5 max-h-[260px] overflow-y-auto">
          {group.options.map((option) => {
            const isOptionSelected = selectedId === option.id
            const perMealHint =
              scope === "daily"
                ? formatMacroAmount(
                    primaryValueForKey(nutrientKey, option) /
                      baseTargets.mealsPerDay,
                    nutrientDef.perMealUnit
                  )
                : null

            return (
              <li key={`${scope}-${option.id}`}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(option, scope)
                    setOpen(false)
                  }}
                  className={cn(
                    "w-full text-left px-2.5 py-2.5 text-[13px] rounded-lg transition-colors",
                    "hover:bg-secondary/40 active:bg-secondary/60",
                    isOptionSelected && "bg-accent/15 ring-1 ring-accent/40"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium">{option.label}</span>
                    {isOptionSelected && (
                      <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                    {scope === "daily" ? "하루" : "1끼"}{" "}
                    {formatOptionMacroHint(nutrientKey, option)}
                    {perMealHint && (
                      <span className="text-accent ml-1">
                        → 1끼 {perMealHint}
                      </span>
                    )}
                  </p>
                </button>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

export function NutritionTargetPanel({
  targets,
  onPlanChange,
}: {
  targets: MacroTargets
  onPlanChange?: (plan: AdjustedMealPlan) => void
}) {
  const hydrated = useHydrated()
  const [viewMode, setViewMode] = useState<ViewMode>("daily")
  const [selection, setSelection] = useState<MealMenuSelection>({})

  useEffect(() => {
    if (!hydrated) return
    setSelection(loadMealMenuSelection())
    const sync = () => setSelection(loadMealMenuSelection())
    window.addEventListener(MEAL_MENU_EVENT, sync)
    return () => window.removeEventListener(MEAL_MENU_EVENT, sync)
  }, [hydrated])

  const plan = useMemo(
    () => applyMealMenuSelection(targets, selection),
    [targets, selection]
  )

  useEffect(() => {
    onPlanChange?.(plan)
  }, [plan, onPlanChange])

  const calories =
    viewMode === "daily" ? plan.daily.calories : plan.perMeal.calories

  const hasActiveSelection = (key: MacroNutrientKey) =>
    Boolean(selection[key] && plan.selectedOptions[key])

  const handleSelect = (
    key: MacroNutrientKey,
    option: FoodOption,
    selectScope: MenuSelectionScope
  ) => {
    const next = saveMealMenuSelection(key, option.id, selectScope)
    setSelection(next)
  }

  const handleReset = () => {
    clearMealMenuSelection()
    setSelection({})
  }

  const waterNutrient = SECONDARY_NUTRIENTS[0]
  const waterValue =
    viewMode === "daily"
      ? formatMacroAmount(
          waterNutrient.dailyValue(plan),
          waterNutrient.dailyUnit
        )
      : formatMacroAmount(
          waterNutrient.perMealValue(plan),
          waterNutrient.perMealUnit
        )

  return (
    <div className="space-y-4">
      <ViewModeToggle mode={viewMode} onChange={setViewMode} />

      <div className="text-center py-2">
        <p className="text-[11px] text-muted-foreground mb-1">
          {viewMode === "daily" ? "하루 목표 칼로리" : "1끼 목표 칼로리"}
        </p>
        <p className="text-[42px] font-bold tabular-nums leading-none text-accent tracking-tight">
          {formatCalories(calories)}
        </p>
        <p className="text-sm text-muted-foreground mt-1">kcal</p>
        {viewMode === "meal" && (
          <p className="text-[11px] text-muted-foreground mt-1.5">
            하루 {targets.mealsPerDay}식 · 총{" "}
            {formatCalories(plan.daily.calories)}kcal
          </p>
        )}
        {plan.hasSelections && (
          <p className="text-[11px] text-accent mt-2">
            선택 메뉴 반영됨
            {viewMode === "meal" &&
              Object.values(selection).some((e) => e?.scope === "daily") &&
              " · 하루 기준 선택 연결"}
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {MAIN_MACROS.map((macro) => {
          const value =
            viewMode === "daily"
              ? macro.dailyValue(plan)
              : macro.perMealValue(plan)
          const unit =
            viewMode === "daily" ? macro.dailyUnit : macro.perMealUnit
          const adjusted = hasActiveSelection(macro.key)

          return (
            <div
              key={macro.key}
              className={cn(
                "rounded-xl px-2 py-3 text-center bg-secondary/30",
                adjusted && "ring-1 ring-accent/40 bg-accent/5"
              )}
            >
              <p className="text-[11px] text-muted-foreground mb-1">
                {macro.short}
              </p>
              <p
                className={cn(
                  "text-lg font-bold tabular-nums",
                  adjusted ? "text-accent" : "text-foreground"
                )}
              >
                {formatMacroAmount(value, unit)}
              </p>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between px-1 py-1 text-[13px]">
        <span className="text-muted-foreground">수분</span>
        <span
          className={cn(
            "font-medium tabular-nums",
            hasActiveSelection("water") && "text-accent"
          )}
        >
          {waterValue}
        </span>
      </div>

      <div className="space-y-2 pt-1">
        <CollapsibleInlineSection title="음식 예시 보기" sectionId="nutrition-food-examples">
          <div className="rounded-xl bg-secondary/20 px-1 py-1 space-y-0.5">
            {plan.hasSelections && (
              <div className="flex justify-end px-2 pt-1">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                >
                  선택 초기화
                </button>
              </div>
            )}
            {ALL_FOOD_NUTRIENTS.map((n) => (
              <FoodPickerRow
                key={`food-${viewMode}-${n.key}`}
                nutrientKey={n.key}
                label={n.label}
                baseTargets={targets}
                plan={plan}
                viewMode={viewMode}
                selectionEntry={selection[n.key]}
                onSelect={(option, selectScope) =>
                  handleSelect(n.key, option, selectScope)
                }
              />
            ))}
          </div>
        </CollapsibleInlineSection>

        <CollapsibleInlineSection title="수분 · 나트륨 상세" sectionId="nutrition-water-sodium">
          <div className="rounded-xl bg-secondary/20 divide-y divide-border/40 px-3">
            {SECONDARY_NUTRIENTS.map((n) => {
              const dailyVal = formatMacroAmount(
                n.dailyValue(plan),
                n.dailyUnit
              )
              const mealVal = formatMacroAmount(
                n.perMealValue(plan),
                n.perMealUnit
              )

              return (
                <div key={n.key} className="py-3 space-y-1.5">
                  <p className="text-sm font-medium">{n.label}</p>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-muted-foreground">하루</span>
                    <span className="tabular-nums font-medium">{dailyVal}</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-muted-foreground">
                      1끼 ({targets.mealsPerDay}식)
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {mealVal}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CollapsibleInlineSection>
      </div>
    </div>
  )
}

/** @deprecated Use NutritionTargetPanel */
export const NutritionMacroPanel = NutritionTargetPanel
