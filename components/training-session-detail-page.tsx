"use client"

import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { TrainingSessionDetailView } from "@/components/training-session-detail-view"
import { useTrainingSession } from "@/hooks/use-training-session"
import { loadAllTrainingSessions } from "@/lib/training-session"
import { useEffect } from "react"

export function TrainingSessionDetailPage({ id }: { id: string }) {
  const session = useTrainingSession(id)

  useEffect(() => {
    loadAllTrainingSessions()
  }, [])

  if (!session) {
    return (
      <div className="px-4 py-10 text-center space-y-3">
        <p className="text-muted-foreground">훈련을 찾을 수 없습니다.</p>
        <Link href="/training" className="text-sm text-accent">
          훈련 페이지로 돌아가기
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-border/40 px-4 py-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          홈
        </Link>
      </div>
      <TrainingSessionDetailView session={session} />
    </div>
  )
}
