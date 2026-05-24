/** Parse distance string to km (positive number). */
export function parseDistanceKm(value: string): number | null {
  const trimmed = value.trim().replace(/,/g, "")
  if (!trimmed) return null
  const n = parseFloat(trimmed)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Parse duration to total minutes.
 * Supports: "52" (minutes), "52:30" (mm:ss), "1:05:30" (h:mm:ss).
 */
export function parseTimeToMinutes(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  if (trimmed.includes(":")) {
    const parts = trimmed.split(":").map((p) => parseFloat(p.trim()))
    if (parts.some((p) => !Number.isFinite(p) || p < 0)) return null

    if (parts.length === 2) {
      const [minutes, seconds] = parts
      if (seconds >= 60) return null
      return minutes + seconds / 60
    }
    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts
      if (minutes >= 60 || seconds >= 60) return null
      return hours * 60 + minutes + seconds / 60
    }
    return null
  }

  const n = parseFloat(trimmed.replace(/,/g, ""))
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Format minutes per km as m:ss /km */
export function formatPaceMinPerKm(paceMinutes: number): string {
  const totalSeconds = Math.round(paceMinutes * 60)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

export interface PaceMetrics {
  pacePerKm: string
  speedKmh: string
}

/** min/km → km/h */
export function paceMinPerKmToSpeedKmh(paceMinPerKm: number): number {
  if (paceMinPerKm <= 0) return 0
  return 60 / paceMinPerKm
}

export function formatSpeedKmh(paceMinPerKm: number): string {
  const speed = paceMinPerKmToSpeedKmh(paceMinPerKm)
  if (speed >= 10) return speed.toFixed(1)
  if (speed >= 1) return speed.toFixed(2)
  return speed.toFixed(2)
}

export function buildPaceMetricsFromMinPerKm(
  paceMinPerKm: number
): PaceMetrics | null {
  if (!Number.isFinite(paceMinPerKm) || paceMinPerKm <= 0) return null
  return {
    pacePerKm: formatPaceMinPerKm(paceMinPerKm),
    speedKmh: formatSpeedKmh(paceMinPerKm),
  }
}

/** Calculate average pace (min/km) from distance and total duration. */
export function calculateAveragePace(
  distanceKm: number,
  timeMinutes: number
): string | null {
  return buildPaceMetricsFromDistanceAndTime(distanceKm, timeMinutes)?.pacePerKm ?? null
}

export function buildPaceMetricsFromDistanceAndTime(
  distanceKm: number,
  timeMinutes: number
): PaceMetrics | null {
  if (distanceKm <= 0 || timeMinutes <= 0) return null
  return buildPaceMetricsFromMinPerKm(timeMinutes / distanceKm)
}

/** Format duration as m:ss (segment completion time). */
export function formatSegmentDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const minutes = Math.floor(s / 60)
  const seconds = s % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

/** Parse running pace string to total seconds (mm:ss or ss). */
export function parsePaceToSeconds(pace: string): number | null {
  const trimmed = pace.trim()
  if (!trimmed) return null

  if (trimmed.includes(":")) {
    const parts = trimmed.split(":").map((p) => parseFloat(p.trim()))
    if (parts.length !== 2 || parts.some((p) => !Number.isFinite(p) || p < 0)) {
      return null
    }
    const [minutes, seconds] = parts
    if (seconds >= 60) return null
    return minutes * 60 + seconds
  }

  const n = parseFloat(trimmed)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Convert segment pace (seconds per segmentMeters) to min/km formatted string. */
export function segmentPaceToKmPace(
  paceSeconds: number,
  segmentMeters: number
): string | null {
  return buildPaceMetricsFromSegment(paceSeconds, segmentMeters)?.pacePerKm ?? null
}

export function buildPaceMetricsFromSegment(
  paceSeconds: number,
  segmentMeters: number
): PaceMetrics | null {
  if (paceSeconds <= 0 || segmentMeters <= 0) return null
  const paceMinPerKm = (paceSeconds / segmentMeters) * (1000 / 60)
  return buildPaceMetricsFromMinPerKm(paceMinPerKm)
}

/** Resolve selectOrCustom distance field to meters. */
export function resolveDistanceMeters(
  fieldId: string,
  fields: Record<string, string>
): number | null {
  const mode = fields[`${fieldId}Mode`]
  const custom =
    typeof fields[`${fieldId}Custom`] === "string"
      ? fields[`${fieldId}Custom`].trim()
      : ""

  if (mode === "custom") {
    if (!custom) return null
    const n = parseFloat(custom.replace(/,/g, ""))
    if (!Number.isFinite(n) || n < 0) return null
    const unit = fields[`${fieldId}CustomUnit`] || "m"
    return unit === "km" ? n * 1000 : n
  }

  const preset =
    typeof fields[fieldId] === "string" ? fields[fieldId].trim() : ""
  if (!preset) return null
  const n = parseFloat(preset)
  return Number.isFinite(n) && n >= 0 ? n : null
}

export interface IntervalSessionPaceInput {
  reps: string
  sets: string
  intervalPace: string
  intervalDistanceM: number | null
  recoveryDistanceM: number | null
  recoveryTime: string
}

/** Weighted average min/km across interval + recovery repeats. */
export function estimateIntervalSessionKmPace(
  input: IntervalSessionPaceInput
): string | null {
  return estimateIntervalSessionPaceMetrics(input)?.pacePerKm ?? null
}

export function estimateIntervalSessionPaceMetrics(
  input: IntervalSessionPaceInput
): PaceMetrics | null {
  const reps = parseFloat(input.reps)
  const setCount = parseFloat(input.sets)
  const repsPerSet = Number.isFinite(reps) && reps > 0 ? reps : 1
  if (!Number.isFinite(setCount) || setCount <= 0) return null
  const totalRepeats = repsPerSet * setCount

  const intervalM = input.intervalDistanceM
  const intervalSec = parsePaceToSeconds(input.intervalPace)
  if (!intervalM || intervalM <= 0 || !intervalSec) return null

  const recoveryM = input.recoveryDistanceM ?? 0
  const recoverySec = parsePaceToSeconds(input.recoveryTime)

  if (recoverySec === null || recoverySec <= 0) return null

  const totalMeters = totalRepeats * (intervalM + recoveryM)
  const totalSeconds = totalRepeats * (intervalSec + recoverySec)
  if (totalMeters <= 0 || totalSeconds <= 0) return null

  return buildPaceMetricsFromSegment(totalSeconds, totalMeters)
}
