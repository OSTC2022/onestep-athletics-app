"use client"

import Link from "next/link"
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Pencil,
  Zap,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrainingPhaseLine } from "@/components/training-phase-line"
import {
  getIntensityLabel,
  getTrainingPhases,
  getTrainingTypeMeta,
  type TrainingSession,
} from "@/lib/training-session"
import { formatKoreanDateWithWeekday } from "@/lib/date-format"
import { useCanManageTraining } from "@/hooks/useCurrentUser"

export function TrainingSessionDetailView({
  session,
  showEditLink = true,
  embedded = false,
}: {
  session: TrainingSession
  showEditLink?: boolean
  embedded?: boolean
}) {
  const canManage = useCanManageTraining()
  const typeMeta = getTrainingTypeMeta(session.type)
  const phases = getTrainingPhases(session)
  const isCompleted = session.status === "completed"

  const dateLabel = (() => {
    try {
      const [y, m, d] = session.date.split("-").map(Number)
      return formatKoreanDateWithWeekday(new Date(y, m - 1, d))
    } catch {
      return session.date
    }
  })()

  return (
    <div className={embedded ? "space-y-4" : "px-4 py-6 space-y-4"}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {!embedded && (
            <>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <div className="inline-flex items-center gap-1 rounded-full px-2 py-[3px] bg-[#1a2a14] border border-[#2d4a22]">
                  <Zap className="h-3 w-3 text-accent" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-accent">
                    {typeMeta.badge}
                  </span>
                </div>
                {isCompleted && (
                  <Badge className="bg-accent/15 text-accent border-accent/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    완료
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold tracking-tight">{session.title}</h1>
              {session.description ? (
                <p className="text-sm text-muted-foreground mt-1">{session.description}</p>
              ) : null}
            </>
          )}
          {embedded && (
            <>
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-accent" />
                <h2 className="text-base font-semibold">오늘의 훈련 상세</h2>
                {isCompleted && (
                  <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px]">
                    완료
                  </Badge>
                )}
              </div>
              <p className="font-medium">{session.title}</p>
            </>
          )}
        </div>
        {showEditLink && canManage && (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="shrink-0 border-accent/40 text-accent hover:bg-accent/10"
          >
            <Link href={`/training/edit/${session.id}`}>
              <Pencil className="h-3.5 w-3.5 mr-1" />
              수정
            </Link>
          </Button>
        )}
      </header>

      <section className="rounded-2xl border border-border/60 bg-[#111811] p-4 space-y-3">
        <h2 className="text-[13px] font-semibold text-accent">기본 정보</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">날짜</p>
            <p className="flex items-center gap-1.5 font-medium">
              <Calendar className="h-3.5 w-3.5 text-accent" />
              {dateLabel}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">총 거리</p>
            <p className="font-medium tabular-nums text-accent">
              {session.totalDistance || "—"}
            </p>
          </div>
        </div>
        {session.location ? (
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">장소</p>
            <p className="text-sm flex items-start gap-2">
              <MapPin className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <span>
                {session.location.name}
                {session.location.address ? (
                  <span className="block text-muted-foreground text-[12px] mt-0.5">
                    {session.location.address}
                  </span>
                ) : null}
              </span>
            </p>
          </div>
        ) : null}
      </section>

      {phases.length > 0 && (
        <section className="rounded-2xl border border-border/60 bg-[#111811] p-4 space-y-3">
          <h2 className="text-[13px] font-semibold text-accent">훈련 구성</h2>
          <ul className="space-y-3">
            {phases.map((phase) => (
              <TrainingPhaseLine
                key={phase.label}
                label={phase.label}
                text={phase.text}
                active={phase.active}
              />
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-border/60 bg-[#111811] p-4 space-y-3">
        <h2 className="text-[13px] font-semibold text-accent">목표 정보</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">목표 페이스</p>
            <p className="font-medium tabular-nums">{session.targetPace || "—"}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">휴식 시간</p>
            <p className="font-medium">{session.restTime || "—"}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">훈련 강도</p>
            <p className="font-medium">{getIntensityLabel(session.intensity)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">예상 소요</p>
            <p className="font-medium flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-accent" />
              {session.estimatedDuration || "—"}
            </p>
          </div>
        </div>
      </section>

      {(session.coachMemo || session.athleteNotes) && (
        <section className="rounded-2xl border border-border/60 bg-[#111811] p-4 space-y-3">
          <h2 className="text-[13px] font-semibold text-accent">메모</h2>
          {session.coachMemo ? (
            <div className="rounded-xl bg-[#060606] border border-[#141414] px-3 py-2.5">
              <p className="text-[11px] text-muted-foreground mb-1">코치 메모</p>
              <p className="text-sm leading-relaxed text-[#d4d4d4]">{session.coachMemo}</p>
            </div>
          ) : null}
          {session.athleteNotes ? (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <p>{session.athleteNotes}</p>
            </div>
          ) : null}
        </section>
      )}
    </div>
  )
}
