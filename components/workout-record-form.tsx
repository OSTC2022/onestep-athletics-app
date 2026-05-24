"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  buildPaceMetricsFromDistanceAndTime,
  buildPaceMetricsFromSegment,
  estimateIntervalSessionPaceMetrics,
  type PaceMetrics,
  parseDistanceKm,
  parsePaceToSeconds,
  parseTimeToMinutes,
  resolveDistanceMeters,
} from "@/lib/pace"
import {
  getWorkoutCategory,
  type SessionFieldDef,
  type SessionFieldGroup,
  type WorkoutCategoryId,
  workoutCategories,
} from "@/lib/workout-categories"
import { cn } from "@/lib/utils"
import { CrossExerciseList } from "@/components/cross-exercise-list"
import {
  createCrossExerciseEntry,
  type CrossExerciseEntry,
} from "@/lib/cross-exercises"

type SessionFields = Record<string, string>

const initialCommon = {
  distance: "",
  time: "",
  note: "",
}

function PaceMetricsDisplay({
  metrics,
  size = "sm",
}: {
  metrics: PaceMetrics | null
  size?: "sm" | "md"
}) {
  if (!metrics) return null

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono tabular-nums",
        size === "md" ? "text-sm" : "text-[11px]"
      )}
    >
      <span className="text-accent font-semibold">{metrics.pacePerKm} /km</span>
      <span className="text-muted-foreground/60">·</span>
      <span className="text-foreground/85">{metrics.speedKmh} km/h</span>
    </div>
  )
}

function SelectOrCustomField({
  field,
  sessionFields,
  onUpdate,
  stacked = false,
}: {
  field: SessionFieldDef
  sessionFields: SessionFields
  onUpdate: (fieldId: string, value: string) => void
  stacked?: boolean
}) {
  const modeKey = `${field.id}Mode`
  const customKey = `${field.id}Custom`
  const unitKey = `${field.id}CustomUnit`

  const mode = sessionFields[modeKey] === "custom" ? "custom" : "preset"
  const presetValue = sessionFields[field.id] ?? ""
  const customValue = sessionFields[customKey] ?? ""
  const customUnit = sessionFields[unitKey] || field.customUnit || "m"

  const selectClassName =
    "h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

  const setModeAndClear = (next: "preset" | "custom") => {
    onUpdate(modeKey, next)
    if (next === "preset") {
      onUpdate(customKey, "")
    } else {
      onUpdate(field.id, "")
    }
  }

  return (
    <div className={cn("min-w-0 space-y-2", !stacked && "col-span-2")}>
      <Label className="text-xs">{field.label}</Label>
      <div className="flex rounded-lg border border-border/60 overflow-hidden p-0.5 bg-secondary/30 min-w-0">
        <button
          type="button"
          onClick={() => setModeAndClear("preset")}
          className={cn(
            "flex-1 min-w-0 py-2 px-1 text-xs font-medium rounded-md transition-colors",
            mode === "preset"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          프리셋
        </button>
        <button
          type="button"
          onClick={() => setModeAndClear("custom")}
          className={cn(
            "flex-1 min-w-0 py-2 px-1 text-xs font-medium rounded-md transition-colors",
            mode === "custom"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          직접 입력
        </button>
      </div>

      {mode === "preset" ? (
        <select
          id={`session-${field.id}`}
          value={presetValue}
          onChange={(e) => onUpdate(field.id, e.target.value)}
          className={selectClassName}
        >
          <option value="">거리 선택</option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <div className="flex w-full min-w-0 max-w-full gap-2">
          <Input
            id={`session-${customKey}`}
            inputMode="decimal"
            placeholder={field.customPlaceholder ?? "거리 입력"}
            value={customValue}
            onChange={(e) => onUpdate(customKey, e.target.value)}
            className="h-10 min-w-0 flex-1 basis-0"
          />
          <select
            value={customUnit}
            onChange={(e) => onUpdate(unitKey, e.target.value)}
            className="h-10 w-16 shrink-0 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="거리 단위"
          >
            <option value="m">m</option>
            <option value="km">km</option>
          </select>
        </div>
      )}

      {field.hint && (
        <p className="text-[10px] text-muted-foreground">{field.hint}</p>
      )}
      {(presetValue || customValue) && (
        <p className="text-[10px] text-accent font-medium">
          {mode === "preset"
            ? field.options?.find((o) => o.value === presetValue)?.label ??
              `${presetValue}m`
            : `직접 입력: ${customValue}${customUnit}`}
        </p>
      )}
    </div>
  )
}

function formatSegmentDistanceLabel(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000
    return km % 1 === 0 ? `/${km}km` : `/${km.toFixed(1)}km`
  }
  return `/${meters}m`
}

function DurationField({
  field,
  value,
  onChange,
  sessionFields,
  stacked = false,
}: {
  field: SessionFieldDef
  value: string
  onChange: (value: string) => void
  sessionFields: SessionFields
  stacked?: boolean
}) {
  const id = `session-${field.id}`
  const distanceM = field.linkedDistanceField
    ? resolveDistanceMeters(field.linkedDistanceField, sessionFields)
    : null

  const paceMetrics = useMemo(() => {
    const sec = parsePaceToSeconds(value)
    if (!sec || !distanceM || distanceM <= 0) return null
    return buildPaceMetricsFromSegment(sec, distanceM)
  }, [value, distanceM])

  return (
    <div className={cn("min-w-0 space-y-1.5", !stacked && field.colSpan === 2 && "col-span-2")}>
      <Label htmlFor={id} className="text-xs">
        {field.label}
        <span className="text-muted-foreground font-normal ml-1 font-mono">
          mm:ss
        </span>
      </Label>
      <Input
        id={id}
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 font-mono"
      />
      {field.hint && (
        <p className="text-[10px] text-muted-foreground">{field.hint}</p>
      )}
      {paceMetrics && (
        <div className="rounded-md bg-accent/5 border border-accent/15 px-2.5 py-1.5">
          <PaceMetricsDisplay metrics={paceMetrics} />
        </div>
      )}
      {value && distanceM === 0 && (
        <p className="text-[10px] text-muted-foreground">
          스탠딩 회복 — 시간만 기록됩니다
        </p>
      )}
    </div>
  )
}

function SegmentPaceField({
  field,
  value,
  onChange,
  sessionFields,
  stacked = false,
}: {
  field: SessionFieldDef
  value: string
  onChange: (value: string) => void
  sessionFields: SessionFields
  stacked?: boolean
}) {
  const id = `session-${field.id}`
  const distanceM = field.linkedDistanceField
    ? resolveDistanceMeters(field.linkedDistanceField, sessionFields)
    : null

  const paceMetrics = useMemo(() => {
    const sec = parsePaceToSeconds(value)
    if (!sec || distanceM === null || distanceM <= 0) return null
    return buildPaceMetricsFromSegment(sec, distanceM)
  }, [value, distanceM])

  const segmentLabel =
    distanceM && distanceM > 0 ? formatSegmentDistanceLabel(distanceM) : null

  return (
    <div className={cn("min-w-0 space-y-1.5", !stacked && "col-span-2")}>
      <Label htmlFor={id} className="text-xs">
        {field.label}
        {segmentLabel && (
          <span className="text-muted-foreground font-normal ml-1 font-mono">
            {segmentLabel}
          </span>
        )}
      </Label>
      <Input
        id={id}
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 font-mono"
      />
      {field.hint && (
        <p className="text-[10px] text-muted-foreground">{field.hint}</p>
      )}
      {paceMetrics && (
        <div className="rounded-md bg-accent/5 border border-accent/15 px-2.5 py-1.5">
          <PaceMetricsDisplay metrics={paceMetrics} />
        </div>
      )}
      {value && distanceM !== null && distanceM <= 0 && (
        <p className="text-[10px] text-muted-foreground">
          스탠딩 회복은 회복 시간으로 기록하세요
        </p>
      )}
      {value && distanceM === null && (
        <p className="text-[10px] text-muted-foreground">
          위에서 거리를 먼저 선택하세요
        </p>
      )}
    </div>
  )
}

function RepeatSessionPaceSummary({
  sessionFields,
  categoryId,
}: {
  sessionFields: SessionFields
  categoryId: WorkoutCategoryId
}) {
  const estimatedMetrics = useMemo(() => {
    if (categoryId === "hill") {
      return estimateIntervalSessionPaceMetrics({
        reps: sessionFields.reps ?? "",
        sets: sessionFields.sets ?? "",
        intervalPace: sessionFields.hillTime ?? "",
        intervalDistanceM: resolveDistanceMeters("hillLength", sessionFields),
        recoveryDistanceM: resolveDistanceMeters("recoveryDistance", sessionFields),
        recoveryTime: sessionFields.recoveryTime ?? "",
      })
    }
    return estimateIntervalSessionPaceMetrics({
      reps: sessionFields.reps ?? "",
      sets: sessionFields.sets ?? "",
      intervalPace: sessionFields.intervalPace ?? "",
      intervalDistanceM: resolveDistanceMeters("repDistance", sessionFields),
      recoveryDistanceM: resolveDistanceMeters("recoveryDistance", sessionFields),
      recoveryTime: sessionFields.recoveryTime ?? "",
    })
  }, [sessionFields, categoryId])

  if (!estimatedMetrics) return null

  return (
    <div className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2.5 mt-1 space-y-1.5">
      <p className="text-[11px] text-muted-foreground">예상 세션 평균</p>
      <PaceMetricsDisplay metrics={estimatedMetrics} size="md" />
      <p className="text-[10px] text-muted-foreground">
        횟수 × 세트 반복 합산
      </p>
    </div>
  )
}

function SessionFieldInput({
  field,
  value,
  onChange,
}: {
  field: SessionFieldDef
  value: string
  onChange: (value: string) => void
}) {
  const id = `session-${field.id}`

  if (field.type === "select" && field.options) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-xs">
          {field.label}
        </Label>
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">선택</option>
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {field.hint && (
          <p className="text-[10px] text-muted-foreground">{field.hint}</p>
        )}
      </div>
    )
  }

  if (field.type === "textarea") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-xs">
          {field.label}
        </Label>
        <Textarea
          id={id}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="resize-none text-sm"
        />
        {field.hint && (
          <p className="text-[10px] text-muted-foreground">{field.hint}</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {field.label}
        {field.unit && (
          <span className="text-muted-foreground font-normal ml-1">
            ({field.unit})
          </span>
        )}
      </Label>
      <Input
        id={id}
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10"
      />
      {field.hint && (
        <p className="text-[10px] text-muted-foreground">{field.hint}</p>
      )}
    </div>
  )
}

function SessionFieldRenderer({
  field,
  sessionFields,
  onUpdate,
  stacked = false,
}: {
  field: SessionFieldDef
  sessionFields: SessionFields
  onUpdate: (fieldId: string, value: string) => void
  stacked?: boolean
}) {
  if (field.type === "selectOrCustom") {
    return (
      <SelectOrCustomField
        field={field}
        sessionFields={sessionFields}
        onUpdate={onUpdate}
        stacked={stacked}
      />
    )
  }
  if (field.type === "segmentPace") {
    return (
      <SegmentPaceField
        field={field}
        value={sessionFields[field.id] ?? ""}
        onChange={(v) => onUpdate(field.id, v)}
        sessionFields={sessionFields}
        stacked={stacked}
      />
    )
  }
  if (field.type === "duration") {
    return (
      <DurationField
        field={field}
        value={sessionFields[field.id] ?? ""}
        onChange={(v) => onUpdate(field.id, v)}
        sessionFields={sessionFields}
        stacked={stacked}
      />
    )
  }
  return (
    <SessionFieldInput
      field={field}
      value={sessionFields[field.id] ?? ""}
      onChange={(v) => onUpdate(field.id, v)}
    />
  )
}

function GroupedSessionFields({
  groups,
  fields,
  sessionFields,
  onUpdate,
}: {
  groups: SessionFieldGroup[]
  fields: SessionFieldDef[]
  sessionFields: SessionFields
  onUpdate: (fieldId: string, value: string) => void
}) {
  const fieldMap = useMemo(
    () => new Map(fields.map((f) => [f.id, f])),
    [fields]
  )

  return (
    <div className="space-y-3 min-w-0">
      {groups.map((group) => {
        const groupFields = group.fieldIds
          .map((id) => fieldMap.get(id))
          .filter((f): f is SessionFieldDef => Boolean(f))

        const useTwoColumns =
          groupFields.length === 2 &&
          groupFields.every(
            (f) =>
              !f.type ||
              f.type === "text" ||
              (f.type === "select" && !f.colSpan)
          )

        const hasFullWidthField = groupFields.some(
          (f) => f.colSpan === 2 || f.type === "duration" || f.type === "selectOrCustom"
        )

        return (
          <div
            key={group.title}
            className="rounded-xl border border-border/60 bg-secondary/20 p-3 min-w-0 space-y-3"
          >
            <p className="text-xs font-semibold text-accent">{group.title}</p>
            <div
              className={cn(
                "min-w-0",
                useTwoColumns && !hasFullWidthField
                  ? "grid grid-cols-2 gap-3"
                  : "space-y-3"
              )}
            >
              {groupFields.map((field) => (
                <div
                  key={field.id}
                  className={cn(
                    field.colSpan === 2 && "col-span-2",
                    "min-w-0"
                  )}
                >
                  <SessionFieldRenderer
                    field={field}
                    sessionFields={sessionFields}
                    onUpdate={onUpdate}
                    stacked
                  />
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function WorkoutRecordForm({ onSaved }: { onSaved?: () => void }) {
  const [categoryId, setCategoryId] = useState<WorkoutCategoryId>("interval")
  const [sessionFields, setSessionFields] = useState<SessionFields>({})
  const [crossExercises, setCrossExercises] = useState<CrossExerciseEntry[]>([
    createCrossExerciseEntry(),
  ])
  const [common, setCommon] = useState(initialCommon)

  const category = getWorkoutCategory(categoryId)
  const isCrossTraining = category.recordType === "cross"

  useEffect(() => {
    setSessionFields({})
    setCrossExercises([createCrossExerciseEntry()])
  }, [categoryId])

  const averagePaceMetrics = useMemo(() => {
    const distanceKm = parseDistanceKm(common.distance)
    const timeMinutes = parseTimeToMinutes(common.time)
    if (!distanceKm || !timeMinutes) return null
    return buildPaceMetricsFromDistanceAndTime(distanceKm, timeMinutes)
  }, [common.distance, common.time])

  const updateSessionField = (fieldId: string, value: string) => {
    setSessionFields((prev) => ({ ...prev, [fieldId]: value }))
  }

  const handleSave = () => {
    // API 연동 시 categoryId, sessionFields, crossExercises, common, averagePaceMetrics 전송
    onSaved?.()
  }

  return (
    <div className="space-y-4 pt-2 min-w-0">
      {/* Category */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">
          훈련 카테고리
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {workoutCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryId(cat.id)}
              className={cn(
                "flex flex-col items-center justify-center rounded-xl border px-2 py-2.5 text-center transition-all",
                categoryId === cat.id
                  ? "border-accent bg-accent/15 text-foreground"
                  : "border-border/60 bg-secondary/30 text-muted-foreground hover:border-border hover:bg-secondary/50"
              )}
            >
              <span
                className={cn(
                  "text-[9px] font-bold tracking-widest",
                  categoryId === cat.id ? "text-accent" : "text-muted-foreground"
                )}
              >
                {cat.tag}
              </span>
              <span className="text-xs font-semibold mt-0.5">{cat.label}</span>
            </button>
          ))}
        </div>
        <div className="rounded-lg border border-accent/20 bg-accent/5 px-3 py-2">
          <p className="text-xs text-foreground/90 leading-relaxed">
            {category.description}
          </p>
        </div>
      </div>

      {/* Session-specific fields */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">
          세션 상세 · {category.label}
        </Label>
        {isCrossTraining ? (
          <CrossExerciseList
            key={categoryId}
            exercises={crossExercises}
            onChange={setCrossExercises}
          />
        ) : category.sessionGroups ? (
          <>
            <GroupedSessionFields
              groups={category.sessionGroups}
              fields={category.sessionFields}
              sessionFields={sessionFields}
              onUpdate={updateSessionField}
            />
            {(categoryId === "interval" || categoryId === "hill") && (
              <RepeatSessionPaceSummary
                sessionFields={sessionFields}
                categoryId={categoryId}
              />
            )}
          </>
        ) : category.sessionFields.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-border/60 bg-secondary/20 min-w-0 [&>*]:min-w-0">
            {category.sessionFields.map((field) => (
              <div
                key={field.id}
                className={cn(
                  field.colSpan === 2 && "col-span-2",
                  "min-w-0"
                )}
              >
                <SessionFieldRenderer
                  field={field}
                  sessionFields={sessionFields}
                  onUpdate={updateSessionField}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Common totals */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">
          {isCrossTraining ? "세션 요약" : "실제 수행 기록"}
        </Label>
        {isCrossTraining ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="time" className="text-xs">
                총 운동 시간
              </Label>
              <Input
                id="time"
                placeholder="45 또는 1:05:00"
                value={common.time}
                onChange={(e) =>
                  setCommon((prev) => ({ ...prev, time: e.target.value }))
                }
                className="h-10"
              />
              <p className="text-[10px] text-muted-foreground">
                분, mm:ss, h:mm:ss
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="distance" className="text-xs">
                병행 러닝 거리 (선택)
              </Label>
              <Input
                id="distance"
                placeholder="3"
                value={common.distance}
                onChange={(e) =>
                  setCommon((prev) => ({ ...prev, distance: e.target.value }))
                }
                className="h-10"
              />
              <p className="text-[10px] text-muted-foreground">km · 워밍업 조깅 등</p>
            </div>
            {averagePaceMetrics && (
              <div className="rounded-md border border-accent/20 bg-accent/5 px-3 py-2 space-y-1">
                <p className="text-[10px] text-muted-foreground">병행 러닝 페이스</p>
                <PaceMetricsDisplay metrics={averagePaceMetrics} size="md" />
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="distance" className="text-xs">
                  총 거리 (km)
                </Label>
                <Input
                  id="distance"
                  placeholder="10.5"
                  value={common.distance}
                  onChange={(e) =>
                    setCommon((prev) => ({ ...prev, distance: e.target.value }))
                  }
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="time" className="text-xs">
                  총 시간
                </Label>
                <Input
                  id="time"
                  placeholder="50 또는 52:30"
                  value={common.time}
                  onChange={(e) =>
                    setCommon((prev) => ({ ...prev, time: e.target.value }))
                  }
                  className="h-10"
                />
                <p className="text-[10px] text-muted-foreground">분 또는 mm:ss</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pace" className="text-xs">
                평균 페이스 · 시속
              </Label>
              <div
                id="pace"
                aria-live="polite"
                className={cn(
                  "min-h-10 w-full rounded-md border border-input bg-secondary/40 px-3 py-2",
                  averagePaceMetrics ? "" : "flex items-center"
                )}
              >
                {averagePaceMetrics ? (
                  <PaceMetricsDisplay metrics={averagePaceMetrics} size="md" />
                ) : (
                  <span className="text-sm text-muted-foreground">
                    거리·시간 입력 시 자동 계산
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="note" className="text-xs">
          메모
        </Label>
        <Textarea
          id="note"
          placeholder="세션 소감, 날씨, 코치 피드백 등"
          value={common.note}
          onChange={(e) =>
            setCommon((prev) => ({ ...prev, note: e.target.value }))
          }
          rows={2}
        />
      </div>

      <Button
        type="button"
        onClick={handleSave}
        className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
      >
        저장하기
      </Button>
    </div>
  )
}
