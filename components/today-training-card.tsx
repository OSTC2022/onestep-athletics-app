"use client"

import { useRouter } from "next/navigation"
import { CheckCircle2, MapPin, Zap } from "lucide-react"
import { TrainingActionMenu } from "@/components/training-action-menu"
import { TrainingLocationDialog } from "@/components/training-location-dialog"
import { TrainingPhaseLine } from "@/components/training-phase-line"
import { useCanManageTraining } from "@/hooks/useCurrentUser"
import {
  createEmptyTrainingSession,
  getTrainingPhases,
  getTrainingTypeMeta,
  type TrainingSession,
} from "@/lib/training-session"
import { cn } from "@/lib/utils"
import { useState } from "react"

const C = {
  lime: "#64b869",
  card: "#111811",
  border: "#1c2a1c",
  textSub: "#888888",
  textDim: "#666666",
} as const

export function TodayTrainingCard({
  session,
  compact = false,
  titleClassName,
  statClassName,
  padClassName,
  className,
}: {
  session: TrainingSession | null
  compact?: boolean
  titleClassName?: string
  statClassName?: string
  padClassName?: string
  className?: string
}) {
  const router = useRouter()
  const canManage = useCanManageTraining()
  const [locationOpen, setLocationOpen] = useState(false)

  if (!session) {
    return (
      <div
        className={cn("rounded-2xl mb-3 p-[18px] text-center", className)}
        style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
      >
        <p className="text-[14px] mb-3" style={{ color: C.textSub }}>
          오늘 등록된 훈련이 없습니다
        </p>
        {canManage && (
          <button
            type="button"
            onClick={() => {
              const created = createEmptyTrainingSession()
              router.push(`/training/edit/${created.id}`)
            }}
            className="text-[13px] font-medium text-accent"
          >
            + 훈련 등록하기
          </button>
        )}
      </div>
    )
  }

  const typeMeta = getTrainingTypeMeta(session.type)
  const phases = getTrainingPhases(session)
  const isCompleted = session.status === "completed"

  const goDetail = () => router.push(`/training/${session.id}`)

  return (
    <>
      <div
        className={cn("rounded-2xl mb-3 relative", padClassName ?? "p-[18px]", className)}
        style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
      >
        <div className="flex items-start justify-between mb-[14px] gap-2">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <div
              className="inline-flex items-center gap-1 rounded-full px-2 py-[3px]"
              style={{
                backgroundColor: "#1a2a14",
                border: "1px solid #2d4a22",
              }}
            >
              <Zap className="h-3 w-3" style={{ color: C.lime }} />
              <span
                className="text-[10px] font-bold uppercase tracking-[0.06em]"
                style={{ color: C.lime }}
              >
                {typeMeta.badge}
              </span>
            </div>
            {isCompleted && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-accent/15 border border-accent/30 px-2 py-[3px] text-[10px] font-semibold text-accent">
                <CheckCircle2 className="h-3 w-3" />
                완료
              </span>
            )}
          </div>

          <div className="flex items-start gap-1 shrink-0">
            <p
              className={cn(
                "font-bold tabular-nums leading-[30px]",
                statClassName ?? "text-[26px]"
              )}
              style={{ color: C.lime }}
            >
              {session.totalDistance || "—"}
            </p>
            {canManage && <TrainingActionMenu session={session} />}
          </div>
        </div>

        <button
          type="button"
          onClick={goDetail}
          className="w-full text-left active:opacity-90"
        >
          <h2
            className={cn(
              "font-bold tracking-[-0.02em] leading-[28px] mb-[4px]",
              titleClassName ?? "text-[22px]"
            )}
          >
            {session.title}
          </h2>
          {session.description ? (
            <p className="text-[14px] leading-[20px] mb-[10px]" style={{ color: C.textSub }}>
              {session.description}
            </p>
          ) : null}

          {session.location ? (
            <div
              role="presentation"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setLocationOpen(true)
              }}
              className="flex items-start gap-2 mb-[16px] text-left w-full active:opacity-80"
            >
              <MapPin className="h-4 w-4 shrink-0 mt-[2px]" style={{ color: C.lime }} />
              <span className="text-[14px] leading-[20px]" style={{ color: C.textSub }}>
                {session.location.name}
              </span>
            </div>
          ) : (
            <p className="text-[13px] mb-[16px]" style={{ color: C.textDim }}>
              장소 미등록
            </p>
          )}

          {phases.length > 0 && (
            <ul className={cn("space-y-[12px] mb-[16px]", compact && "space-y-2 mb-3")}>
              {phases.map((phase) => (
                <TrainingPhaseLine
                  key={phase.label}
                  label={phase.label}
                  text={phase.text}
                  active={phase.active}
                  compact={compact}
                />
              ))}
            </ul>
          )}

          {session.targetPace ? (
            <div className="pt-[14px] border-t text-[14px]" style={{ borderColor: C.border }}>
              <span style={{ color: C.textSub }}>목표 페이스 </span>
              <span className="font-medium tabular-nums" style={{ color: C.lime }}>
                {session.targetPace}
              </span>
            </div>
          ) : null}
        </button>
      </div>

      <TrainingLocationDialog
        open={locationOpen}
        onOpenChange={setLocationOpen}
        session={session}
      />
    </>
  )
}
