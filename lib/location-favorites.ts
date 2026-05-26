/** Supabase `location_favorites` 테이블 연동 예정 */
export interface LocationFavoriteRecord {
  id: string
  name: string
  address: string
  created_at: string
  updated_at: string
}

export interface LocationFavorite {
  id: string
  name: string
  address: string
  createdAt: string
  updatedAt: string
}

export const LOCATION_FAVORITES_EVENT = "location-favorites-updated"

const STORAGE_KEY = "one-step-coach-location-favorites"

function nowIso(): string {
  return new Date().toISOString()
}

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `loc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function notifyChange(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(LOCATION_FAVORITES_EVENT))
}

export function toLocationFavoriteRecord(
  favorite: LocationFavorite
): LocationFavoriteRecord {
  return {
    id: favorite.id,
    name: favorite.name,
    address: favorite.address,
    created_at: favorite.createdAt,
    updated_at: favorite.updatedAt,
  }
}

export function fromLocationFavoriteRecord(
  record: LocationFavoriteRecord
): LocationFavorite {
  return {
    id: record.id,
    name: record.name,
    address: record.address,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }
}

function normalizeFavorite(raw: unknown): LocationFavorite | null {
  if (!raw || typeof raw !== "object") return null
  const item = raw as Partial<LocationFavoriteRecord & LocationFavorite>
  const name = (item.name ?? "").trim()
  if (!name) return null
  const id = item.id ?? generateId()
  const address = (item.address ?? "").trim()
  const createdAt = item.created_at ?? item.createdAt ?? nowIso()
  const updatedAt = item.updated_at ?? item.updatedAt ?? createdAt
  return { id, name, address, createdAt, updatedAt }
}

function readAll(): LocationFavorite[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(normalizeFavorite)
      .filter((f): f is LocationFavorite => f !== null)
      .sort((a, b) => a.name.localeCompare(b.name, "ko"))
  } catch {
    return []
  }
}

function writeAll(favorites: LocationFavorite[]): LocationFavorite[] {
  const records = favorites.map(toLocationFavoriteRecord)
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
    notifyChange()
  }
  return favorites
}

export function loadLocationFavorites(): LocationFavorite[] {
  return readAll()
}

function favoriteKey(name: string, address: string): string {
  return `${name.trim().toLowerCase()}|${address.trim().toLowerCase()}`
}

export function saveLocationFavorite(
  name: string,
  address: string
): LocationFavorite {
  const trimmedName = name.trim()
  const trimmedAddress = address.trim()
  if (!trimmedName) {
    throw new Error("장소명을 입력해 주세요.")
  }

  const key = favoriteKey(trimmedName, trimmedAddress)
  const all = readAll()
  const existing = all.find(
    (f) => favoriteKey(f.name, f.address) === key
  )

  if (existing) {
    const updated: LocationFavorite = {
      ...existing,
      name: trimmedName,
      address: trimmedAddress,
      updatedAt: nowIso(),
    }
    writeAll(all.map((f) => (f.id === existing.id ? updated : f)))
    return updated
  }

  const created: LocationFavorite = {
    id: generateId(),
    name: trimmedName,
    address: trimmedAddress,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  writeAll([...all, created])
  return created
}

export function deleteLocationFavorite(id: string): void {
  writeAll(readAll().filter((f) => f.id !== id))
}

export function locationFavoriteToTrainingLocation(
  favorite: LocationFavorite
): { name: string; address?: string } {
  return {
    name: favorite.name,
    address: favorite.address || undefined,
  }
}
