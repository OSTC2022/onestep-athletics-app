"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Pencil, Scale } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { WeightQuickInput } from "@/components/weight-quick-input"
import {
  getNutritionProfile,
  getDefaultNutritionProfile,
  getRecentConditionLabel,
  type NutritionProfile,
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
import { COACHING_DIET_MODE_OPTIONS } from "@/lib/diet-coaching"
import { useHydrated } from "@/hooks/use-hydrated"
import { cn } from "@/lib/utils"

function OptionButtons<T extends string>({
  value,
  options,
  onChange,
  compact,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  compact?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-xl font-medium border transition-colors",
            compact ? "h-8 px-2.5 text-[12px]" : "h-9 px-3 text-[13px]",
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

export function NutritionStatusCard({
  onUpdated,
}: {
  onUpdated?: () => void
}) {
  const hydrated = useHydrated()
  const [version, setVersion] = useState(0)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<UserProfile | null>(null)
  const [savedHint, setSavedHint] = useState(false)

  const profile: NutritionProfile = useMemo(
    () => (hydrated ? getNutritionProfile() : getDefaultNutritionProfile()),
    [hydrated, version]
  )

  useEffect(() => {
    if (!hydrated || !editing) return
    setDraft(loadUserProfile())
  }, [hydrated, editing, version])

  const weeklyGoalKg = useMemo(() => {
    if (editing && draft) {
      return getWeeklyWeightGoalKg({
        ...draft,
        currentWeightKg: profile.currentWeightKg,
      })
    }
    return profile.weeklyWeightGoalKg
  }, [editing, draft, profile])

  const distanceKg =
    Math.round((profile.currentWeightKg - profile.targetWeightKg) * 10) / 10

  const updateDraft = <K extends keyof UserProfile>(
    key: K,
    value: UserProfile[K]
  ) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const startEdit = () => {
    if (!hydrated) return
    setDraft(loadUserProfile())
    setEditing(true)
    setSavedHint(false)
  }

  const cancelEdit = () => {
    setEditing(false)
    setDraft(null)
    setSavedHint(false)
  }

  const handleSave = () => {
    if (!draft) return
    saveUserProfile(draft)
    setEditing(false)
    setDraft(null)
    setSavedHint(true)
    setVersion((v) => v + 1)
    onUpdated?.()
    setTimeout(() => setSavedHint(false), 2000)
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4 text-accent" />
            현재 상태
          </CardTitle>
          {!editing ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 text-[12px] text-muted-foreground hover:text-accent"
              onClick={startEdit}
              disabled={!hydrated}
            >
              <Pencil className="h-3.5 w-3.5 mr-1" />
              수정
            </Button>
          ) : (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-[12px]"
                onClick={cancelEdit}
              >
                취소
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 px-3 text-[12px] bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={handleSave}
              >
                저장
              </Button>
            </div>
          )}
        </div>
        {savedHint && (
          <p className="text-[11px] text-accent mt-1">저장되었습니다 · 영양 목표가 갱신됩니다</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-secondary/40 px-3 py-2.5 col-span-2">
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
            {profile.weightChangeKg !== 0 && (
              <p className="text-[11px] text-muted-foreground mt-2 tabular-nums">
                최근 7일 변화{" "}
                <span
                  className={profile.weightChangeKg < 0 ? "text-accent" : ""}
                >
                  {profile.weightChangeKg > 0 ? "+" : ""}
                  {profile.weightChangeKg}kg
                </span>
              </p>
            )}
          </div>

          {editing && draft ? (
            <>
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
              <div className="col-span-2 rounded-lg bg-secondary/40 px-3 py-2.5">
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
            </>
          ) : (
            <>
              <div className="rounded-lg bg-secondary/40 px-3 py-2.5">
                <p className="text-xs text-muted-foreground mb-0.5">목표 체중</p>
                <p className="text-xl font-bold tabular-nums text-accent">
                  {profile.targetWeightKg}
                  <span className="text-sm font-normal text-muted-foreground ml-0.5">
                    kg
                  </span>
                </p>
              </div>
              <div className="rounded-lg bg-secondary/40 px-3 py-2.5">
                <p className="text-xs text-muted-foreground mb-0.5">목표까지</p>
                <p className="text-xl font-bold tabular-nums">
                  {distanceKg}
                  <span className="text-sm font-normal text-muted-foreground ml-0.5">
                    kg
                  </span>
                </p>
              </div>
            </>
          )}
        </div>

        {editing && draft ? (
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">목표 유형</Label>
              <OptionButtons<GoalType>
                value={draft.goalType}
                options={GOAL_OPTIONS}
                onChange={(v) => updateDraft("goalType", v)}
                compact
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
                  compact
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
            <Link
              href="/settings?section=detail"
              className="block text-center text-[11px] text-accent underline-offset-2 hover:underline hover:text-accent/80 pt-1"
            >
              키·나이·운동량 등 상세 설정
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">목표 기간</span>
              <span className="font-medium">{profile.targetWeeks}주</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">주당 목표</span>
              <span className="font-medium tabular-nums">
                {profile.weeklyWeightGoalKg > 0 ? "+" : ""}
                {profile.weeklyWeightGoalKg}kg
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">목표 유형</span>
              <Badge variant="outline" className="text-accent border-accent/40">
                {profile.goalLabel}
              </Badge>
            </div>
            {profile.goalLabel === "감량" ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">감량 모드</span>
                <span className="font-medium text-right text-[13px]">
                  {profile.dietModeLabel}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span className="text-muted-foreground">최근 컨디션</span>
              <span className="font-medium">
                {hydrated ? getRecentConditionLabel() : "미입력"}
              </span>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  )
}
