"use client"

import { useEffect, useState } from "react"
import { RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FORM_INPUT_CLASS } from "@/lib/form-styles"
import type { FoodDatabaseItem } from "@/lib/food-database"
import { getPieceWeightG } from "@/lib/food-database"
import {
  clearFoodNutritionOverride,
  getFoodNutritionOverride,
  hasFoodNutritionOverride,
  isNutritionOverrideEditable,
  saveFoodNutritionOverride,
  type NutritionOverrideFoodId,
} from "@/lib/food-nutrition-overrides"
import { cn } from "@/lib/utils"

function parseNumber(value: string): number {
  const n = Number(value.replace(/,/g, ""))
  return Number.isFinite(n) ? n : 0
}

function NutritionInputRow({
  label,
  value,
  onChange,
  unit,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  unit: string
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(FORM_INPUT_CLASS, "pr-10 tabular-nums")}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
          {unit}
        </span>
      </div>
    </div>
  )
}

export function FoodNutritionOverrideDialog({
  open,
  onOpenChange,
  food,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  food: FoodDatabaseItem | null
  onSaved?: () => void
}) {
  const [pieceWeightG, setPieceWeightG] = useState(100)
  const [servingLabel, setServingLabel] = useState("1회")
  const [per100g, setPer100g] = useState(food?.per100g ?? {
    calories: 0,
    carbsG: 0,
    proteinG: 0,
    fatG: 0,
    sodiumMg: 0,
  })

  useEffect(() => {
    if (!open || !food) return
    const override = getFoodNutritionOverride(food.id)
    const basePiece = getPieceWeightG(food) ?? 100
    setPieceWeightG(override?.pieceWeightG ?? basePiece)
    setServingLabel(override?.servingLabel ?? food.servingLabel ?? "1회")
    setPer100g({ ...food.per100g, ...override?.per100g })
  }, [open, food])

  if (!food || !isNutritionOverrideEditable(food.id)) return null

  const handleSave = () => {
    saveFoodNutritionOverride(food.id as NutritionOverrideFoodId, {
      pieceWeightG,
      servingLabel: servingLabel.trim() || undefined,
      per100g,
    })
    toast.success(`「${food.name}」 영양 기준을 저장했습니다`)
    onSaved?.()
    onOpenChange(false)
  }

  const handleReset = () => {
    if (!window.confirm(`「${food.name}」 사용자 수정을 초기화할까요?`)) return
    clearFoodNutritionOverride(food.id as NutritionOverrideFoodId)
    toast.message("기본 영양값으로 되돌렸습니다")
    onSaved?.()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md max-h-[90dvh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2 border-b border-border/60">
          <DialogTitle className="text-base">내 기준 영양 수정</DialogTitle>
          <p className="text-[12px] text-muted-foreground font-normal leading-relaxed">
            {food.name} · 제품마다 차이가 커서 100g당 영양과 1회 무게를 직접 맞출 수
            있어요.
          </p>
        </DialogHeader>

        <div className="px-4 py-3 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">
                1회 무게 (piece_weight_g)
              </Label>
              <Input
                type="number"
                min={1}
                value={pieceWeightG}
                onChange={(e) =>
                  setPieceWeightG(Math.max(1, parseNumber(e.target.value)))
                }
                className={cn(FORM_INPUT_CLASS, "tabular-nums")}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">1회 표시</Label>
              <Input
                value={servingLabel}
                onChange={(e) => setServingLabel(e.target.value)}
                placeholder="예: 1토막, 1개"
                className={FORM_INPUT_CLASS}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border/60 overflow-hidden">
            <div className="px-3 py-2 bg-secondary/40 border-b border-border/40">
              <p className="text-[12px] font-medium">영양성분표 (100g 기준)</p>
            </div>
            <div className="p-3 grid grid-cols-2 gap-3">
              <NutritionInputRow
                label="칼로리"
                value={String(per100g.calories || "")}
                onChange={(v) =>
                  setPer100g((p) => ({ ...p, calories: parseNumber(v) }))
                }
                unit="kcal"
              />
              <NutritionInputRow
                label="탄수화물"
                value={String(per100g.carbsG || "")}
                onChange={(v) =>
                  setPer100g((p) => ({ ...p, carbsG: parseNumber(v) }))
                }
                unit="g"
              />
              <NutritionInputRow
                label="단백질"
                value={String(per100g.proteinG || "")}
                onChange={(v) =>
                  setPer100g((p) => ({ ...p, proteinG: parseNumber(v) }))
                }
                unit="g"
              />
              <NutritionInputRow
                label="지방"
                value={String(per100g.fatG || "")}
                onChange={(v) =>
                  setPer100g((p) => ({ ...p, fatG: parseNumber(v) }))
                }
                unit="g"
              />
              <NutritionInputRow
                label="나트륨"
                value={String(per100g.sodiumMg || "")}
                onChange={(v) =>
                  setPer100g((p) => ({ ...p, sodiumMg: parseNumber(v) }))
                }
                unit="mg"
              />
            </div>
          </div>

          {hasFoodNutritionOverride(food.id) ? (
            <p className="text-[10px] text-accent">사용자 수정값이 적용 중입니다</p>
          ) : null}
        </div>

        <DialogFooter className="px-4 py-3 border-t border-border/60 gap-2 sm:gap-2">
          {hasFoodNutritionOverride(food.id) ? (
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground"
              onClick={handleReset}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              초기화
            </Button>
          ) : null}
          <div className="flex-1" />
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            type="button"
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={handleSave}
          >
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
