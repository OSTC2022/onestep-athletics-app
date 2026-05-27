export type HomeWidgetId =
  | "training"
  | "pace-calculator"
  | "weight-progress"
  | "quick-actions"
  | "garmin-stats"
  | "attendance-stats"
  | "checklist"
  | "coach-memo"

export type HomeWidgetSize = "compact" | "normal" | "large"
/** Grid width in 4-column layout (1 = quarter, 4 = full row) */
export type HomeWidgetCols = 1 | 2 | 3 | 4

/** @deprecated migrated to cols */
export type HomeWidgetSpan = "full" | "half"

export interface HomeWidgetItem {
  id: HomeWidgetId
  visible: boolean
  cols: HomeWidgetCols
  size: HomeWidgetSize
  order: number
}

export interface HomeLayout {
  widgets: HomeWidgetItem[]
}

export const HOME_LAYOUT_COLUMNS = 4

export const HOME_LAYOUT_EVENT = "home-layout-updated"

const STORAGE_KEY = "one-step-coach-home-layout"

export const HOME_WIDGET_IDS: HomeWidgetId[] = [
  "training",
  "weight-progress",
  "pace-calculator",
  "quick-actions",
  "garmin-stats",
  "attendance-stats",
  "checklist",
  "coach-memo",
]

export const HOME_WIDGET_META: Record<
  HomeWidgetId,
  { label: string; description: string; defaultCols: HomeWidgetCols }
> = {
  training: {
    label: "오늘 훈련",
    description: "훈련 프로그램·집합 장소",
    defaultCols: 4,
  },
  "pace-calculator": {
    label: "페이스 계산기",
    description: "목표 페이스 계산",
    defaultCols: 4,
  },
  "weight-progress": {
    label: "체중 변화",
    description: "감량·증량 진행 요약",
    defaultCols: 4,
  },
  "quick-actions": {
    label: "빠른 실행",
    description: "출석 체크·기록 입력",
    defaultCols: 4,
  },
  "garmin-stats": {
    label: "주간 거리",
    description: "Garmin 누적 km",
    defaultCols: 2,
  },
  "attendance-stats": {
    label: "출석률",
    description: "월간 출석 통계",
    defaultCols: 2,
  },
  checklist: {
    label: "체크리스트",
    description: "오늘 할 일",
    defaultCols: 4,
  },
  "coach-memo": {
    label: "코치 메모",
    description: "코치 안내 메모",
    defaultCols: 4,
  },
}

export const DEFAULT_HOME_LAYOUT: HomeLayout = {
  widgets: HOME_WIDGET_IDS.map((id, index) => ({
    id,
    visible: true,
    cols: HOME_WIDGET_META[id].defaultCols,
    size: "normal" as HomeWidgetSize,
    order: index,
  })),
}

export const COL_SPAN_CLASS: Record<HomeWidgetCols, string> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
}

function parseCols(raw: unknown, id: HomeWidgetId): HomeWidgetCols {
  if (raw === 1 || raw === 2 || raw === 3 || raw === 4) return raw
  const legacy = raw as { span?: HomeWidgetSpan; cols?: unknown }
  if (legacy?.span === "half") return 2
  if (legacy?.span === "full") return 4
  return HOME_WIDGET_META[id].defaultCols
}

function normalizeWidget(raw: unknown, index: number): HomeWidgetItem | null {
  if (!raw || typeof raw !== "object" || !("id" in raw)) return null
  const item = raw as Partial<HomeWidgetItem> & { span?: HomeWidgetSpan }
  if (!HOME_WIDGET_IDS.includes(item.id as HomeWidgetId)) return null
  const id = item.id as HomeWidgetId
  return {
    id,
    visible: item.visible !== false,
    cols: parseCols("cols" in item ? item.cols : item, id),
    size:
      item.size === "compact" || item.size === "large"
        ? item.size
        : "normal",
    order: typeof item.order === "number" ? item.order : index,
  }
}

function swapWeightProgressAbovePaceCalculator(
  layout: HomeLayout
): HomeLayout {
  const pace = layout.widgets.find((w) => w.id === "pace-calculator")
  const weight = layout.widgets.find((w) => w.id === "weight-progress")
  if (!pace || !weight || pace.order >= weight.order) return layout

  return {
    widgets: layout.widgets.map((w) => {
      if (w.id === "pace-calculator") return { ...w, order: weight.order }
      if (w.id === "weight-progress") return { ...w, order: pace.order }
      return w
    }),
  }
}

function mergeWithDefaults(parsed: HomeLayout): HomeLayout {
  const byId = new Map<HomeWidgetId, HomeWidgetItem>()
  for (const w of parsed.widgets) {
    byId.set(w.id, w)
  }
  const merged: HomeLayout = {
    widgets: HOME_WIDGET_IDS.map((id, index) => {
      const existing = byId.get(id)
      if (existing) return { ...existing, id }
      return DEFAULT_HOME_LAYOUT.widgets[index]
    }).sort((a, b) => a.order - b.order),
  }
  return swapWeightProgressAbovePaceCalculator(merged)
}

export function loadHomeLayout(): HomeLayout {
  if (typeof window === "undefined") return structuredClone(DEFAULT_HOME_LAYOUT)
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(DEFAULT_HOME_LAYOUT)
    const parsed = JSON.parse(raw) as { widgets?: unknown[] }
    if (!Array.isArray(parsed.widgets)) return structuredClone(DEFAULT_HOME_LAYOUT)
    const widgets = parsed.widgets
      .map((w, i) => normalizeWidget(w, i))
      .filter((w): w is HomeWidgetItem => w !== null)
    if (widgets.length === 0) return structuredClone(DEFAULT_HOME_LAYOUT)
    return mergeWithDefaults({ widgets })
  } catch {
    return structuredClone(DEFAULT_HOME_LAYOUT)
  }
}

export function saveHomeLayout(layout: HomeLayout): HomeLayout {
  const normalized = mergeWithDefaults(layout)
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
    window.dispatchEvent(new CustomEvent(HOME_LAYOUT_EVENT))
  }
  return normalized
}

export function resetHomeLayout(): HomeLayout {
  return saveHomeLayout(structuredClone(DEFAULT_HOME_LAYOUT))
}

export function getSortedVisibleWidgets(layout: HomeLayout): HomeWidgetItem[] {
  return [...layout.widgets]
    .filter((w) => w.visible)
    .sort((a, b) => a.order - b.order)
}

export function updateHomeWidget(
  layout: HomeLayout,
  id: HomeWidgetId,
  patch: Partial<Omit<HomeWidgetItem, "id">>
): HomeLayout {
  return {
    widgets: layout.widgets.map((w) => (w.id === id ? { ...w, ...patch } : w)),
  }
}

export function moveHomeWidget(
  layout: HomeLayout,
  id: HomeWidgetId,
  direction: "up" | "down"
): HomeLayout {
  const sorted = [...layout.widgets].sort((a, b) => a.order - b.order)
  const index = sorted.findIndex((w) => w.id === id)
  if (index < 0) return layout
  const swapIndex = direction === "up" ? index - 1 : index + 1
  if (swapIndex < 0 || swapIndex >= sorted.length) return layout

  const next = sorted.map((w) => ({ ...w }))
  const aOrder = next[index].order
  next[index].order = next[swapIndex].order
  next[swapIndex].order = aOrder
  ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]

  return { widgets: next }
}

export const SIZE_STEPS: HomeWidgetSize[] = ["compact", "normal", "large"]

export function sizeToStep(size: HomeWidgetSize): number {
  const i = SIZE_STEPS.indexOf(size)
  return i >= 0 ? i : 1
}

export function stepToSize(step: number): HomeWidgetSize {
  return SIZE_STEPS[Math.max(0, Math.min(SIZE_STEPS.length - 1, step))]
}

export const COLS_STEPS: HomeWidgetCols[] = [1, 2, 3, 4]

export function colsToStep(cols: HomeWidgetCols): number {
  return cols - 1
}

export function stepToCols(step: number): HomeWidgetCols {
  const clamped = Math.max(0, Math.min(COLS_STEPS.length - 1, step))
  return COLS_STEPS[clamped]
}

export function applyWidgetOrder(
  layout: HomeLayout,
  orderedIds: HomeWidgetId[]
): HomeLayout {
  const map = new Map(layout.widgets.map((w) => [w.id, w]))
  const ids =
    orderedIds.length === HOME_WIDGET_IDS.length &&
    orderedIds.every((id) => map.has(id))
      ? orderedIds
      : [...layout.widgets]
          .sort((a, b) => a.order - b.order)
          .map((w) => w.id)

  return {
    widgets: ids.map((id, order) => ({
      ...map.get(id)!,
      order,
    })),
  }
}

export function sizeLabel(size: HomeWidgetSize): string {
  switch (size) {
    case "compact":
      return "S"
    case "large":
      return "L"
    default:
      return "M"
  }
}

export function colsLabel(cols: HomeWidgetCols): string {
  switch (cols) {
    case 1:
      return "¼"
    case 2:
      return "½"
    case 3:
      return "¾"
    default:
      return "전체"
  }
}

/** @deprecated use colsLabel */
export function spanLabel(span: HomeWidgetSpan): string {
  return span === "half" ? "½" : "전체"
}

export function sizePaddingClass(size: HomeWidgetSize): string {
  switch (size) {
    case "compact":
      return "p-3"
    case "large":
      return "p-[22px]"
    default:
      return "p-[18px]"
  }
}

export function sizeTitleClass(size: HomeWidgetSize): string {
  switch (size) {
    case "compact":
      return "text-[18px]"
    case "large":
      return "text-[26px]"
    default:
      return "text-[22px]"
  }
}

export function sizeStatClass(size: HomeWidgetSize): string {
  switch (size) {
    case "compact":
      return "text-[20px]"
    case "large":
      return "text-[30px]"
    default:
      return "text-[26px]"
  }
}
