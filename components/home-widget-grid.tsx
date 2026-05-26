"use client"

import type { ReactNode } from "react"
import { COL_SPAN_CLASS, type HomeWidgetItem } from "@/lib/home-layout"
import { cn } from "@/lib/utils"

export function HomeWidgetGrid({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("grid grid-cols-4 gap-3 auto-rows-auto", className)}>
      {children}
    </div>
  )
}

export function HomeWidgetGridCell({
  item,
  className,
  children,
}: {
  item: Pick<HomeWidgetItem, "id" | "cols" | "visible">
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        COL_SPAN_CLASS[item.cols],
        "min-w-0 h-full",
        !item.visible && "opacity-45",
        className
      )}
    >
      {children}
    </div>
  )
}

export function HomeWidgetContentWrap({ children }: { children: ReactNode }) {
  return <div className="h-full [&>*]:mb-0 [&>*]:h-full">{children}</div>
}
