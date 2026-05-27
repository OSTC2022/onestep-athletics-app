"use client"

import { useEffect, useState } from "react"
import { Trash2 } from "lucide-react"
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
import { FORM_INPUT_CLASS, FORM_SELECT_CLASS } from "@/lib/form-styles"
import {
  addCustomFood,
  deleteCustomFood,
  emptyCustomFoodInput,
  FOOD_CATEGORIES,
  updateCustomFood,
  type CustomFoodInput,
  type CustomFoodItem,
} from "@/lib/custom-food-store"
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
  required,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  unit: string
  required?: boolean
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">
        {label}
        {required ? " *" : ""}
      </Label>
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

export function CustomFoodFormDialog({
  open,
  onOpenChange,
  initialName = "",
  editFood = null,
  onSaved,
  onDeleted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialName?: string
  editFood?: CustomFoodItem | null
  onSaved?: (food: CustomFoodItem) => void
  onDeleted?: (id: string) => void
}) {
  const isEdit = editFood != null
  const [form, setForm] = useState<CustomFoodInput>(() =>
    emptyCustomFoodInput(initialName)
  )

  useEffect(() => {
    if (!open) return
    if (editFood) {
      setForm({
        name: editFood.name,
        category: editFood.category,
        servingGrams: editFood.servingGrams ?? 100,
        servingLabel: editFood.servingLabel ?? "1회",
        aliases: editFood.aliases,
        per100g: { ...editFood.per100g },
      })
      return
    }
    setForm(emptyCustomFoodInput(initialName))
  }, [open, editFood, initialName])

  const updateField = <K extends keyof CustomFoodInput>(
    key: K,
    value: CustomFoodInput[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const updateMacro = (
    key: keyof CustomFoodInput["per100g"],
    value: string
  ) => {
    const parsed = parseNumber(value)
    setForm((prev) => ({
      ...prev,
      per100g: {
        ...prev.per100g,
        [key]: value === "" && (key === "sugarG" || key === "fiberG")
          ? undefined
          : parsed,
      },
    }))
  }

  const handleSave = () => {
    const name = form.name.trim()
    if (!name) {
      toast.error("음식 이름을 입력해 주세요")
      return
    }

    const { per100g } = form
    if (
      per100g.calories <= 0 &&
      per100g.carbsG <= 0 &&
      per100g.proteinG <= 0 &&
      per100g.fatG <= 0
    ) {
      toast.error("영양성분을 최소 1개 이상 입력해 주세요")
      return
    }

    const payload: CustomFoodInput = {
      ...form,
      name,
      servingGrams: Math.max(1, form.servingGrams ?? 100),
    }

    const saved = isEdit
      ? updateCustomFood(editFood.id, payload)
      : addCustomFood(payload)

    if (!saved) {
      toast.error("저장에 실패했습니다")
      return
    }

    toast.success(isEdit ? "음식 정보를 수정했습니다" : "내 음식을 추가했습니다")
    onSaved?.(saved)
    onOpenChange(false)
  }

  const handleDelete = () => {
    if (!editFood) return
    if (!window.confirm(`「${editFood.name}」을(를) 삭제할까요?`)) return

    if (!deleteCustomFood(editFood.id)) {
      toast.error("삭제에 실패했습니다")
      return
    }

    toast.message("내 음식을 삭제했습니다")
    onDeleted?.(editFood.id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md max-h-[90dvh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2 border-b border-border/60">
          <DialogTitle className="text-base">
            {isEdit ? "내 음식 수정" : "내 음식 추가"}
          </DialogTitle>
          <p className="text-[12px] text-muted-foreground font-normal leading-relaxed">
            영양성분표 기준 100g당 값을 입력하면 저장 후 검색·기록에 사용할 수 있어요.
          </p>
        </DialogHeader>

        <div className="px-4 py-3 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">음식 이름 *</Label>
            <Input
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="예: 우리집 김치찌개"
              className={FORM_INPUT_CLASS}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">카테고리</Label>
              <select
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
                className={FORM_SELECT_CLASS}
              >
                {FOOD_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">
                1회 무게 (piece_weight_g)
              </Label>
              <Input
                type="number"
                min={1}
                value={form.servingGrams ?? 100}
                onChange={(e) =>
                  updateField("servingGrams", Math.max(1, parseNumber(e.target.value)))
                }
                className={cn(FORM_INPUT_CLASS, "tabular-nums")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">
              1회 표시 (예: 1토막, 1공기)
            </Label>
            <Input
              value={form.servingLabel ?? ""}
              onChange={(e) => updateField("servingLabel", e.target.value)}
              placeholder="예: 1그릇, 1조각"
              className={FORM_INPUT_CLASS}
            />
          </div>

          <div className="rounded-xl border border-border/60 overflow-hidden">
            <div className="px-3 py-2 bg-secondary/40 border-b border-border/40">
              <p className="text-[12px] font-medium">영양성분표 (100g 기준)</p>
            </div>
            <div className="p-3 grid grid-cols-2 gap-3">
              <NutritionInputRow
                label="칼로리"
                value={String(form.per100g.calories || "")}
                onChange={(v) => updateMacro("calories", v)}
                unit="kcal"
                required
              />
              <NutritionInputRow
                label="탄수화물"
                value={String(form.per100g.carbsG || "")}
                onChange={(v) => updateMacro("carbsG", v)}
                unit="g"
                required
              />
              <NutritionInputRow
                label="단백질"
                value={String(form.per100g.proteinG || "")}
                onChange={(v) => updateMacro("proteinG", v)}
                unit="g"
                required
              />
              <NutritionInputRow
                label="지방"
                value={String(form.per100g.fatG || "")}
                onChange={(v) => updateMacro("fatG", v)}
                unit="g"
                required
              />
              <NutritionInputRow
                label="나트륨"
                value={String(form.per100g.sodiumMg || "")}
                onChange={(v) => updateMacro("sodiumMg", v)}
                unit="mg"
                required
              />
              <NutritionInputRow
                label="당류"
                value={
                  form.per100g.sugarG != null ? String(form.per100g.sugarG) : ""
                }
                onChange={(v) => updateMacro("sugarG", v)}
                unit="g"
              />
              <NutritionInputRow
                label="식이섬유"
                value={
                  form.per100g.fiberG != null ? String(form.per100g.fiberG) : ""
                }
                onChange={(v) => updateMacro("fiberG", v)}
                unit="g"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="px-4 py-3 border-t border-border/60 gap-2 sm:gap-2">
          {isEdit ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              삭제
            </Button>
          ) : null}
          <div className="flex-1" />
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button
            type="button"
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={handleSave}
          >
            {isEdit ? "수정 저장" : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
