export interface ChecklistItem {
  id: number
  label: string
  completed: boolean
}

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: 1, label: "출석 체크", completed: false },
  { id: 2, label: "컨디션 입력", completed: false },
  { id: 3, label: "통증 체크", completed: false },
  { id: 4, label: "운동 기록", completed: false },
]

export const DAILY_CHECKLIST_EVENT = "daily-checklist-updated"

const STORAGE_KEY = "one-step-coach-daily-checklist"

interface StoredChecklist {
  date: string
  completedIds: number[]
}

function getTodayDateKey(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function readStored(): StoredChecklist | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredChecklist
  } catch {
    return null
  }
}

function writeStored(data: StoredChecklist): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function notifyChecklistChange(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(DAILY_CHECKLIST_EVENT))
}

function persistItems(items: ChecklistItem[]): ChecklistItem[] {
  writeStored({
    date: getTodayDateKey(),
    completedIds: items.filter((item) => item.completed).map((item) => item.id),
  })
  notifyChecklistChange()
  return items
}

export function loadTodayChecklistItems(): ChecklistItem[] {
  const stored = readStored()
  if (!stored || stored.date !== getTodayDateKey()) {
    return DEFAULT_CHECKLIST.map((item) => ({ ...item, completed: false }))
  }

  const completedSet = new Set(stored.completedIds)
  return DEFAULT_CHECKLIST.map((item) => ({
    ...item,
    completed: completedSet.has(item.id),
  }))
}

export function setChecklistItemCompleted(
  id: number,
  completed: boolean
): ChecklistItem[] {
  const items = loadTodayChecklistItems().map((item) =>
    item.id === id ? { ...item, completed } : item
  )
  return persistItems(items)
}

export function toggleChecklistItemById(id: number): ChecklistItem[] {
  const items = loadTodayChecklistItems().map((item) =>
    item.id === id ? { ...item, completed: !item.completed } : item
  )
  return persistItems(items)
}

export function isChecklistItemCompleted(id: number): boolean {
  return loadTodayChecklistItems().some((item) => item.id === id && item.completed)
}
