"use client"

import { TodayTrainingCard } from "@/components/today-training-card"
import { useTodayTrainingSession } from "@/hooks/use-training-session"
import {
  sizePaddingClass,
  sizeStatClass,
  sizeTitleClass,
  type HomeWidgetSize,
} from "@/lib/home-layout"

export function TodayTrainingWidget({ size }: { size: HomeWidgetSize }) {
  const session = useTodayTrainingSession()
  const compact = size === "compact"

  return (
    <TodayTrainingCard
      session={session}
      compact={compact}
      padClassName={sizePaddingClass(size)}
      titleClassName={sizeTitleClass(size)}
      statClassName={sizeStatClass(size)}
    />
  )
}
