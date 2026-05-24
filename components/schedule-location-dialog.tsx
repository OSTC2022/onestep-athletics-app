"use client"

import { ExternalLink, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  formatScheduleDayTitle,
  openNaverMap,
  type WeeklyScheduleDay,
} from "@/lib/weekly-schedule"

export function ScheduleLocationDialog({
  open,
  onOpenChange,
  day,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  day: WeeklyScheduleDay | null
}) {
  if (!day) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            {formatScheduleDayTitle(day)}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="rounded-lg bg-secondary/50 px-3 py-2.5 text-sm">
            <p className="text-muted-foreground text-xs mb-1">훈련</p>
            <p className="font-medium">
              {day.type}{" "}
              {day.distance !== "-" && (
                <span className="text-muted-foreground font-normal">
                  · {day.distance}
                </span>
              )}
            </p>
          </div>

          {day.location ? (
            <>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">장소</p>
                  <p className="text-sm font-semibold flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    {day.location.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">주소</p>
                  <p className="text-sm text-foreground/90 leading-relaxed pl-6">
                    {day.location.address}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => openNaverMap(day.location!)}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                네이버 지도에서 보기
              </Button>
            </>
          ) : (
            <div className="rounded-lg border border-border/60 bg-secondary/30 px-3 py-4 text-center">
              <p className="text-sm text-muted-foreground">
                휴식일에는 집합 장소가 없습니다.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
