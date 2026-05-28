"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { FoodMealSlotId } from "@/lib/meal-slot-targets"
import {
  mealSlotPreviewButtonClass,
  type MealSlotAddPreview,
} from "@/lib/meal-slot-add-preview"
import { macroStatusColor } from "@/lib/meal-evaluation"
import { formatCalories } from "@/lib/user-profile"
import { cn } from "@/lib/utils"

export function MealSlotApplyDialog({
  foodName,
  slotPreviews = [],
  open,
  onOpenChange,
  onConfirm,
}: {
  foodName: string | null
  slotPreviews?: MealSlotAddPreview[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (slotId: FoodMealSlotId) => void
}) {
  if (!foodName) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[340px] gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-3.5 pt-3.5 pb-2 border-b border-border/50 text-left">
          <DialogTitle className="text-[13px] font-semibold text-accent">
            어느 끼니에 추가할까요?
          </DialogTitle>
          <DialogDescription className="text-[10px] text-muted-foreground mt-0.5">
            「{foodName}」을 아래 식단에 바로 적용합니다.
          </DialogDescription>
        </DialogHeader>
        <div className="px-3 py-3 space-y-2">
          <div className="grid grid-cols-2 gap-1.5">
            {slotPreviews.map((preview) => (
              <button
                key={preview.slotId}
                type="button"
                onClick={() => {
                  onConfirm(preview.slotId)
                  onOpenChange(false)
                }}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left transition-colors",
                  mealSlotPreviewButtonClass(preview.calorieStatus)
                )}
              >
                <p className="text-[12px] font-semibold leading-none">{preview.label}</p>
                <p
                  className={cn(
                    "text-[10px] tabular-nums mt-1.5 font-medium",
                    macroStatusColor(preview.calorieStatus)
                  )}
                >
                  {formatCalories(preview.projectedCalories)}kcal
                  {preview.targetCalories > 0
                    ? ` · ${preview.calorieRatio}%`
                    : ""}
                </p>
                <p className="text-[9px] text-muted-foreground/90 mt-0.5 tabular-nums">
                  목표 {formatCalories(preview.targetCalories)}kcal
                  {preview.currentCalories > 0
                    ? ` · 현재 ${formatCalories(preview.currentCalories)}`
                    : ""}
                </p>
                <p className="text-[9px] mt-0.5 opacity-90">{preview.calorieStatusLabel}</p>
                {preview.nutrientWarning ? (
                  <p className="text-[9px] text-amber-400/90 mt-0.5 leading-snug">
                    {preview.nutrientWarning}
                  </p>
                ) : null}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-muted-foreground/75 leading-relaxed px-0.5">
            색상:{" "}
            <span className="text-accent">초록 적정</span>
            {" · "}
            <span className="text-amber-400">노랑 초과</span>
            {" · "}
            <span className="text-red-400">빨강 많이 초과</span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
