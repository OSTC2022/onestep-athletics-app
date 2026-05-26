"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  Copy,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { TrainingCopyDialog } from "@/components/training-copy-dialog"
import {
  deleteTrainingSession,
  setTrainingSessionCompleted,
  type TrainingSession,
} from "@/lib/training-session"

export function TrainingActionMenu({
  session,
  onDeleted,
}: {
  session: TrainingSession
  onDeleted?: () => void
}) {
  const router = useRouter()
  const [copyOpen, setCopyOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const isCompleted = session.status === "completed"
  const goEdit = () => router.push(`/training/edit/${session.id}`)

  const handleComplete = () => {
    setTrainingSessionCompleted(session.id, !isCompleted)
    toast.success(isCompleted ? "완료 처리를 해제했습니다" : "훈련을 완료 처리했습니다")
  }

  const handleDelete = () => {
    deleteTrainingSession(session.id)
    setDeleteOpen(false)
    toast.success("훈련을 삭제했습니다")
    onDeleted?.()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-accent hover:bg-accent/10"
            aria-label="훈련 관리 메뉴"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40 bg-card border-border">
          <DropdownMenuItem onSelect={goEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            수정
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setCopyOpen(true)}>
            <Copy className="h-4 w-4 mr-2" />
            복사
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleComplete}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {isCompleted ? "완료 해제" : "완료 처리"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TrainingCopyDialog
        open={copyOpen}
        onOpenChange={setCopyOpen}
        sessionId={session.id}
        onCopied={(newId) => {
          toast.success("훈련을 복사했습니다")
          router.push(`/training/edit/${newId}`)
        }}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>이 훈련을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              「{session.title}」 훈련이 삭제됩니다. 삭제 후 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
