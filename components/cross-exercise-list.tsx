"use client"

import { useEffect, useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  createCrossExerciseEntry,
  crossExerciseFieldDefs,
  formatCrossExerciseDetail,
  getActivityTypeLabel,
  getBodyAreaLabel,
  hasCrossExerciseContent,
  type CrossExerciseEntry,
  type CrossExerciseFieldKey,
} from "@/lib/cross-exercises"
import type { SessionFieldDef } from "@/lib/workout-categories"
import { cn } from "@/lib/utils"

function getField(id: string): SessionFieldDef {
  return crossExerciseFieldDefs.find((f) => f.id === id)!
}

function CrossExerciseField({
  field,
  value,
  onChange,
  entryId,
}: {
  field: SessionFieldDef
  value: string
  onChange: (value: string) => void
  entryId: string
}) {
  const inputId = `cross-${entryId}-${field.id}`

  if (field.type === "select" && field.options) {
    return (
      <div className="space-y-1.5 min-w-0">
        <Label htmlFor={inputId} className="text-xs">
          {field.label}
        </Label>
        <select
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">선택</option>
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (field.type === "duration") {
    return (
      <div className="space-y-1.5 min-w-0">
        <Label htmlFor={inputId} className="text-xs">
          {field.label}
          <span className="text-muted-foreground font-normal ml-1 font-mono">
            mm:ss
          </span>
        </Label>
        <Input
          id={inputId}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 font-mono"
        />
        {field.hint && (
          <p className="text-[10px] text-muted-foreground">{field.hint}</p>
        )}
      </div>
    )
  }

  if (field.id === "exerciseName") {
    return (
      <div className="space-y-1.5 min-w-0">
        <Label htmlFor={inputId} className="text-xs">
          {field.label}
        </Label>
        <Input
          id={inputId}
          placeholder="운동 종목을 입력하세요"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 bg-black/90 border-border/50 text-foreground placeholder:text-foreground/50 focus-visible:border-accent/40"
        />
        <div className="rounded-lg bg-black/90 border border-border/50 px-3 py-2.5">
          <p className="text-[10px] text-muted-foreground mb-1.5">입력 예시</p>
          <p className="text-xs text-foreground/90 leading-relaxed">
            스쿼트, 런지, 힙 브릿지, 데드리프트, 플랭크
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5 min-w-0">
      <Label htmlFor={inputId} className="text-xs">
        {field.label}
        {field.unit && (
          <span className="text-muted-foreground font-normal ml-1">
            ({field.unit})
          </span>
        )}
      </Label>
      <Input
        id={inputId}
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

function CrossExerciseCompactCard({
  index,
  entry,
  onEdit,
  onRemove,
}: {
  index: number
  entry: CrossExerciseEntry
  onEdit: () => void
  onRemove: () => void
}) {
  const title =
    entry.exerciseName ||
    (entry.activityType ? getActivityTypeLabel(entry.activityType) : `운동 ${index + 1}`)
  const subtitle = formatCrossExerciseDetail(entry)
  const bodyTag = entry.bodyArea ? getBodyAreaLabel(entry.bodyArea) : null

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/30 px-2.5 py-2 min-w-0">
      <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-[10px] font-bold text-accent tabular-nums">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-xs font-semibold truncate">{title}</p>
          {bodyTag && (
            <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
              {bodyTag}
            </span>
          )}
        </div>
        <p
          className={cn(
            "text-[10px] truncate mt-0.5",
            hasCrossExerciseContent(entry)
              ? "text-muted-foreground"
              : "text-muted-foreground/60 italic"
          )}
        >
          {subtitle}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-accent"
          onClick={onEdit}
          aria-label={`운동 ${index + 1} 수정`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label={`운동 ${index + 1} 삭제`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

function CrossExerciseEditor({
  index,
  entry,
  onUpdate,
  onDone,
  onRemove,
}: {
  index: number
  entry: CrossExerciseEntry
  onUpdate: (field: CrossExerciseFieldKey, value: string) => void
  onDone: () => void
  onRemove: () => void
}) {
  const showDone = hasCrossExerciseContent(entry)

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 min-w-0 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-md bg-accent text-[10px] font-bold text-accent-foreground tabular-nums">
            {index + 1}
          </span>
          <p className="text-xs font-semibold text-accent">운동 입력 중</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {showDone && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 px-2.5 text-[11px]"
              onClick={onDone}
            >
              완료
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            aria-label={`운동 ${index + 1} 삭제`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="space-y-3 min-w-0">
        <CrossExerciseField
          field={getField("activityType")}
          entryId={entry.id}
          value={entry.activityType}
          onChange={(v) => onUpdate("activityType", v)}
        />
        <CrossExerciseField
          field={getField("exerciseName")}
          entryId={entry.id}
          value={entry.exerciseName}
          onChange={(v) => onUpdate("exerciseName", v)}
        />
        <div className="grid grid-cols-2 gap-3 min-w-0">
          <CrossExerciseField
            field={getField("bodyArea")}
            entryId={entry.id}
            value={entry.bodyArea}
            onChange={(v) => onUpdate("bodyArea", v)}
          />
          <CrossExerciseField
            field={getField("sets")}
            entryId={entry.id}
            value={entry.sets}
            onChange={(v) => onUpdate("sets", v)}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 min-w-0">
          <CrossExerciseField
            field={getField("reps")}
            entryId={entry.id}
            value={entry.reps}
            onChange={(v) => onUpdate("reps", v)}
          />
          <CrossExerciseField
            field={getField("load")}
            entryId={entry.id}
            value={entry.load}
            onChange={(v) => onUpdate("load", v)}
          />
          <CrossExerciseField
            field={getField("rpe")}
            entryId={entry.id}
            value={entry.rpe}
            onChange={(v) => onUpdate("rpe", v)}
          />
        </div>
        <CrossExerciseField
          field={getField("restTime")}
          entryId={entry.id}
          value={entry.restTime}
          onChange={(v) => onUpdate("restTime", v)}
        />
      </div>
    </div>
  )
}

export function CrossExerciseList({
  exercises,
  onChange,
}: {
  exercises: CrossExerciseEntry[]
  onChange: (exercises: CrossExerciseEntry[]) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(
    () => exercises[0]?.id ?? null
  )

  useEffect(() => {
    if (editingId && !exercises.some((e) => e.id === editingId)) {
      setEditingId(exercises[exercises.length - 1]?.id ?? null)
    }
  }, [exercises, editingId])

  const addExercise = () => {
    const newEntry = createCrossExerciseEntry()
    onChange([...exercises, newEntry])
    setEditingId(newEntry.id)
  }

  const removeExercise = (id: string) => {
    if (exercises.length <= 1) {
      const empty = createCrossExerciseEntry()
      onChange([empty])
      setEditingId(empty.id)
      return
    }
    const next = exercises.filter((e) => e.id !== id)
    onChange(next)
    if (editingId === id) {
      setEditingId(next[next.length - 1].id)
    }
  }

  const updateExercise = (
    id: string,
    field: CrossExerciseFieldKey,
    value: string
  ) => {
    onChange(
      exercises.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    )
  }

  const collapsedCount = exercises.filter((e) => e.id !== editingId).length

  return (
    <div className="space-y-2 min-w-0">
      {collapsedCount > 0 && (
        <p className="text-[10px] text-muted-foreground px-0.5">
          등록된 운동 {collapsedCount}개
        </p>
      )}

      {exercises.map((entry, index) =>
        entry.id === editingId ? (
          <CrossExerciseEditor
            key={entry.id}
            index={index}
            entry={entry}
            onUpdate={(field, value) => updateExercise(entry.id, field, value)}
            onDone={() => setEditingId(null)}
            onRemove={() => removeExercise(entry.id)}
          />
        ) : (
          <CrossExerciseCompactCard
            key={entry.id}
            index={index}
            entry={entry}
            onEdit={() => setEditingId(entry.id)}
            onRemove={() => removeExercise(entry.id)}
          />
        )
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full border-dashed border-border/80 bg-secondary/20 hover:bg-secondary/40 mt-1"
        onClick={addExercise}
      >
        <Plus className="h-4 w-4 mr-2" />
        운동 추가
      </Button>
    </div>
  )
}
