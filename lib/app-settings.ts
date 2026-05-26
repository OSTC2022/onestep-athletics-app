export interface AppSettings {
  pushNotifications: boolean
  weeklyReportReminder: boolean
  trainingReminder: boolean
  useMetricUnits: boolean
}

export const APP_SETTINGS_EVENT = "app-settings-updated"

const STORAGE_KEY = "one-step-coach-app-settings"

export const DEFAULT_APP_SETTINGS: AppSettings = {
  pushNotifications: true,
  weeklyReportReminder: true,
  trainingReminder: true,
  useMetricUnits: true,
}

function notifyChange(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(APP_SETTINGS_EVENT))
}

export function loadAppSettings(): AppSettings {
  if (typeof window === "undefined") return { ...DEFAULT_APP_SETTINGS }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_APP_SETTINGS }
    return { ...DEFAULT_APP_SETTINGS, ...(JSON.parse(raw) as AppSettings) }
  } catch {
    return { ...DEFAULT_APP_SETTINGS }
  }
}

export function saveAppSettings(settings: AppSettings): AppSettings {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    notifyChange()
  }
  return settings
}

export function logoutUser(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem("one-step-coach-user-profile")
  localStorage.removeItem("one-step-coach-nutrition-meals")
  localStorage.removeItem("one-step-coach-attendance")
  localStorage.removeItem("one-step-coach-daily-checklist")
  localStorage.removeItem("one-step-coach-daily-checkins")
  localStorage.removeItem("one-step-coach-weight-log")
  localStorage.removeItem("one-step-coach-meal-menu-selection")
  localStorage.removeItem("one-step-coach-daily-food-log")
  window.location.href = "/"
}
