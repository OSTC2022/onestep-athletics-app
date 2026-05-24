import type { RaceEvent } from "@/lib/race-schedule"

export function buildRaceShareUrl(race: RaceEvent): string {
  const path = `/competitions?race=${encodeURIComponent(race.id)}`
  if (typeof window === "undefined") return path
  return `${window.location.origin}${path}`
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      const ok = document.execCommand("copy")
      document.body.removeChild(textarea)
      return ok
    } catch {
      return false
    }
  }
}

export async function copyRaceShareLink(race: RaceEvent): Promise<boolean> {
  return copyTextToClipboard(buildRaceShareUrl(race))
}
