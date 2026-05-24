/** Standard 400m track: extra meters per outer lane (per 400m lap) */
export const LANE_OFFSET_PER_400M = 7.664

export const DISTANCE_PRESETS = [
  { label: "200m", meters: 200 },
  { label: "300m", meters: 300 },
  { label: "400m", meters: 400 },
  { label: "1km", meters: 1000 },
  { label: "5km", meters: 5000 },
  { label: "10km", meters: 10000 },
  { label: "Half", meters: 21097.5 },
  { label: "Full", meters: 42195 },
] as const

export const LAP_INTERVAL_PRESETS = [
  { label: "100m", meters: 100 },
  { label: "200m", meters: 200 },
  { label: "300m", meters: 300 },
  { label: "400m", meters: 400 },
  { label: "1km", meters: 1000 },
  { label: "5km", meters: 5000 },
  { label: "10km", meters: 10000 },
  { label: "Half", meters: 21097.5 },
] as const

export interface LapSplit {
  lapIndex: number
  checkpointM: number
  laneCheckpointM: number
  segmentM: number
  laneSegmentM: number
  cumulativeTimeSec: number
  segmentTimeSec: number
  segmentPaceSecPerKm: number
}

export function getLaneDistance(baseDistanceM: number, lane: number): number {
  if (lane <= 1) return baseDistanceM
  return baseDistanceM + LANE_OFFSET_PER_400M * (lane - 1) * (baseDistanceM / 400)
}

export function parsePacePerKm(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})$/)
  if (colonMatch) {
    const min = Number(colonMatch[1])
    const sec = Number(colonMatch[2])
    if (sec >= 60 || min < 0) return null
    return min * 60 + sec
  }

  const secOnly = trimmed.match(/^(\d+(?:\.\d+)?)$/)
  if (secOnly) {
    const sec = Number(secOnly[1])
    if (sec <= 0) return null
    return sec
  }

  return null
}

export function calculateTime(distanceM: number, paceSecPerKm: number): number {
  return (distanceM / 1000) * paceSecPerKm
}

export function calculateLaneLapSplits(
  baseTotalM: number,
  lane: number,
  lapIntervalM: number,
  paceSecPerKm: number
): LapSplit[] {
  if (baseTotalM <= 0 || lapIntervalM <= 0 || paceSecPerKm <= 0) return []

  const splits: LapSplit[] = []
  let prevBaseDist = 0
  let prevLaneDist = 0
  let prevTime = 0
  let lapIndex = 1

  while (prevBaseDist < baseTotalM - 1e-9) {
    const nextBaseDist = Math.min(prevBaseDist + lapIntervalM, baseTotalM)
    const nextLaneDist = getLaneDistance(nextBaseDist, lane)
    const laneSegmentM = nextLaneDist - prevLaneDist
    const cumulativeTimeSec = calculateTime(nextLaneDist, paceSecPerKm)
    const segmentTimeSec = cumulativeTimeSec - prevTime
    const segmentPaceSecPerKm =
      laneSegmentM > 0 ? (segmentTimeSec / laneSegmentM) * 1000 : paceSecPerKm

    splits.push({
      lapIndex,
      checkpointM: nextBaseDist,
      laneCheckpointM: nextLaneDist,
      segmentM: nextBaseDist - prevBaseDist,
      laneSegmentM,
      cumulativeTimeSec,
      segmentTimeSec,
      segmentPaceSecPerKm,
    })

    prevBaseDist = nextBaseDist
    prevLaneDist = nextLaneDist
    prevTime = cumulativeTimeSec
    lapIndex++
  }

  return splits
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—"

  const rounded = Math.round(seconds * 10) / 10

  if (rounded < 60) {
    return Number.isInteger(rounded)
      ? `${rounded}초`
      : `${rounded.toFixed(1)}초`
  }

  const totalSec = Math.round(rounded)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  return `${m}:${s.toString().padStart(2, "0")}`
}

export function formatPacePerKm(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—"
  const totalSec = Math.round(seconds)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000
    return Number.isInteger(km) ? `${km}km` : `${km.toFixed(2)}km`
  }
  return `${Math.round(meters)}m`
}

export function formatLaneDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)}km`
  return `${Math.round(meters * 10) / 10}m`
}
