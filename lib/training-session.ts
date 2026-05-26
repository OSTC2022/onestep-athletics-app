import { getTodayScheduleDay, type TrainingLocation } from "@/lib/weekly-schedule"
import { getCurrentUser } from "@/lib/auth"
import { canManageTraining } from "@/lib/permissions"

export const TRAINING_SESSION_EVENT = "training-session-updated"

const STORAGE_KEY = "one-step-coach-training-sessions"

export type TrainingType =
  | "interval"
  | "tempo"
  | "easy"
  | "long"
  | "recovery"
  | "rest"
  | "other"

export type TrainingIntensity = "low" | "moderate" | "high" | "very_high"

export type TrainingSessionStatus = "planned" | "completed"

/** Supabase-ready row shape (snake_case) */
export interface TrainingSessionRecord {
  id: string
  title: string
  training_type: TrainingType
  description: string
  session_date: string
  location_name: string | null
  location_address: string | null
  location_map_query: string | null
  location_lat: number | null
  location_lng: number | null
  total_distance: string
  warmup: string
  main_set: string
  cooldown: string
  target_pace: string
  rest_time: string
  intensity: TrainingIntensity
  estimated_duration: string
  coach_memo: string
  athlete_notes: string
  status: TrainingSessionStatus
  created_at: string
  updated_at: string
}

/** App model (camelCase) */
export interface TrainingSession {
  id: string
  title: string
  type: TrainingType
  description: string
  date: string
  location: TrainingLocation | null
  totalDistance: string
  warmup: string
  mainSet: string
  cooldown: string
  targetPace: string
  restTime: string
  intensity: TrainingIntensity
  estimatedDuration: string
  coachMemo: string
  athleteNotes: string
  status: TrainingSessionStatus
  createdAt: string
  updatedAt: string
}

export interface TrainingPhaseDisplay {
  label: string
  text: string
  active?: boolean
}

export const TRAINING_TYPE_OPTIONS: {
  value: TrainingType
  label: string
  badge: string
}[] = [
  { value: "interval", label: "인터벌", badge: "INTERVAL" },
  { value: "tempo", label: "템포런", badge: "TEMPO" },
  { value: "easy", label: "이지런", badge: "EASY" },
  { value: "long", label: "장거리", badge: "LONG" },
  { value: "recovery", label: "회복런", badge: "RECOVERY" },
  { value: "rest", label: "휴식", badge: "REST" },
  { value: "other", label: "기타", badge: "OTHER" },
]

export const TRAINING_INTENSITY_OPTIONS: {
  value: TrainingIntensity
  label: string
}[] = [
  { value: "low", label: "낮음" },
  { value: "moderate", label: "보통" },
  { value: "high", label: "높음" },
  { value: "very_high", label: "매우 높음" },
]

export function getTrainingTypeMeta(type: TrainingType) {
  return (
    TRAINING_TYPE_OPTIONS.find((o) => o.value === type) ??
    TRAINING_TYPE_OPTIONS[TRAINING_TYPE_OPTIONS.length - 1]
  )
}

export function getIntensityLabel(intensity: TrainingIntensity): string {
  return (
    TRAINING_INTENSITY_OPTIONS.find((o) => o.value === intensity)?.label ??
    intensity
  )
}

export function getTodayDateKey(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function nowIso(): string {
  return new Date().toISOString()
}

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `training-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function locationToRecord(location: TrainingLocation | null) {
  if (!location) {
    return {
      location_name: null,
      location_address: null,
      location_map_query: null,
      location_lat: null,
      location_lng: null,
    }
  }
  return {
    location_name: location.name,
    location_address: location.address ?? null,
    location_map_query: location.mapQuery ?? null,
    location_lat:
      typeof location.lat === "number" && Number.isFinite(location.lat)
        ? location.lat
        : null,
    location_lng:
      typeof location.lng === "number" && Number.isFinite(location.lng)
        ? location.lng
        : null,
  }
}

function locationFromRecord(record: TrainingSessionRecord): TrainingLocation | null {
  if (!record.location_name) return null
  return {
    name: record.location_name,
    address: record.location_address ?? undefined,
    mapQuery: record.location_map_query ?? undefined,
    lat: record.location_lat ?? undefined,
    lng: record.location_lng ?? undefined,
  }
}

export function toTrainingSessionRecord(
  session: TrainingSession
): TrainingSessionRecord {
  return {
    id: session.id,
    title: session.title,
    training_type: session.type,
    description: session.description,
    session_date: session.date,
    ...locationToRecord(session.location),
    total_distance: session.totalDistance,
    warmup: session.warmup,
    main_set: session.mainSet,
    cooldown: session.cooldown,
    target_pace: session.targetPace,
    rest_time: session.restTime,
    intensity: session.intensity,
    estimated_duration: session.estimatedDuration,
    coach_memo: session.coachMemo,
    athlete_notes: session.athleteNotes,
    status: session.status,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  }
}

export function fromTrainingSessionRecord(
  record: TrainingSessionRecord
): TrainingSession {
  return {
    id: record.id,
    title: record.title,
    type: record.training_type,
    description: record.description,
    date: record.session_date,
    location: locationFromRecord(record),
    totalDistance: record.total_distance,
    warmup: record.warmup,
    mainSet: record.main_set,
    cooldown: record.cooldown,
    targetPace: record.target_pace,
    restTime: record.rest_time,
    intensity: record.intensity,
    estimatedDuration: record.estimated_duration,
    coachMemo: record.coach_memo,
    athleteNotes: record.athlete_notes,
    status: record.status,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }
}

function assertCanManageTraining(): void {
  if (!canManageTraining(getCurrentUser())) {
    throw new Error("훈련 스케줄은 관리자만 수정할 수 있습니다.")
  }
}

function createDefaultTodaySession(dateKey: string): TrainingSession {
  const schedule = getTodayScheduleDay()
  const timestamp = nowIso()

  return {
    id: generateId(),
    title: "인터벌 훈련",
    type: "interval",
    description: "400m x 8 (rest 90초)",
    date: dateKey,
    location: schedule?.location ?? null,
    totalDistance: schedule?.distance && schedule.distance !== "-" ? schedule.distance : "5.2km",
    warmup: "조깅 2km + 동적 스트레칭",
    mainSet: "400m 인터벌 8회",
    cooldown: "조깅 1km + 정적 스트레칭",
    targetPace: "75초/400m",
    restTime: "90초",
    intensity: "high",
    estimatedDuration: "50분",
    coachMemo:
      "오늘은 인터벌 훈련 날입니다. 페이스보다 폼 유지에 집중하세요. 무릎에 통증이 있는 선수는 강도를 낮추어 진행하세요.",
    athleteNotes: "",
    status: "planned",
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function notifyChange(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(TRAINING_SESSION_EVENT))
}

function readAllRaw(): TrainingSession[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as TrainingSessionRecord[]
    if (!Array.isArray(parsed)) return []
    return parsed.map(fromTrainingSessionRecord)
  } catch {
    return []
  }
}

function writeAll(sessions: TrainingSession[]): TrainingSession[] {
  const records = sessions.map(toTrainingSessionRecord)
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
    notifyChange()
  }
  return sessions
}

export function loadAllTrainingSessions(): TrainingSession[] {
  const sessions = readAllRaw()
  if (sessions.length > 0) return sessions

  const today = getTodayDateKey()
  const seeded = createDefaultTodaySession(today)
  return writeAll([seeded])
}

export function getTrainingSessionById(id: string): TrainingSession | null {
  return loadAllTrainingSessions().find((s) => s.id === id) ?? null
}

export function getTrainingSessionByDate(date: string): TrainingSession | null {
  return loadAllTrainingSessions().find((s) => s.date === date) ?? null
}

export function getTodayTrainingSession(): TrainingSession | null {
  return getTrainingSessionByDate(getTodayDateKey())
}

export function ensureTodayTrainingSession(): TrainingSession {
  const today = getTodayDateKey()
  const existing = getTrainingSessionByDate(today)
  if (existing) return existing

  const created = createDefaultTodaySession(today)
  const all = readAllRaw()
  writeAll([...all, created])
  return created
}

export function createTrainingSession(
  date: string,
  partial?: Partial<Omit<TrainingSession, "id" | "date" | "createdAt" | "updatedAt">>
): TrainingSession {
  assertCanManageTraining()
  const timestamp = nowIso()
  const base = createDefaultTodaySession(date)
  const session: TrainingSession = {
    ...base,
    ...partial,
    id: generateId(),
    date,
    status: partial?.status ?? "planned",
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  const all = loadAllTrainingSessions()
  writeAll([...all, session])
  return session
}

export function saveTrainingSession(
  session: TrainingSession
): TrainingSession {
  assertCanManageTraining()
  const updated: TrainingSession = {
    ...session,
    updatedAt: nowIso(),
  }
  const all = loadAllTrainingSessions()
  const index = all.findIndex((s) => s.id === updated.id)
  const next =
    index >= 0
      ? all.map((s) => (s.id === updated.id ? updated : s))
      : [...all, updated]
  writeAll(next)
  return updated
}

export function deleteTrainingSession(id: string): void {
  assertCanManageTraining()
  const all = loadAllTrainingSessions().filter((s) => s.id !== id)
  writeAll(all)
}

export function copyTrainingSession(
  id: string,
  targetDate: string
): TrainingSession | null {
  assertCanManageTraining()
  const source = getTrainingSessionById(id)
  if (!source) return null

  const existingOnDate = getTrainingSessionByDate(targetDate)
  if (existingOnDate) {
    deleteTrainingSession(existingOnDate.id)
  }

  const timestamp = nowIso()
  const copy: TrainingSession = {
    ...source,
    id: generateId(),
    date: targetDate,
    status: "planned",
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  const all = loadAllTrainingSessions().filter((s) => s.id !== copy.id)
  writeAll([...all, copy])
  return copy
}

export function setTrainingSessionCompleted(
  id: string,
  completed: boolean
): TrainingSession | null {
  assertCanManageTraining()
  const session = getTrainingSessionById(id)
  if (!session) return null
  return saveTrainingSession({
    ...session,
    status: completed ? "completed" : "planned",
  })
}

export function getTrainingPhases(
  session: TrainingSession
): TrainingPhaseDisplay[] {
  return [
    { label: "웜업", text: session.warmup },
    { label: "메인", text: session.mainSet, active: true },
    { label: "쿨다운", text: session.cooldown },
  ].filter((phase) => phase.text.trim().length > 0)
}

export function createEmptyTrainingSession(date?: string): TrainingSession {
  const dateKey = date ?? getTodayDateKey()
  return createTrainingSession(dateKey, {
    title: "새 훈련",
    type: "easy",
    description: "",
    location: null,
    totalDistance: "",
    warmup: "",
    mainSet: "",
    cooldown: "",
    targetPace: "",
    restTime: "",
    intensity: "moderate",
    estimatedDuration: "",
    coachMemo: "",
    athleteNotes: "",
    status: "planned",
  })
}

/** Default snapshot for SSR / pre-hydration */
export function getDefaultTrainingSessionSnapshot(): TrainingSession {
  return createDefaultTodaySession(getTodayDateKey())
}
