"use client"

import {
  formatMacroG,
  getNutritionPercentColor,
  nutritionFulfillmentPercent,
} from "@/lib/food-nutrition-utils"

export function MacroRangeLabel({
  value,
  target,
  unit,
  formatValue,
}: {
  value: number
  target: number
  unit: string
  formatValue?: (value: number) => string
}) {
  const format = formatValue ?? formatMacroG
  const suffix = unit || "kcal"
  const unitSuffix = suffix === "kcal" || suffix === "mg" ? ` ${suffix}` : suffix
  const fulfillmentPct = nutritionFulfillmentPercent(value, target)
  const pctColor = getNutritionPercentColor(fulfillmentPct)

  return (
    <>
      {format(value)} / {format(target)}
      {unitSuffix}{" "}
      <span style={{ color: pctColor }}>({fulfillmentPct}%)</span>
    </>
  )
}
