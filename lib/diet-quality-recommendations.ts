import type { DietJudgmentKind } from "@/lib/food-nutrition-utils"
import type {
  NutritionDeficitAnalysis,
  RecommendFoodCombo,
  RecommendFoodsRequest,
} from "@/lib/food-recommendation-types"

export type QualityFocusKind =
  | DietJudgmentKind
  | "fat-warn"
  | "sodium-warn"
  | "carbs-low"

export type DietQualityFocus =
  | "all"
  | "deficit_fill"
  | "excess_control"
  | "balanced"
  | QualityFocusKind

export type RecommendationSection = {
  id: string
  title: string
  description: string
  combos: RecommendFoodCombo[]
}

export type FocusPanelMeta = {
  title: string
  subtitle: string
  expertReason: string
}

const TEMPLATE_SECTION: Record<string, { sectionId: string; title: string }> = {
  gap_fill: { sectionId: "deficit_fill", title: "부족 영양소 보완 추천" },
  high_protein_low_fat: {
    sectionId: "deficit_fill",
    title: "부족 영양소 보완 추천",
  },
  satiety: { sectionId: "deficit_fill", title: "부족 영양소 보완 추천" },
  post_workout: { sectionId: "recovery", title: "운동하는 사람용 균형식" },
  pre_run_energy: { sectionId: "recovery", title: "운동하는 사람용 균형식" },
  optimal_meal: { sectionId: "balanced", title: "오늘의 현실 식사 조합" },
  korean_adjust: { sectionId: "balanced", title: "오늘의 현실 식사 조합" },
  fat_loss_realistic: { sectionId: "balanced", title: "오늘의 현실 식사 조합" },
  convenience: { sectionId: "convenience", title: "편의점·간편식 조합" },
  light_dinner: { sectionId: "excess_control", title: "주의 영양소 낮춘 추천" },
  snack_light: { sectionId: "excess_control", title: "주의 영양소 낮춘 추천" },
  light_cleanup: { sectionId: "excess_control", title: "주의 영양소 낮춘 추천" },
}

function templateIdFromCombo(combo: RecommendFoodCombo): string {
  const base = combo.id.split("-")[0]
  return base ?? combo.id
}

function comboSugarTotal(combo: RecommendFoodCombo): number {
  return combo.items.reduce((sum, item) => sum + (item.sugar ?? 0), 0)
}

function focusScore(
  combo: RecommendFoodCombo,
  focus: DietQualityFocus,
  analysis: NutritionDeficitAnalysis
): number {
  const templateId = templateIdFromCombo(combo)
  const sugar = comboSugarTotal(combo)
  let score = 0

  switch (focus) {
    case "protein-low":
      score += combo.total.protein * 3
      if (templateId === "high_protein_low_fat") score += 40
      if (templateId === "gap_fill") score += 25
      if (combo.tags.some((t) => t.includes("단백") || t.includes("고단백"))) score += 15
      if (analysis.flags.includes("fat_high") && combo.total.fat <= 18) score += 20
      if (analysis.flags.includes("sugar_high") && sugar <= 12) score += 15
      if (combo.total.protein < 20) score -= 30
      break
    case "fiber-low":
      score += combo.total.fiber * 8
      if (templateId === "satiety") score += 40
      if (templateId === "gap_fill") score += 20
      if (analysis.flags.includes("sodium_high") && combo.total.sodium < 700) score += 15
      if (analysis.flags.includes("fat_high") && combo.total.fat <= 20) score += 10
      if (combo.total.fiber < 4) score -= 25
      break
    case "calorie-low":
      score += Math.min(combo.total.calories, 650) * 0.08
      if (combo.total.calories >= 250 && combo.total.calories <= 650) score += 25
      if (templateId === "gap_fill" || templateId === "post_workout") score += 20
      if (combo.total.protein >= 20 && combo.total.carbs >= 30) score += 15
      if (combo.total.calories < 180) score -= 15
      break
    case "carbs-low":
      score += combo.total.carbs * 1.5
      if (templateId === "pre_run_energy" || templateId === "post_workout") score += 35
      if (templateId === "gap_fill") score += 20
      if (combo.total.carbs >= 40) score += 15
      if (combo.total.carbs < 25) score -= 20
      break
    case "sugar-warn":
      score += Math.max(0, 25 - sugar) * 4
      if (templateId === "light_dinner" || templateId === "light_cleanup") score += 30
      if (templateId === "high_protein_low_fat") score += 20
      if (sugar <= 8) score += 25
      if (sugar > 18) score -= 40
      if (combo.tags.some((t) => t.includes("과일") || t.includes("디저트"))) score -= 30
      break
    case "fat-warn":
      score += Math.max(0, 22 - combo.total.fat) * 3
      if (templateId === "high_protein_low_fat" || templateId === "light_dinner") score += 30
      if (combo.total.fat <= 15) score += 20
      if (combo.total.protein >= 25) score += 10
      if (combo.total.fat > 28) score -= 35
      break
    case "sodium-warn":
      score += Math.max(0, 800 - combo.total.sodium) * 0.05
      if (templateId === "light_cleanup" || templateId === "light_dinner") score += 30
      if (combo.total.sodium <= 500) score += 25
      if (combo.tags.some((t) => t.includes("국물"))) score -= 40
      if (templateId === "soup_stew") score -= 50
      break
    case "calorie-high":
      score += Math.max(0, 450 - combo.total.calories) * 0.1
      if (templateId === "light_cleanup" || templateId === "light_dinner") score += 35
      if (combo.total.calories <= 350) score += 20
      break
    case "excess_control":
      score +=
        Math.max(0, 450 - combo.total.calories) * 0.05 +
        Math.max(0, 800 - combo.total.sodium) * 0.03 +
        Math.max(0, 20 - sugar) * 2
      if (templateId === "light_cleanup" || templateId === "light_dinner") score += 25
      break
    case "deficit_fill":
      score += combo.total.protein * 1.5 + combo.total.fiber * 5
      if (templateId === "gap_fill" || templateId === "high_protein_low_fat") score += 20
      break
    default:
      score += combo.total.protein + combo.total.fiber
  }

  return score
}

function comboMatchesFocus(
  combo: RecommendFoodCombo,
  focus: DietQualityFocus,
  analysis: NutritionDeficitAnalysis
): boolean {
  if (focus === "all") return true
  return focusScore(combo, focus, analysis) >= 15
}

export function buildFocusPanelMeta(
  focus: DietQualityFocus,
  analysis: NutritionDeficitAnalysis
): FocusPanelMeta | null {
  if (focus === "all") return null

  const caution: string[] = []
  if (analysis.flags.includes("fat_high")) caution.push("지방")
  if (analysis.flags.includes("sodium_high")) caution.push("나트륨")
  if (analysis.flags.includes("sugar_high")) caution.push("당류")
  const cautionText =
    caution.length > 0 ? `${caution.join(", ")}은 이미 높은 편이라 ` : ""

  switch (focus) {
    case "protein-low":
      return {
        title: "단백질 보충 추천",
        subtitle: "닭·생선·계란·두부·콩류 등 다양한 단백질 소스",
        expertReason:
          cautionText.length > 0
            ? `현재 단백질이 목표 대비 약 ${Math.max(0, Math.round(analysis.proteinGap))}g 부족합니다. ${cautionText}지방·당이 높은 육류보다 저지방 단백질과 채소 조합을 우선 추천합니다.`
            : `현재 단백질이 목표 대비 약 ${Math.max(0, Math.round(analysis.proteinGap))}g 부족합니다. 닭가슴살만 반복하지 않고, 계란·두부·생선·살코기·그릭요거트 등으로 균형 있게 보충할 수 있는 조합입니다.`,
      }
    case "fiber-low":
      return {
        title: "식이섬유 보충 추천",
        subtitle: "채소·버섯·잡곡·콩류·과일 소량",
        expertReason:
          cautionText.length > 0
            ? `식이섬유가 약 ${Math.max(0, Math.round(analysis.fiberGap))}g 부족합니다. ${cautionText}고지방·국물류보다 현미·나물·두부·과일 소량 조합이 더 적합합니다.`
            : `식이섬유가 약 ${Math.max(0, Math.round(analysis.fiberGap))}g 부족합니다. 단품 위주가 아니라 밥·단백질·채소가 함께 들어가는 식사 조합으로 보충하는 것이 좋습니다.`,
      }
    case "calorie-low":
      return {
        title: "칼로리 보충 추천",
        subtitle: "훈련 유지용 탄수화물 + 단백질 조합",
        expertReason: `오늘 칼로리가 목표 대비 약 ${Math.max(0, Math.round(analysis.calorieGap))}kcal 부족합니다. ${cautionText || ""}단순 고칼로리 음식보다 탄수화물과 단백질을 함께 보충하는 회복·균형식을 추천합니다.`,
      }
    case "carbs-low":
      return {
        title: "탄수화물 보충 추천",
        subtitle: "밥·고구마·바나나·오트밀 등 소화 쉬운 탄수화물",
        expertReason: `탄수화물이 약 ${Math.max(0, Math.round(analysis.carbsGap))}g 부족합니다. 러닝·훈련 에너지를 유지하려면 탄수화물을 과하게 줄이지 말고, 소화 부담이 적은 탄수화물을 소량 포함하는 것이 좋습니다.`,
      }
    case "sugar-warn":
      return {
        title: "당류 최소화 추천",
        subtitle: "무가당·저당 위주의 현실적인 대체식",
        expertReason: `오늘 당류 섭취가 목표를 넘었습니다. 음료·디저트·당 높은 과일 대신 무가당 요거트, 견과류 소량, 계란, 두부, 생선·닭가슴살·채소 조합처럼 당 부담이 낮은 식사를 추천합니다.`,
      }
    case "fat-warn":
      return {
        title: "지방 조절 추천",
        subtitle: "고단백·저지방 식사 조합",
        expertReason: `지방 섭취가 목표보다 높은 편입니다. 튀김·치즈·삼겹·갈비보다 닭가슴살·생선·두부·계란·채소 중심으로 다음 끼니를 가볍게 조절하는 것이 좋습니다.`,
      }
    case "sodium-warn":
      return {
        title: "나트륨 낮춘 추천",
        subtitle: "국물류 대신 밥+단백질+채소 조합",
        expertReason: `오늘 나트륨이 높기 때문에 국·찌개·라면·가공육보다 생선구이·닭가슴살·두부·채소·밥류 조합이 더 적합합니다.`,
      }
    case "calorie-high":
      return {
        title: "가벼운 정리식 추천",
        subtitle: "추가 고칼로리 식사 대신 정리",
        expertReason: `오늘 칼로리가 이미 충분하거나 초과 상태입니다. 추가로 많이 먹기보다 단백질 소량 + 채소 + 수분 보충 중심의 가벼운 정리식을 추천합니다.`,
      }
    default:
      return null
  }
}

export function getFocusedCombos(
  combos: RecommendFoodCombo[],
  focus: DietQualityFocus,
  analysis: NutritionDeficitAnalysis,
  limit = 3
): RecommendFoodCombo[] {
  if (focus === "all") return combos.slice(0, limit)

  const ranked = [...combos]
    .filter((combo) => comboMatchesFocus(combo, focus, analysis))
    .sort((a, b) => focusScore(b, focus, analysis) - focusScore(a, focus, analysis))

  if (ranked.length > 0) return ranked.slice(0, limit)

  return [...combos]
    .sort((a, b) => focusScore(b, focus, analysis) - focusScore(a, focus, analysis))
    .slice(0, limit)
}

export function groupRecommendationsIntoSections(
  combos: RecommendFoodCombo[],
  analysis: NutritionDeficitAnalysis
): RecommendationSection[] {
  const sectionMap = new Map<string, RecommendationSection>()

  const ensure = (id: string, title: string, description: string) => {
    if (!sectionMap.has(id)) {
      sectionMap.set(id, { id, title, description, combos: [] })
    }
    return sectionMap.get(id)!
  }

  if (
    analysis.flags.some((f) =>
      ["protein_low", "fiber_low", "calorie_low", "carbs_low"].includes(f)
    )
  ) {
    ensure(
      "deficit_fill",
      "부족 영양소 보완 추천",
      "오늘 부족한 영양소를 채우되, 이미 높은 영양소는 악화시키지 않도록 구성했습니다."
    )
  }
  if (
    analysis.flags.some((f) =>
      ["fat_high", "sodium_high", "sugar_high", "calorie_high"].includes(f)
    )
  ) {
    ensure(
      "excess_control",
      "주의 영양소 낮춘 추천",
      "지방·나트륨·당류·칼로리가 높은 편이라 가볍고 정리하기 좋은 조합입니다."
    )
  }
  ensure(
    "balanced",
    "운동하는 사람용 균형식",
    "훈련 유지와 회복을 고려한 균형 식사 조합입니다."
  )
  ensure(
    "convenience",
    "오늘의 현실 식사 조합",
    "바쁜 날에도 현실적으로 따라 할 수 있는 조합입니다."
  )

  for (const combo of combos) {
    const templateId = templateIdFromCombo(combo)
    const meta = TEMPLATE_SECTION[templateId] ?? {
      sectionId: "balanced",
      title: "오늘의 현실 식사 조합",
    }
    const section = ensure(
      meta.sectionId,
      sectionMap.get(meta.sectionId)?.title ?? meta.title,
      sectionMap.get(meta.sectionId)?.description ?? combo.situation
    )
    if (!section.combos.some((c) => c.id === combo.id)) {
      section.combos.push(combo)
    }
  }

  const order = [
    "deficit_fill",
    "excess_control",
    "balanced",
    "convenience",
    "recovery",
  ]
  return order
    .map((id) => sectionMap.get(id))
    .filter((s): s is RecommendationSection => Boolean(s?.combos.length))
}

export function filterCombosByFocus(
  combos: RecommendFoodCombo[],
  focus: DietQualityFocus,
  analysis: NutritionDeficitAnalysis
): RecommendFoodCombo[] {
  return getFocusedCombos(combos, focus, analysis, combos.length)
}

export type QualityJudgmentTag = {
  label: string
  tone: "ok" | "warn" | "caution" | "neutral"
  kind: QualityFocusKind | "deficit_fill" | "excess_control" | "balanced"
  actionable: boolean
}

export function buildQualityJudgmentTags(
  analysis: NutritionDeficitAnalysis
): QualityJudgmentTag[] {
  const tags: QualityJudgmentTag[] = []

  if (analysis.flags.includes("calorie_low")) {
    tags.push({
      label: "칼로리 부족",
      tone: "caution",
      kind: "calorie-low",
      actionable: true,
    })
  } else if (analysis.flags.includes("calorie_high")) {
    tags.push({
      label: "칼로리 초과",
      tone: "warn",
      kind: "calorie-high",
      actionable: true,
    })
  } else if (analysis.calorieGap >= -200 && analysis.calorieGap <= 120) {
    tags.push({ label: "칼로리 적정", tone: "ok", kind: "calorie-ok", actionable: false })
  }

  if (analysis.flags.includes("protein_low")) {
    tags.push({
      label: "단백질 부족",
      tone: "warn",
      kind: "protein-low",
      actionable: true,
    })
  } else if (analysis.proteinGap <= 10) {
    tags.push({ label: "단백질 충분", tone: "ok", kind: "protein-ok", actionable: false })
  }

  if (analysis.flags.includes("fiber_low")) {
    tags.push({
      label: "식이섬유 부족",
      tone: "caution",
      kind: "fiber-low",
      actionable: true,
    })
  }

  if (analysis.flags.includes("sugar_high")) {
    tags.push({
      label: "당류 주의",
      tone: "warn",
      kind: "sugar-warn",
      actionable: true,
    })
  }

  if (analysis.flags.includes("fat_high")) {
    tags.push({
      label: "지방 과다",
      tone: "warn",
      kind: "fat-warn",
      actionable: true,
    })
  }

  if (analysis.flags.includes("sodium_high")) {
    tags.push({
      label: "나트륨 주의",
      tone: "warn",
      kind: "sodium-warn",
      actionable: true,
    })
  }

  if (analysis.flags.includes("carbs_low")) {
    tags.push({
      label: "탄수화물 부족",
      tone: "caution",
      kind: "carbs-low",
      actionable: true,
    })
  }

  if (tags.length === 0) {
    tags.push({ label: "영양 균형 양호", tone: "ok", kind: "calorie-ok", actionable: false })
  }

  return tags
}

export function focusFromJudgmentKind(
  kind: QualityFocusKind | null
): DietQualityFocus {
  if (!kind) return "all"
  if (
    kind === "calorie-high" ||
    kind === "sugar-warn" ||
    kind === "fat-warn" ||
    kind === "sodium-warn"
  ) {
    return kind
  }
  if (kind === "calorie-low" || kind === "protein-low" || kind === "fiber-low") {
    return kind
  }
  if (kind === "carbs-low") return "carbs-low"
  return "all"
}

export function firstActionableTag(
  tags: QualityJudgmentTag[]
): QualityFocusKind | null {
  const tag = tags.find((t) => t.actionable)
  if (!tag || tag.kind === "deficit_fill" || tag.kind === "excess_control") {
    return null
  }
  return tag.kind as QualityFocusKind
}

export function focusToApiParam(
  focus: DietQualityFocus
): RecommendFoodsRequest["recommendationFocus"] | undefined {
  if (focus === "all" || focus === "balanced") return undefined
  if (focus === "deficit_fill" || focus === "excess_control") return focus
  return focus as RecommendFoodsRequest["recommendationFocus"]
}

export type FocusFoodItem = {
  item: RecommendFoodCombo["items"][number]
  combo: RecommendFoodCombo
  hint: string
  score: number
}

function itemFocusScore(
  item: RecommendFoodCombo["items"][number],
  focus: DietQualityFocus,
  analysis: NutritionDeficitAnalysis
): number {
  const sugar = item.sugar ?? 0
  let score = 10

  switch (focus) {
    case "protein-low":
      score += item.protein * 4
      if (item.fat <= 8) score += 15
      if (analysis.flags.includes("sugar_high") && sugar <= 5) score += 12
      if (analysis.flags.includes("fat_high") && item.fat <= 10) score += 12
      if (item.protein < 5) score -= 30
      break
    case "fiber-low":
      score += item.fiber * 10
      if (item.fat <= 12) score += 8
      if (analysis.flags.includes("sodium_high") && item.sodium <= 300) score += 10
      if (item.fiber < 2) score -= 20
      break
    case "calorie-low":
      score += Math.min(item.calories, 400) * 0.06
      if (item.protein >= 10 && item.carbs >= 15) score += 15
      break
    case "carbs-low":
      score += item.carbs * 2
      if (item.fat <= 10) score += 8
      break
    case "sugar-warn":
      score += Math.max(0, 15 - sugar) * 5
      if (sugar <= 5) score += 20
      if (sugar > 12) score -= 35
      break
    case "fat-warn":
      score += Math.max(0, 15 - item.fat) * 4
      if (item.protein >= 15 && item.fat <= 10) score += 18
      if (item.fat > 20) score -= 30
      break
    case "sodium-warn":
      score += Math.max(0, 600 - item.sodium) * 0.04
      if (item.sodium <= 250) score += 20
      if (item.sodium > 500) score -= 25
      break
    case "calorie-high":
      score += Math.max(0, 300 - item.calories) * 0.08
      if (item.calories <= 200) score += 15
      break
    default:
      score += item.protein + item.fiber
  }

  return score
}

export function formatFoodItemHint(
  item: RecommendFoodCombo["items"][number],
  focus: DietQualityFocus
): string {
  const parts: string[] = [`${item.amountG}g`, `${item.calories}kcal`]

  switch (focus) {
    case "protein-low":
      parts.push(`단백 ${item.protein}g`, `지방 ${item.fat}g`)
      break
    case "fiber-low":
      parts.push(`식이섬유 ${item.fiber}g`, `당류 ${item.sugar ?? 0}g`)
      break
    case "sugar-warn":
      parts.push(`당류 ${item.sugar ?? 0}g`, `단백 ${item.protein}g`)
      break
    case "sodium-warn":
      parts.push(`나트륨 ${item.sodium}mg`, `지방 ${item.fat}g`)
      break
    case "fat-warn":
      parts.push(`지방 ${item.fat}g`, `단백 ${item.protein}g`)
      break
    case "carbs-low":
      parts.push(`탄수 ${item.carbs}g`, `단백 ${item.protein}g`)
      break
    default:
      parts.push(`P${item.protein}g`, `C${item.carbs}g`, `F${item.fat}g`)
  }

  return parts.join(" · ")
}

export function getFocusedFoodItems(
  combos: RecommendFoodCombo[],
  focus: DietQualityFocus,
  analysis: NutritionDeficitAnalysis,
  limit = 8
): FocusFoodItem[] {
  const seen = new Set<string>()
  const items: FocusFoodItem[] = []

  for (const combo of combos) {
    for (const item of combo.items) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      items.push({
        item,
        combo,
        hint: formatFoodItemHint(item, focus),
        score: itemFocusScore(item, focus, analysis),
      })
    }
  }

  return items
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
