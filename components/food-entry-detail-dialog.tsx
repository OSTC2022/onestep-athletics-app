"use client"

import { useState } from "react"
import { ChevronDown, Minus, PenLine, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  formatFullFoodPortion,
  getFoodById,
  getPieceWeightG,
  getServingUnit,
} from "@/lib/food-database"
import { isNutritionOverrideEditable } from "@/lib/food-nutrition-overrides"
import { getPortionUnitWarning } from "@/lib/food-portion-validation"
import { MEAL_SLOTS, type MealSlotId } from "@/lib/nutrition"
import { formatCalories } from "@/lib/user-profile"
import { formatMacroG } from "@/lib/food-nutrition-utils"
import type { LoggedFoodEntry } from "@/lib/daily-food-log"
import { cn } from "@/lib/utils"

const FOOD_MEAL_SLOTS = MEAL_SLOTS.filter((slot) =>
  (["breakfast", "lunch", "dinner", "snack"] as MealSlotId[]).includes(slot.id)
)

type NutrientRow = {
  key: string
  label: string
  value: string
  per100g?: string
  detail?: string
}

function buildNutrientRows(
  item: FoodEntryDetailItem,
  food: ReturnType<typeof getFoodById>
): NutrientRow[] {
  const n = item.nutrition
  const grams = item.grams ?? 0
  const ratio = grams > 0 ? 100 / grams : 0
  const p100 = food?.per100g

  const per100 = (val: number) =>
    grams > 0 ? `${Math.round(val * ratio * 10) / 10}` : "—"

  return [
    {
      key: "calories",
      label: "칼로리",
      value: `${formatCalories(n.calories)}kcal`,
      per100g: p100 ? `${p100.calories}kcal` : per100(n.calories) + "kcal",
      detail: "100g 기준으로 환산한 값과 실제 섭취량을 함께 확인하세요.",
    },
    {
      key: "carbs",
      label: "탄수화물",
      value: `${formatMacroG(n.carbsG)}g`,
      per100g: p100 ? `${p100.carbsG}g` : `${per100(n.carbsG)}g`,
    },
    {
      key: "sugar",
      label: "당류",
      value: `${formatMacroG(n.sugarG ?? 0)}g`,
      per100g: p100?.sugarG != null ? `${p100.sugarG}g` : `${per100(n.sugarG ?? 0)}g`,
    },
    {
      key: "fiber",
      label: "식이섬유",
      value: `${formatMacroG(n.fiberG ?? 0)}g`,
      per100g: p100?.fiberG != null ? `${p100.fiberG}g` : `${per100(n.fiberG ?? 0)}g`,
    },
    {
      key: "protein",
      label: "단백질",
      value: `${formatMacroG(n.proteinG)}g`,
      per100g: p100 ? `${p100.proteinG}g` : `${per100(n.proteinG)}g`,
      detail:
        p100 && grams >= 250
          ? `100g당 ${p100.proteinG}g × ${grams}g ÷ 100 ≈ ${Math.round((p100.proteinG * grams) / 10) / 10}g 예상`
          : undefined,
    },
    {
      key: "fat",
      label: "지방",
      value: `${formatMacroG(n.fatG)}g`,
      per100g: p100 ? `${p100.fatG}g` : `${per100(n.fatG)}g`,
    },
    {
      key: "sodium",
      label: "나트륨",
      value: `${formatCalories(n.sodiumMg)}mg`,
      per100g: p100 ? `${p100.sodiumMg}mg` : `${per100(n.sodiumMg)}mg`,
    },
  ]
}

export type FoodEntryDetailItem = {
  id: string
  foodId: string
  name: string
  displayAmount: string
  servingCount: number
  grams?: number
  mealSlotId?: MealSlotId
  nutrition: LoggedFoodEntry["nutrition"]
}

export function FoodEntryDetailDialog({
  open,
  onOpenChange,
  item,
  onAdjustServing,
  onChangeMealSlot,
  onEditNutrition,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: FoodEntryDetailItem | null
  onAdjustServing: (id: string, delta: number) => void
  onChangeMealSlot?: (id: string, slotId: MealSlotId) => void
  onEditNutrition?: (foodId: string) => void
}) {
  const [expandedNutrient, setExpandedNutrient] = useState<string | null>(null)

  if (!item) return null

  const food = getFoodById(item.foodId)
  const unit = food ? getServingUnit(food) : "회"
  const count = item.servingCount
  const n = item.nutrition
  const grams =
    item.grams ??
    (food && count > 0
      ? Math.round((getPieceWeightG(food) ?? 100) * count)
      : undefined)

  const portionLabel =
    food && grams
      ? formatFullFoodPortion(food, count, grams / count)
      : item.displayAmount

  const portionWarning =
    food && grams ? getPortionUnitWarning(food, grams, n) : null

  const nutrientRows = buildNutrientRows({ ...item, grams }, food)
  const canEditNutrition = isNutritionOverrideEditable(item.foodId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2 border-b border-border/60">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <DialogTitle className="text-base leading-snug">{item.name}</DialogTitle>
              <p className="text-[11px] text-muted-foreground font-normal tabular-nums mt-1 leading-relaxed">
                {portionLabel}
              </p>
              {food?.servingLabel && getPieceWeightG(food) ? (
                <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                  1회 = {getPieceWeightG(food)}g ({food.servingLabel}) · 계산은 100g
                  기준
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                  100g당 영양성분 기준
                </p>
              )}
            </div>
            {canEditNutrition && onEditNutrition ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 h-8 px-2.5 text-[11px]"
                onClick={() => onEditNutrition(item.foodId)}
              >
                <PenLine className="h-3.5 w-3.5 mr-1" />
                수정
              </Button>
            ) : null}
          </div>
        </DialogHeader>

        {portionWarning ? (
          <div className="mx-4 mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2">
            <p className="text-[11px] text-amber-200 leading-relaxed">{portionWarning}</p>
          </div>
        ) : null}

        <div className="px-4 py-3">
          <p className="text-[11px] font-medium text-accent mb-2">
            상세 영양정보 · 항목별 펼치기
          </p>
          <div className="rounded-xl border border-border/50 bg-secondary/20 divide-y divide-border/40">
            {nutrientRows.map((row) => (
              <Collapsible
                key={row.key}
                open={expandedNutrient === row.key}
                onOpenChange={(isOpen) =>
                  setExpandedNutrient(isOpen ? row.key : null)
                }
              >
                <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-secondary/30 transition-colors">
                  <span className="text-[12px] text-muted-foreground">{row.label}</span>
                  <span className="flex items-center gap-1.5 text-[12px] font-medium tabular-nums">
                    {row.value}
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 text-muted-foreground transition-transform",
                        expandedNutrient === row.key && "rotate-180"
                      )}
                    />
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 pb-2.5">
                  <div className="rounded-lg bg-background/50 px-2.5 py-2 text-[10px] text-muted-foreground space-y-1">
                    <p>
                      100g당:{" "}
                      <span className="text-foreground font-medium tabular-nums">
                        {row.per100g}
                      </span>
                    </p>
                    {grams ? (
                      <p>
                        섭취량:{" "}
                        <span className="text-foreground font-medium tabular-nums">
                          {grams}g
                        </span>
                      </p>
                    ) : null}
                    {row.detail ? <p className="leading-relaxed">{row.detail}</p> : null}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </div>

        <div className="px-4 pb-4 space-y-3">
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => onAdjustServing(item.id, -0.5)}
              className="flex items-center justify-center h-9 w-9 rounded-lg border border-border/60 bg-background/60"
              aria-label="0.5 감소"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold tabular-nums min-w-[4rem] text-center">
              {count}
              {unit}
            </span>
            <button
              type="button"
              onClick={() => onAdjustServing(item.id, 0.5)}
              className="flex items-center justify-center h-9 w-9 rounded-lg border border-border/60 bg-background/60"
              aria-label="0.5 증가"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {onChangeMealSlot ? (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1.5">끼니 이동</p>
              <div className="flex flex-wrap gap-1.5">
                {FOOD_MEAL_SLOTS.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => onChangeMealSlot(item.id, slot.id)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors",
                      item.mealSlotId === slot.id
                        ? "border-accent/50 bg-accent/15 text-accent"
                        : "border-border/60 text-muted-foreground hover:bg-secondary/40"
                    )}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex justify-center pt-1">
            <Button
              type="button"
              className="min-w-[120px] bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => onOpenChange(false)}
            >
              확인
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
