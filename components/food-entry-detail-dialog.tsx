"use client"

import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getFoodById, getServingUnit } from "@/lib/food-database"
import { MEAL_SLOTS, type MealSlotId } from "@/lib/nutrition"
import { formatCalories } from "@/lib/user-profile"
import { formatMacroG } from "@/lib/food-nutrition-utils"
import type { LoggedFoodEntry } from "@/lib/daily-food-log"
import { cn } from "@/lib/utils"

const FOOD_MEAL_SLOTS = MEAL_SLOTS.filter((slot) =>
  (["breakfast", "lunch", "dinner", "snack"] as MealSlotId[]).includes(slot.id)
)

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border/40 last:border-0">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className="text-[12px] font-medium tabular-nums">{value}</span>
    </div>
  )
}

export type FoodEntryDetailItem = {
  id: string
  foodId: string
  name: string
  displayAmount: string
  servingCount: number
  mealSlotId?: MealSlotId
  nutrition: LoggedFoodEntry["nutrition"]
}

export function FoodEntryDetailDialog({
  open,
  onOpenChange,
  item,
  onAdjustServing,
  onChangeMealSlot,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: FoodEntryDetailItem | null
  onAdjustServing: (id: string, delta: number) => void
  onChangeMealSlot?: (id: string, slotId: MealSlotId) => void
}) {
  if (!item) return null

  const food = getFoodById(item.foodId)
  const unit = food ? getServingUnit(food) : "개"
  const count =
    item.servingCount % 1 === 0 ? item.servingCount : item.servingCount
  const n = item.nutrition

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2 border-b border-border/60">
          <DialogTitle className="text-base">{item.name}</DialogTitle>
          <p className="text-[11px] text-muted-foreground font-normal tabular-nums">
            {item.displayAmount}
          </p>
        </DialogHeader>

        <div className="px-4 py-3">
          <p className="text-[11px] font-medium text-accent mb-2">상세 영양정보</p>
          <div className="rounded-xl border border-border/50 bg-secondary/20 px-3">
            <DetailRow
              label="칼로리"
              value={`${formatCalories(n.calories)}kcal`}
            />
            <DetailRow label="탄수화물" value={`${formatMacroG(n.carbsG)}g`} />
            <DetailRow label="당류" value={`${formatMacroG(n.sugarG ?? 0)}g`} />
            <DetailRow label="식이섬유" value={`${formatMacroG(n.fiberG ?? 0)}g`} />
            <DetailRow label="단백질" value={`${formatMacroG(n.proteinG)}g`} />
            <DetailRow label="지방" value={`${formatMacroG(n.fatG)}g`} />
            <DetailRow
              label="나트륨"
              value={`${formatCalories(n.sodiumMg)}mg`}
            />
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
