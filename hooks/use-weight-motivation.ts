"use client"

import { useEffect, useMemo, useState } from "react"
import {
  getDefaultNutritionProfile,
  getNutritionProfile,
} from "@/lib/nutrition"
import { loadUserProfile, USER_PROFILE_EVENT } from "@/lib/user-profile"
import {
  getWeightProgressSummary,
  WEIGHT_TRACKER_EVENT,
  type WeightProgressSummary,
} from "@/lib/weight-tracker"
import { useHydrated } from "@/hooks/use-hydrated"

export function emptyWeightProgress(): WeightProgressSummary {
  return {
    startWeightKg: 0,
    currentWeightKg: 0,
    targetWeightKg: 0,
    totalChangeKg: 0,
    lostKg: 0,
    gainedKg: 0,
    remainingToGoalKg: 0,
    goalProgressPercent: 0,
    recent7DayChangeKg: 0,
    startBmi: 0,
    currentBmi: 0,
    targetBmi: 0,
    totalBmiChange: 0,
    recent7DayBmiChange: 0,
    trackingDays: 0,
    hasHistory: false,
    goalDirection: "loss",
  }
}

export function buildWeightMotivationCopy(progress: WeightProgressSummary): {
  headline: string
  subline: string
} {
  const { goalDirection, lostKg, gainedKg, remainingToGoalKg, hasHistory } =
    progress

  if (!hasHistory) {
    return {
      headline: "체중 기록을 시작해 보세요",
      subline: "매일 입력하면 변화가 눈에 보입니다",
    }
  }

  if (goalDirection === "loss") {
    if (lostKg > 0) {
      return {
        headline: `지금까지 ${lostKg}kg 감량`,
        subline:
          remainingToGoalKg > 0
            ? `목표까지 ${remainingToGoalKg}kg · 꾸준히 가고 있어요`
            : "목표 체중에 도달했어요!",
      }
    }
    if (gainedKg > 0) {
      return {
        headline: `시작 대비 +${gainedKg}kg`,
        subline: "오늘부터 다시 리듬을 맞춰볼까요?",
      }
    }
    return {
      headline: "체중 유지 중",
      subline: "기록을 이어가면 작은 변화도 보여요",
    }
  }

  if (goalDirection === "gain") {
    if (gainedKg > 0) {
      return {
        headline: `지금까지 ${gainedKg}kg 증량`,
        subline:
          remainingToGoalKg < 0
            ? `목표까지 ${Math.abs(remainingToGoalKg)}kg`
            : "목표 체중에 도달했어요!",
      }
    }
    if (lostKg > 0) {
      return {
        headline: `시작 대비 -${lostKg}kg`,
        subline: "단백질·탄수 섭취를 챙겨보세요",
      }
    }
    return {
      headline: "체중 기록 중",
      subline: "목표 증량을 향해 기록을 쌓아가요",
    }
  }

  return {
    headline:
      Math.abs(progress.totalChangeKg) <= 0.3
        ? "목표 체중 근처 유지 중"
        : progress.totalChangeKg < 0
          ? `${lostKg}kg 감소`
          : `${gainedKg}kg 증가`,
    subline: `목표 ${progress.targetWeightKg}kg · ${Math.abs(remainingToGoalKg)}kg 차이`,
  }
}

export function useWeightMotivation() {
  const hydrated = useHydrated()
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!hydrated) return
    const refresh = () => setVersion((v) => v + 1)
    window.addEventListener(WEIGHT_TRACKER_EVENT, refresh)
    window.addEventListener(USER_PROFILE_EVENT, refresh)
    return () => {
      window.removeEventListener(WEIGHT_TRACKER_EVENT, refresh)
      window.removeEventListener(USER_PROFILE_EVENT, refresh)
    }
  }, [hydrated])

  const progress = useMemo(() => {
    if (!hydrated) return emptyWeightProgress()
    const user = loadUserProfile()
    const profile = getNutritionProfile()
    return getWeightProgressSummary(
      user.targetWeightKg,
      user.goalType,
      profile.currentWeightKg,
      user.heightCm
    )
  }, [hydrated, version])

  const profile = useMemo(
    () => (hydrated ? getNutritionProfile() : getDefaultNutritionProfile()),
    [hydrated, version]
  )

  const copy = buildWeightMotivationCopy(progress)

  return { hydrated, progress, profile, copy }
}
