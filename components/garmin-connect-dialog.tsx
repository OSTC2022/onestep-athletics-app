"use client"

import { RefreshCw, Unplug, Watch } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  disconnectGarmin,
  formatSyncedTime,
  startGarminConnect,
  syncGarminWeeklyDistance,
  type GarminWeeklyCache,
} from "@/lib/garmin/client"

export function GarminConnectDialog({
  open,
  onOpenChange,
  configured,
  connected,
  weekly,
  syncing,
  onSyncComplete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  configured: boolean
  connected: boolean
  weekly: GarminWeeklyCache | null
  syncing: boolean
  onSyncComplete: (weekly: GarminWeeklyCache | null) => void
}) {
  const handleConnect = () => {
    startGarminConnect()
  }

  const handleSync = async () => {
    try {
      const result = await syncGarminWeeklyDistance()
      onSyncComplete(result)
    } catch {
      onSyncComplete(weekly)
    }
  }

  const handleDisconnect = async () => {
    await disconnectGarmin()
    onSyncComplete(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Watch className="h-4 w-4 text-accent" />
            Garmin Connect
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Garmin Connect와 연동하면 이번 주 러닝·트레일 활동 거리가 주간
            누적 거리에 자동 반영됩니다.
          </p>

          {!configured && (
            <div className="rounded-lg border border-border bg-secondary/30 px-3 py-3 text-sm text-muted-foreground">
              서버에 Garmin API 키가 설정되면 연동 버튼이 활성화됩니다.
              <span className="block mt-1 text-[11px]">
                `.env`에 `GARMIN_CONSUMER_KEY`, `GARMIN_CONSUMER_SECRET`을
                추가하세요.
              </span>
            </div>
          )}

          {connected && weekly && (
            <div className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-3">
              <p className="text-xs text-muted-foreground mb-1">이번 주 누적</p>
              <p className="text-2xl font-bold tabular-nums text-accent">
                {weekly.distanceLabel}
                <span className="text-sm font-normal ml-1">km</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {weekly.weekLabel} · 활동 {weekly.activityCount}회
              </p>
              {weekly.syncedAt && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  마지막 동기화 {formatSyncedTime(weekly.syncedAt)}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {!connected ? (
              <Button
                type="button"
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={!configured}
                onClick={handleConnect}
              >
                Garmin Connect 연동
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                  disabled={syncing}
                  onClick={handleSync}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`}
                  />
                  {syncing ? "동기화 중..." : "지금 동기화"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleDisconnect}
                >
                  <Unplug className="h-4 w-4 mr-2" />
                  연결 해제
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
