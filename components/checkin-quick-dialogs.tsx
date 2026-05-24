"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { WorkoutRecordForm } from "@/components/workout-record-form"
import { bodyParts, conditionOptions } from "@/lib/checkin-options"
import { loadTodayCheckin, saveTodayCheckin } from "@/lib/daily-checkin"
import {
  isChecklistItemCompleted,
  setChecklistItemCompleted,
} from "@/lib/daily-checklist"
import { FORM_TEXTAREA_CLASS } from "@/lib/form-styles"
import { cn } from "@/lib/utils"

function getExistingCheckin() {
  return (
    loadTodayCheckin() ?? {
      condition: null,
      painAreas: [] as string[],
      painDetail: "",
    }
  )
}

function syncConditionCheckin(condition: number | null) {
  const existing = getExistingCheckin()
  saveTodayCheckin({
    condition,
    painAreas: existing.painAreas,
    painDetail: existing.painDetail,
  })
  setChecklistItemCompleted(2, condition !== null)
}

function syncPainCheckin(painAreas: string[], painDetail: string) {
  const existing = getExistingCheckin()
  const detail = painAreas.length > 0 ? painDetail : ""
  saveTodayCheckin({
    condition: existing.condition,
    painAreas,
    painDetail: detail,
  })
  setChecklistItemCompleted(3, painAreas.length > 0)
}

export function ConditionQuickDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [condition, setCondition] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setCondition(null)
  }, [open])

  const toggleCondition = (value: number) => {
    setCondition((prev) => {
      const next = prev === value ? null : value
      syncConditionCheckin(next)
      return next
    })
  }

  const handleClear = () => {
    syncConditionCheckin(null)
    setCondition(null)
    onOpenChange(false)
  }

  const handleSave = () => {
    if (condition === null) return
    setIsSaving(true)
    syncConditionCheckin(condition)
    setIsSaving(false)
    onOpenChange(false)
  }

  const canClear = isChecklistItemCompleted(2)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60">
          <DialogTitle className="text-base">컨디션 입력</DialogTitle>
        </DialogHeader>
        <div className="px-5 py-4 space-y-4">
          <div className="flex justify-between gap-1.5">
            {conditionOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleCondition(option.value)}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-xs font-medium transition-all",
                  condition === option.value
                    ? `${option.color} text-background`
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          {condition !== null && (
            <p className="text-sm text-center text-muted-foreground">
              선택:{" "}
              <span className="font-medium text-foreground">
                {conditionOptions.find((o) => o.value === condition)?.label}
              </span>
              <span className="text-xs ml-1">· 다시 탭하면 해제</span>
            </p>
          )}
          <div className="flex gap-2">
            {canClear && (
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                className="flex-1 border-border"
              >
                입력 취소
              </Button>
            )}
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || condition === null}
              className={cn(
                "bg-accent text-accent-foreground hover:bg-accent/90",
                canClear ? "flex-1" : "w-full"
              )}
            >
              저장
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function PainQuickDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [painAreas, setPainAreas] = useState<string[]>([])
  const [painDetail, setPainDetail] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setPainAreas([])
    setPainDetail("")
  }, [open])

  const togglePainArea = (area: string) => {
    setPainAreas((prev) => {
      const next = prev.includes(area)
        ? prev.filter((a) => a !== area)
        : [...prev, area]
      const nextDetail = next.length === 0 ? "" : painDetail
      if (next.length === 0) setPainDetail("")
      syncPainCheckin(next, nextDetail)
      return next
    })
  }

  const handleClear = () => {
    syncPainCheckin([], "")
    setPainAreas([])
    setPainDetail("")
    onOpenChange(false)
  }

  const handleSave = () => {
    if (painAreas.length === 0) return
    setIsSaving(true)
    syncPainCheckin(painAreas, painDetail)
    setIsSaving(false)
    onOpenChange(false)
  }

  const canClear = isChecklistItemCompleted(3)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60">
          <DialogTitle className="text-base">통증 체크</DialogTitle>
        </DialogHeader>
        <div className="px-5 py-4 space-y-3 max-h-[min(70dvh,480px)] overflow-y-auto">
          <p className="text-sm text-muted-foreground">
            통증 부위를 선택하세요 · 다시 탭하면 해제
          </p>
          <div className="flex flex-wrap gap-2">
            {bodyParts.map((part) => (
              <button
                key={part}
                type="button"
                onClick={() => togglePainArea(part)}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm transition-all",
                  painAreas.includes(part)
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                {part}
              </button>
            ))}
          </div>
          {painAreas.length > 0 && (
            <div className="space-y-2">
              <div className="p-2.5 bg-destructive/10 rounded-lg">
                <p className="text-xs text-destructive">
                  선택: {painAreas.join(", ")}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="home-pain-detail" className="text-xs">
                  상세 내용
                  <span className="text-muted-foreground font-normal ml-1">
                    (선택)
                  </span>
                </Label>
                <Textarea
                  id="home-pain-detail"
                  placeholder="통증 강도, 언제부터 등"
                  value={painDetail}
                  onChange={(e) => setPainDetail(e.target.value)}
                  rows={2}
                  className={FORM_TEXTAREA_CLASS}
                />
              </div>
            </div>
          )}
          <div className="flex gap-2">
            {canClear && (
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                className="flex-1 border-border"
              >
                입력 취소
              </Button>
            )}
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || painAreas.length === 0}
              className={cn(
                painAreas.length > 0
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-accent text-accent-foreground hover:bg-accent/90",
                canClear ? "flex-1" : "w-full"
              )}
            >
              저장
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function WorkoutQuickDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const handleSaved = () => {
    setChecklistItemCompleted(4, true)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeOnOutsideClick={false}
        className="bg-card border-border flex max-h-[min(90dvh,720px)] w-[calc(100vw-2rem)] max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <DialogHeader className="shrink-0 border-b border-border/60 px-5 pt-5 pb-3">
          <DialogTitle>운동 기록 입력</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-4">
          <WorkoutRecordForm onSaved={handleSaved} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
