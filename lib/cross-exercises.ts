import type { SessionFieldDef } from "@/lib/workout-categories"

export interface CrossExerciseEntry {
  id: string
  activityType: string
  exerciseName: string
  bodyArea: string
  sets: string
  reps: string
  load: string
  rpe: string
  restTime: string
}

export type CrossExerciseFieldKey = Exclude<keyof CrossExerciseEntry, "id">

export const crossExerciseFieldDefs: SessionFieldDef[] = [
  {
    id: "activityType",
    label: "운동 유형",
    type: "select",
    colSpan: 2,
    options: [
      { value: "weight", label: "웨이트" },
      { value: "strength", label: "보강운동" },
      { value: "core", label: "코어·플랭크" },
      { value: "mobility", label: "유연성·스트레칭" },
      { value: "rehab", label: "재활·밴드" },
      { value: "plyo", label: "플라이오·점프" },
      { value: "other", label: "기타" },
    ],
  },
  {
    id: "exerciseName",
    label: "운동 종목",
    placeholder: "운동 종목을 입력하세요 (스쿼트, 런지, 힙 브릿지 등)",
    colSpan: 2,
  },
  {
    id: "bodyArea",
    label: "타깃 부위",
    type: "select",
    options: [
      { value: "lower", label: "하체" },
      { value: "upper", label: "상체" },
      { value: "core", label: "코어" },
      { value: "full", label: "전신" },
    ],
  },
  {
    id: "sets",
    label: "세트",
    placeholder: "3",
    unit: "set",
  },
  {
    id: "reps",
    label: "횟수",
    placeholder: "12 (회 또는 초)",
    unit: "회",
  },
  {
    id: "load",
    label: "중량·강도",
    placeholder: "60 (kg, 밴드, %1RM)",
    unit: "kg",
  },
  {
    id: "rpe",
    label: "RPE",
    placeholder: "7 (1~10)",
  },
  {
    id: "restTime",
    label: "세트 간 휴식",
    type: "duration",
    placeholder: "1:00 (mm:ss)",
    colSpan: 2,
  },
]

export function createCrossExerciseEntry(): CrossExerciseEntry {
  return {
    id: `ex-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    activityType: "",
    exerciseName: "",
    bodyArea: "",
    sets: "",
    reps: "",
    load: "",
    rpe: "",
    restTime: "",
  }
}

export function getActivityTypeLabel(value: string): string {
  const field = crossExerciseFieldDefs.find((f) => f.id === "activityType")
  return field?.options?.find((o) => o.value === value)?.label ?? value
}

export function getBodyAreaLabel(value: string): string {
  const field = crossExerciseFieldDefs.find((f) => f.id === "bodyArea")
  return field?.options?.find((o) => o.value === value)?.label ?? value
}

/** Second line for compact cards (type + metrics, without repeating title). */
export function formatCrossExerciseDetail(entry: CrossExerciseEntry): string {
  const parts: string[] = []

  if (entry.activityType && entry.exerciseName) {
    parts.push(getActivityTypeLabel(entry.activityType))
  }

  if (entry.sets && entry.reps) {
    parts.push(`${entry.sets}×${entry.reps}`)
  } else if (entry.sets) {
    parts.push(`${entry.sets}set`)
  } else if (entry.reps) {
    parts.push(`${entry.reps}회`)
  }
  if (entry.load) parts.push(`${entry.load}kg`)
  if (entry.rpe) parts.push(`RPE ${entry.rpe}`)
  if (entry.restTime) parts.push(`휴식 ${entry.restTime}`)

  return parts.length > 0 ? parts.join(" · ") : "내용 미입력"
}

export function hasCrossExerciseContent(entry: CrossExerciseEntry): boolean {
  return Boolean(
    entry.activityType ||
      entry.exerciseName ||
      entry.bodyArea ||
      entry.sets ||
      entry.reps ||
      entry.load ||
      entry.rpe ||
      entry.restTime
  )
}
