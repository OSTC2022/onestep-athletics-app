import type {
  TrainingIntensity,
  TrainingSession,
  TrainingType,
} from "@/lib/training-session"
import type { TrainingLocation } from "@/lib/weekly-schedule"

/** Supabase `training_templates` 테이블 연동 예정 */
export interface TrainingTemplateRecord {
  id: string
  label: string
  title: string
  training_type: TrainingType
  description: string
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
  created_at: string
  updated_at: string
}

export interface TrainingTemplateContent {
  title: string
  type: TrainingType
  description: string
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
}

export interface TrainingTemplate {
  id: string
  label: string
  content: TrainingTemplateContent
  createdAt: string
  updatedAt: string
}

export const TRAINING_TEMPLATES_EVENT = "training-templates-updated"

const STORAGE_KEY = "one-step-coach-training-templates"

function nowIso(): string {
  return new Date().toISOString()
}

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function notifyChange(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(TRAINING_TEMPLATES_EVENT))
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

function locationFromRecord(record: TrainingTemplateRecord): TrainingLocation | null {
  if (!record.location_name) return null
  return {
    name: record.location_name,
    address: record.location_address ?? undefined,
    mapQuery: record.location_map_query ?? undefined,
    lat: record.location_lat ?? undefined,
    lng: record.location_lng ?? undefined,
  }
}

export function extractTemplateContent(
  session: TrainingSession
): TrainingTemplateContent {
  return {
    title: session.title,
    type: session.type,
    description: session.description,
    location: session.location,
    totalDistance: session.totalDistance,
    warmup: session.warmup,
    mainSet: session.mainSet,
    cooldown: session.cooldown,
    targetPace: session.targetPace,
    restTime: session.restTime,
    intensity: session.intensity,
    estimatedDuration: session.estimatedDuration,
    coachMemo: session.coachMemo,
    athleteNotes: session.athleteNotes,
  }
}

export function applyTemplateToSession(
  session: TrainingSession,
  template: TrainingTemplate
): TrainingSession {
  return {
    ...session,
    ...template.content,
  }
}

export function toTrainingTemplateRecord(
  template: TrainingTemplate
): TrainingTemplateRecord {
  const { content } = template
  return {
    id: template.id,
    label: template.label,
    title: content.title,
    training_type: content.type,
    description: content.description,
    ...locationToRecord(content.location),
    total_distance: content.totalDistance,
    warmup: content.warmup,
    main_set: content.mainSet,
    cooldown: content.cooldown,
    target_pace: content.targetPace,
    rest_time: content.restTime,
    intensity: content.intensity,
    estimated_duration: content.estimatedDuration,
    coach_memo: content.coachMemo,
    athlete_notes: content.athleteNotes,
    created_at: template.createdAt,
    updated_at: template.updatedAt,
  }
}

export function fromTrainingTemplateRecord(
  record: TrainingTemplateRecord
): TrainingTemplate {
  return {
    id: record.id,
    label: record.label,
    content: {
      title: record.title,
      type: record.training_type,
      description: record.description,
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
    },
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }
}

function normalizeTemplate(raw: unknown): TrainingTemplate | null {
  if (!raw || typeof raw !== "object") return null
  const item = raw as Partial<TrainingTemplateRecord & TrainingTemplate>

  if (item.label && item.content) {
    const label = item.label.trim()
    if (!label) return null
    return {
      id: item.id ?? generateId(),
      label,
      content: item.content,
      createdAt: item.createdAt ?? item.created_at ?? nowIso(),
      updatedAt: item.updatedAt ?? item.updated_at ?? nowIso(),
    }
  }

  const label = (item.label ?? "").trim()
  if (!label) return null

  const createdAt = item.created_at ?? item.createdAt ?? nowIso()
  const updatedAt = item.updated_at ?? item.updatedAt ?? createdAt

  return {
    id: item.id ?? generateId(),
    label,
    content: {
      title: item.title ?? label,
      type: (item.training_type ?? item.type ?? "other") as TrainingType,
      description: item.description ?? "",
      location: locationFromRecord(item as TrainingTemplateRecord),
      totalDistance: item.total_distance ?? item.totalDistance ?? "",
      warmup: item.warmup ?? "",
      mainSet: item.main_set ?? item.mainSet ?? "",
      cooldown: item.cooldown ?? "",
      targetPace: item.target_pace ?? item.targetPace ?? "",
      restTime: item.rest_time ?? item.restTime ?? "",
      intensity: (item.intensity ?? "moderate") as TrainingIntensity,
      estimatedDuration: item.estimated_duration ?? item.estimatedDuration ?? "",
      coachMemo: item.coach_memo ?? item.coachMemo ?? "",
      athleteNotes: item.athlete_notes ?? item.athleteNotes ?? "",
    },
    createdAt,
    updatedAt,
  }
}

function readAll(): TrainingTemplate[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(normalizeTemplate)
      .filter((t): t is TrainingTemplate => t !== null)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  } catch {
    return []
  }
}

function writeAll(templates: TrainingTemplate[]): TrainingTemplate[] {
  const records = templates.map(toTrainingTemplateRecord)
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
    notifyChange()
  }
  return templates
}

export function loadTrainingTemplates(): TrainingTemplate[] {
  return readAll()
}

function templateLabelKey(label: string): string {
  return label.trim().toLowerCase()
}

export function saveTrainingTemplate(
  label: string,
  session: TrainingSession
): TrainingTemplate {
  const trimmedLabel = label.trim()
  if (!trimmedLabel) {
    throw new Error("템플릿 이름을 입력해 주세요.")
  }

  const key = templateLabelKey(trimmedLabel)
  const content = extractTemplateContent(session)
  const all = readAll()
  const existing = all.find((t) => templateLabelKey(t.label) === key)

  if (existing) {
    const updated: TrainingTemplate = {
      ...existing,
      label: trimmedLabel,
      content,
      updatedAt: nowIso(),
    }
    writeAll(all.map((t) => (t.id === existing.id ? updated : t)))
    return updated
  }

  const created: TrainingTemplate = {
    id: generateId(),
    label: trimmedLabel,
    content,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  writeAll([created, ...all])
  return created
}

export function deleteTrainingTemplate(id: string): void {
  writeAll(readAll().filter((t) => t.id !== id))
}

export function getTemplateSummary(template: TrainingTemplate): string {
  const parts: string[] = []
  const { content } = template
  if (content.description.trim()) parts.push(content.description.trim())
  else if (content.mainSet.trim()) parts.push(content.mainSet.trim())
  if (content.location?.name?.trim()) parts.push(content.location.name.trim())
  return parts.join(" · ").slice(0, 80)
}
