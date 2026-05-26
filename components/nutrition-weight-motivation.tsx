"use client"

import Link from "next/link"
import { ChevronRight, Sparkles, TrendingDown, TrendingUp } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import {
  useWeightMotivation,
} from "@/hooks/use-weight-motivation"

export function NutritionWeightMotivation() {
  const { progress, profile, copy } = useWeightMotivation()
  const showProgressBar =
    progress.hasHistory &&
    (progress.goalDirection === "loss" || progress.goalDirection === "gain")

  return (
    <div className="rounded-2xl border border-accent/25 bg-accent/10 px-4 py-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
          {progress.goalDirection === "gain" ? (
            <TrendingUp className="h-5 w-5 text-accent" />
          ) : (
            <TrendingDown className="h-5 w-5 text-accent" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent shrink-0" />
            <p className="text-[11px] text-accent font-medium">나의 변화</p>
          </div>
          <p className="text-xl font-bold tracking-tight mt-0.5 text-accent">
            {copy.headline}
          </p>
          <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
            {copy.subline}
          </p>
        </div>
      </div>

      {progress.hasHistory && (
        <>
          <div className="flex items-center justify-between text-[13px] tabular-nums px-1">
            <span className="text-muted-foreground">
              시작{" "}
              <span className="text-foreground font-semibold">
                {progress.startWeightKg}kg
              </span>
            </span>
            <span className="text-muted-foreground">→</span>
            <span className="text-muted-foreground">
              현재{" "}
              <span className="text-accent font-bold">
                {progress.currentWeightKg}kg
              </span>
            </span>
            <span className="text-muted-foreground">
              목표{" "}
              <span className="text-foreground font-semibold">
                {progress.targetWeightKg}kg
              </span>
            </span>
          </div>
          {progress.currentBmi > 0 ? (
            <div className="flex items-center justify-between text-[12px] tabular-nums px-1">
              <span className="text-muted-foreground">
                BMI {progress.startBmi}
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="text-accent font-semibold">
                {progress.currentBmi}
              </span>
              <span className="text-muted-foreground">
                목표 {progress.targetBmi}
              </span>
              {progress.totalBmiChange !== 0 ? (
                <span
                  className={cn(
                    "font-medium",
                    progress.totalBmiChange < 0 && "text-accent"
                  )}
                >
                  ({progress.totalBmiChange > 0 ? "+" : ""}
                  {progress.totalBmiChange})
                </span>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      {showProgressBar && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground">목표 진행률</span>
            <span className="font-semibold text-accent tabular-nums">
              {Math.round(progress.goalProgressPercent)}%
            </span>
          </div>
          <Progress
            value={progress.goalProgressPercent}
            className="h-2 bg-secondary/60"
          />
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground px-1">
        {progress.trackingDays > 0 && (
          <span>{progress.trackingDays}일 기록</span>
        )}
        {profile.weightChangeKg !== 0 && (
          <span
            className={cn(
              "tabular-nums",
              profile.weightChangeKg < 0 && "text-accent"
            )}
          >
            최근 7일{" "}
            {profile.weightChangeKg > 0 ? "+" : ""}
            {profile.weightChangeKg}kg
          </span>
        )}
        {progress.recent7DayBmiChange !== 0 && progress.currentBmi > 0 && (
          <span
            className={cn(
              "tabular-nums",
              progress.recent7DayBmiChange < 0 && "text-accent"
            )}
          >
            BMI{" "}
            {progress.recent7DayBmiChange > 0 ? "+" : ""}
            {progress.recent7DayBmiChange}
          </span>
        )}
      </div>
    </div>
  )
}

const HOME_C = {
  lime: "#64b869",
  cardSection: "#0a0a0a",
  divider: "#1a1a1a",
  textSub: "#888888",
} as const

export function NutritionWeightMotivationCompact({
  className,
}: {
  className?: string
}) {
  const { progress, copy } = useWeightMotivation()
  const showProgress =
    progress.hasHistory &&
    (progress.goalDirection === "loss" || progress.goalDirection === "gain")

  return (
    <Link
      href="/nutrition"
      className={cn(
        "block rounded-2xl p-[16px] transition-opacity active:opacity-80",
        className
      )}
      style={{
        backgroundColor: "rgba(85, 153, 97, 0.08)",
        border: `1px solid rgba(100, 184, 105, 0.25)`,
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="h-8 w-8 rounded-[9px] flex items-center justify-center shrink-0"
            style={{ backgroundColor: "rgba(85, 153, 97, 0.14)" }}
          >
            {progress.goalDirection === "gain" ? (
              <TrendingUp className="h-4 w-4" style={{ color: HOME_C.lime }} />
            ) : (
              <TrendingDown className="h-4 w-4" style={{ color: HOME_C.lime }} />
            )}
          </div>
          <div className="min-w-0">
            <p
              className="text-[11px] font-medium leading-none"
              style={{ color: HOME_C.lime }}
            >
              나의 변화
            </p>
            <p
              className="text-[17px] font-bold tabular-nums tracking-[-0.01em] mt-1 truncate"
              style={{ color: HOME_C.lime }}
            >
              {copy.headline}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 pt-0.5">
          {showProgress && (
            <span
              className="text-[13px] font-semibold tabular-nums"
              style={{ color: HOME_C.lime }}
            >
              {Math.round(progress.goalProgressPercent)}%
            </span>
          )}
          <ChevronRight className="h-4 w-4" style={{ color: HOME_C.textSub }} />
        </div>
      </div>

      {progress.hasHistory ? (
        <>
          <p className="text-[12px] tabular-nums" style={{ color: HOME_C.textSub }}>
            {progress.startWeightKg}kg →{" "}
            <span className="font-semibold" style={{ color: "#fff" }}>
              {progress.currentWeightKg}kg
            </span>
            {" · "}목표 {progress.targetWeightKg}kg
          </p>
          {progress.currentBmi > 0 ? (
            <p className="text-[11px] tabular-nums mt-1" style={{ color: HOME_C.textSub }}>
              BMI {progress.startBmi} →{" "}
              <span className="font-semibold" style={{ color: HOME_C.lime }}>
                {progress.currentBmi}
              </span>
              {" · "}목표 {progress.targetBmi}
              {progress.totalBmiChange !== 0 ? (
                <span style={{ color: HOME_C.lime }}>
                  {" "}
                  ({progress.totalBmiChange > 0 ? "+" : ""}
                  {progress.totalBmiChange})
                </span>
              ) : null}
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-[12px]" style={{ color: HOME_C.textSub }}>
          {copy.subline}
        </p>
      )}

      {showProgress && (
        <div
          className="mt-2.5 h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: HOME_C.cardSection }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, progress.goalProgressPercent)}%`,
              backgroundColor: HOME_C.lime,
            }}
          />
        </div>
      )}
    </Link>
  )
}
