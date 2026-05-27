"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { WeightQuickInput } from "@/components/weight-quick-input"
import {
  getNutritionProfile,
  getDefaultNutritionProfile,
} from "@/lib/nutrition"
import {
  GOAL_OPTIONS,
  getWeeklyWeightGoalKg,
  loadUserProfile,
  saveUserProfile,
  type DietMode,
  type GoalType,
  type UserProfile,
} from "@/lib/user-profile"
import {
  COACHING_DIET_MODE_OPTIONS,
  calculateTargetPeriodDietPlan,
} from "@/lib/diet-coaching"
import { useHydrated } from "@/hooks/use-hydrated"
import { cn } from "@/lib/utils"

function OptionButtons<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-xl font-medium border transition-colors h-8 px-2.5 text-[12px]",
            value === option.value
              ? "bg-accent/15 border-accent/50 text-accent"
              : "bg-secondary/30 border-border/50 text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function NutritionStatusEditDialog({
  open,
  onOpenChange,
  onUpdated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
}) {
  const hydrated = useHydrated()
  const [version, setVersion] = useState(0)
  const [draft, setDraft] = useState<UserProfile | null>(null)

  const profile = useMemo(
    () => (hydrated ? getNutritionProfile() : getDefaultNutritionProfile()),
    [hydrated, version]
  )

  useEffect(() => {
    if (!open || !hydrated) return
    setDraft(loadUserProfile())
  }, [open, hydrated, version])

  const weeklyGoalKg = useMemo(() => {
    if (!draft) return profile.weeklyWeightGoalKg
    return getWeeklyWeightGoalKg({
      ...draft,
      currentWeightKg: profile.currentWeightKg,
    })
  }, [draft, profile])

  const targetPeriodPreview = useMemo(() => {
    if (!draft) return null
    return calculateTargetPeriodDietPlan({
      ...draft,
      currentWeightKg: profile.currentWeightKg,
    })
  }, [draft, profile.currentWeightKg])

  const updateDraft = <K extends keyof UserProfile>(
    key: K,
    value: UserProfile[K]
  ) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const handleSave = () => {
    if (!draft) return
    saveUserProfile(draft)
    setDraft(null)
    setVersion((v) => v + 1)
    onUpdated?.()
    onOpenChange(false)
  }

  const handleClose = () => {
    setDraft(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border/60">
          <DialogTitle className="text-base">현재 상태 수정</DialogTitle>
          <p className="text-[11px] text-muted-foreground font-normal">
            체중·목표를 바꾸면 영양 목표가 자동으로 갱신됩니다
          </p>
        </DialogHeader>

        <div className="px-4 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <div className="rounded-lg bg-secondary/40 px-3 py-2.5">
            <p className="text-xs text-muted-foreground mb-2">
              현재 체중 · 입력 시 영양 목표 자동 반영
            </p>
            <WeightQuickInput
              currentWeightKg={profile.currentWeightKg}
              onSaved={() => {
                setVersion((v) => v + 1)
                onUpdated?.()
              }}
            />
            {profile.weightChangeKg !== 0 ? (
              <p className="text-[11px] text-muted-foreground mt-2 tabular-nums">
                최근 7일 변화{" "}
                <span
                  className={profile.weightChangeKg < 0 ? "text-accent" : ""}
                >
                  {profile.weightChangeKg > 0 ? "+" : ""}
                  {profile.weightChangeKg}kg
                </span>
              </p>
            ) : null}
          </div>

          {draft ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-secondary/40 px-3 py-2.5 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    목표 체중 (kg)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    className="h-10 rounded-xl bg-background/60 border-border/60 tabular-nums"
                    value={draft.targetWeightKg}
                    onChange={(e) =>
                      updateDraft("targetWeightKg", Number(e.target.value))
                    }
                  />
                </div>
                <div className="rounded-lg bg-secondary/40 px-3 py-2.5 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    목표 기간 (주)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    className="h-10 rounded-xl bg-background/60 border-border/60 tabular-nums"
                    value={draft.targetWeeks}
                    onChange={(e) =>
                      updateDraft("targetWeeks", Number(e.target.value))
                    }
                  />
                </div>
              </div>

              <div className="rounded-lg bg-secondary/40 px-3 py-2.5">
                <p className="text-xs text-muted-foreground mb-1">목표까지</p>
                <p className="text-lg font-bold tabular-nums">
                  {Math.round(
                    (profile.currentWeightKg - draft.targetWeightKg) * 10
                  ) / 10}
                  <span className="text-sm font-normal text-muted-foreground ml-0.5">
                    kg
                  </span>
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">목표 유형</Label>
                <OptionButtons<GoalType>
                  value={draft.goalType}
                  options={GOAL_OPTIONS}
                  onChange={(v) => updateDraft("goalType", v)}
                />
              </div>

              {draft.goalType === "loss" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">감량 모드</Label>
                  <OptionButtons<DietMode>
                    value={
                      draft.dietMode === "fast_loss" ? "fast_loss" : "normal_loss"
                    }
                    options={COACHING_DIET_MODE_OPTIONS.map((o) => ({
                      value: o.value,
                      label: o.label,
                    }))}
                    onChange={(v) => updateDraft("dietMode", v)}
                  />
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {
                      COACHING_DIET_MODE_OPTIONS.find(
                        (o) =>
                          o.value ===
                          (draft.dietMode === "fast_loss"
                            ? "fast_loss"
                            : "normal_loss")
                      )?.description
                    }
                  </p>
                </div>
              ) : null}

              <div className="flex justify-between text-sm pt-1 border-t border-border/40">
                <span className="text-muted-foreground">주당 목표 (미리보기)</span>
                <span className="font-medium tabular-nums">
                  {weeklyGoalKg > 0 ? "+" : ""}
                  {weeklyGoalKg}kg
                </span>
              </div>

              {targetPeriodPreview?.usesTargetPeriod ? (
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  목표 기간에 맞춰 하루{" "}
                  {Math.abs(targetPeriodPreview.dailyCalorieAdjustment)}kcal
                  {targetPeriodPreview.dailyCalorieAdjustment < 0
                    ? " 적자"
                    : " 잉여"}
                  로 식단이 조정됩니다.
                </p>
              ) : null}

              {targetPeriodPreview?.advice ? (
                <div className="text-[11px] text-amber-600/90 dark:text-amber-400/90 leading-relaxed rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 space-y-1">
                  <p className="font-semibold">
                    {targetPeriodPreview.advice.headline}
                  </p>
                  <p>{targetPeriodPreview.advice.detail}</p>
                </div>
              ) : null}

              <Link
                href="/settings?section=detail"
                className="block text-center text-[11px] text-accent underline-offset-2 hover:underline hover:text-accent/80"
              >
                키·나이·운동량 등 상세 설정
              </Link>
            </>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border/60">
          <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
            취소
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={handleSave}
            disabled={!draft || !hydrated}
          >
            저장
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
