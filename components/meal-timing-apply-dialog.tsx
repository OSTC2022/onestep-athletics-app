"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  MEAL_TIMING_OPTIONS,
  type MealTiming,
} from "@/lib/food-recommendation-strategy"
import { mealTimingToApplySlot } from "@/lib/recommendation-meal-targets"
import type { FoodMealSlotId } from "@/lib/meal-slot-targets"
import type { RecommendFoodCombo } from "@/lib/food-recommendation-types"
import { cn } from "@/lib/utils"

export function MealTimingApplyDialog({
  combo,
  open,
  onOpenChange,
  onConfirm,
}: {
  combo: RecommendFoodCombo | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (combo: RecommendFoodCombo, slotId: FoodMealSlotId) => void
}) {
  if (!combo) return null

  const handlePick = (timing: MealTiming) => {
    onConfirm(combo, mealTimingToApplySlot(timing))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[340px] gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-3.5 pt-3.5 pb-2 border-b border-border/50 text-left">
          <DialogTitle className="text-[13px] font-semibold text-accent">
            식사 타이밍
          </DialogTitle>
          <DialogDescription className="text-[10px] text-muted-foreground mt-0.5">
            「{combo.title}」을 어느 끼니에 적용할까요?
          </DialogDescription>
        </DialogHeader>
        <div className="px-3 py-3">
          <div className="flex flex-wrap gap-1.5">
            {MEAL_TIMING_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handlePick(opt.id)}
                className={cn(
                  "rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                  "border-border/50 bg-secondary/20 text-muted-foreground",
                  "hover:border-accent/40 hover:bg-accent/10 hover:text-accent"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
