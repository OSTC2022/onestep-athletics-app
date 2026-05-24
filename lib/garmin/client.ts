"use client"

import { formatDistanceKm, getCurrentWeekRange } from "@/lib/garmin/week"

export const GARMIN_UPDATED_EVENT = "garmin-updated"

const CACHE_KEY = "one-step-coach-garmin-weekly"

export interface GarminWeeklyCache {
  weekKey: string
  distanceKm: number
  distanceLabel: string
  activityCount: number
  weekLabel: string
  syncedAt: string
  connected: boolean
}

export interface GarminStatusResponse {
  configured: boolean
  connected: boolean
  weekly?: GarminWeeklyCache | null
  error?: string
}

function notifyGarminChange(): void {
  window.dispatchEvent(new CustomEvent(GARMIN_UPDATED_EVENT))
}

function readCache(): GarminWeeklyCache | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as GarminWeeklyCache
  } catch {
    return null
  }
}

function writeCache(data: GarminWeeklyCache): void {
  if (typeof window === "undefined") return
  localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  notifyGarminChange()
}

export function getCachedGarminWeekly(): GarminWeeklyCache | null {
  const cache = readCache()
  if (!cache) return null
  const currentWeekKey = getCurrentWeekRange().weekKey
  if (cache.weekKey !== currentWeekKey) {
    return { ...cache, distanceKm: 0, distanceLabel: "0", activityCount: 0 }
  }
  return cache
}

export function clearGarminCache(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(CACHE_KEY)
  notifyGarminChange()
}

export async function fetchGarminStatus(): Promise<GarminStatusResponse> {
  const response = await fetch("/api/garmin/status", { cache: "no-store" })
  if (!response.ok) {
    throw new Error("Garmin 상태를 불러오지 못했습니다")
  }
  const data = (await response.json()) as GarminStatusResponse
  if (data.weekly) {
    writeCache(data.weekly)
  }
  return data
}

export async function syncGarminWeeklyDistance(): Promise<GarminWeeklyCache> {
  const response = await fetch("/api/garmin/weekly-distance", {
    cache: "no-store",
  })
  const data = (await response.json()) as GarminWeeklyCache & {
    error?: string
  }
  if (!response.ok) {
    throw new Error(data.error ?? "Garmin 동기화에 실패했습니다")
  }
  const cache: GarminWeeklyCache = {
    weekKey: data.weekKey,
    distanceKm: data.distanceKm,
    distanceLabel: data.distanceLabel ?? formatDistanceKm(data.distanceKm),
    activityCount: data.activityCount,
    weekLabel: data.weekLabel,
    syncedAt: data.syncedAt,
    connected: true,
  }
  writeCache(cache)
  return cache
}

export function startGarminConnect(): void {
  window.location.href = "/api/garmin/oauth/start"
}

export async function disconnectGarmin(): Promise<void> {
  const response = await fetch("/api/garmin/disconnect", { method: "POST" })
  if (!response.ok) {
    throw new Error("Garmin 연결 해제에 실패했습니다")
  }
  clearGarminCache()
}

export function formatSyncedTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
