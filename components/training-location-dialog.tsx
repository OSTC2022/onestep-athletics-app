"use client"

import { ExternalLink, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { openNaverMap } from "@/lib/weekly-schedule"
import type { TrainingSession } from "@/lib/training-session"

export function TrainingLocationDialog({
  open,
  onOpenChange,
  session,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: TrainingSession
}) {
  const location = session.location
  if (!location) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">{session.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="rounded-lg bg-secondary/50 px-3 py-2.5 text-sm">
            <p className="text-muted-foreground text-xs mb-1">훈련</p>
            <p className="font-medium">
              {session.title}
              {session.totalDistance ? (
                <span className="text-muted-foreground font-normal">
                  {" "}
                  · {session.totalDistance}
                </span>
              ) : null}
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">장소</p>
              <p className="text-sm font-semibold flex items-start gap-2">
                <MapPin className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                {location.name}
              </p>
            </div>
            {location.address ? (
              <div>
                <p className="text-xs text-muted-foreground mb-1">주소</p>
                <p className="text-sm text-muted-foreground">{location.address}</p>
              </div>
            ) : null}
          </div>

          <Button
            type="button"
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => openNaverMap(location)}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            네이버 지도에서 보기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
