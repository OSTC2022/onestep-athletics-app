"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { TrainingSessionEditForm } from "@/components/training-session-edit-form"
import { useCanManageTraining } from "@/hooks/useCurrentUser"
import { useTrainingSession } from "@/hooks/use-training-session"
import { useHydrated } from "@/hooks/use-hydrated"
import { loadAllTrainingSessions } from "@/lib/training-session"
import { useEffect } from "react"

export function TrainingSessionEditPage({ id }: { id: string }) {
  const router = useRouter()
  const hydrated = useHydrated()
  const canManage = useCanManageTraining()
  const session = useTrainingSession(id)

  useEffect(() => {
    loadAllTrainingSessions()
  }, [])

  useEffect(() => {
    if (!hydrated || canManage) return
    router.replace(session ? `/training/${id}` : "/training")
  }, [hydrated, canManage, session, id, router])

  if (!hydrated) {
    return null
  }

  if (!canManage) {
    return (
      <div className="px-4 py-16 text-center space-y-3">
        <p className="text-muted-foreground text-sm">
          관리자만 훈련 스케줄을 수정할 수 있습니다.
        </p>
        <Link href={session ? `/training/${id}` : "/training"} className="text-sm text-accent">
          돌아가기
        </Link>
      </div>
    )
  }

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
          href={`/training/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          훈련 상세
        </Link>
        <h1 className="text-lg font-bold mt-2">훈련 수정</h1>
      </div>
      <TrainingSessionEditForm session={session} />
    </div>
  )
}
