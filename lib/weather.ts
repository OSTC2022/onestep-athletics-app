export interface WeatherLocation {
  name: string
  admin1?: string
  latitude: number
  longitude: number
}

export interface WeatherCurrent {
  temperature: number
  apparentTemperature: number
  humidity: number
  windSpeed: number
  weatherCode: number
  time: string
}

export interface WeatherHourly {
  time: string
  temperature: number
  weatherCode: number
  precipitationProbability: number
  windSpeed: number
}

export interface WeatherData {
  location: WeatherLocation
  current: WeatherCurrent
  hourly: WeatherHourly[]
  timezone: string
}

const LOCATION_CACHE_KEY = "one-step-coach-location"

export function getCachedLocation(): { latitude: number; longitude: number } | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(LOCATION_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as { latitude: number; longitude: number }
  } catch {
    return null
  }
}

function cacheLocation(latitude: number, longitude: number): void {
  localStorage.setItem(
    LOCATION_CACHE_KEY,
    JSON.stringify({ latitude, longitude })
  )
}

export function requestUserLocation(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("이 브라우저는 위치 서비스를 지원하지 않습니다."))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        cacheLocation(latitude, longitude)
        resolve({ latitude, longitude })
      },
      (err) => {
        const cached = getCachedLocation()
        if (cached) {
          resolve(cached)
          return
        }
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error("위치 권한이 필요합니다. 브라우저 설정에서 허용해 주세요."))
          return
        }
        reject(new Error("현재 위치를 가져올 수 없습니다."))
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 }
    )
  })
}

async function fetchLocationName(
  latitude: number,
  longitude: number
): Promise<WeatherLocation> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    language: "ko",
  })
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/reverse?${params}`
  )
  if (!res.ok) throw new Error("위치 이름을 불러오지 못했습니다.")

  const data = (await res.json()) as {
    results?: Array<{ name: string; admin1?: string }>
  }

  const place = data.results?.[0]
  return {
    latitude,
    longitude,
    name: place?.name ?? "현재 위치",
    admin1: place?.admin1,
  }
}

export async function fetchWeather(
  latitude: number,
  longitude: number
): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
    hourly:
      "temperature_2m,weather_code,precipitation_probability,wind_speed_10m",
    timezone: "auto",
    forecast_days: "2",
    wind_speed_unit: "kmh",
  })

  const [forecastRes, location] = await Promise.all([
    fetch(`https://api.open-meteo.com/v1/forecast?${params}`),
    fetchLocationName(latitude, longitude),
  ])

  if (!forecastRes.ok) throw new Error("날씨 정보를 불러오지 못했습니다.")

  const forecast = (await forecastRes.json()) as {
    timezone: string
    current: {
      time: string
      temperature_2m: number
      relative_humidity_2m: number
      apparent_temperature: number
      weather_code: number
      wind_speed_10m: number
    }
    hourly: {
      time: string[]
      temperature_2m: number[]
      weather_code: number[]
      precipitation_probability: number[]
      wind_speed_10m: number[]
    }
  }

  const now = Date.now()
  const hourly: WeatherHourly[] = forecast.hourly.time
    .map((time, i) => ({
      time,
      temperature: Math.round(forecast.hourly.temperature_2m[i]),
      weatherCode: forecast.hourly.weather_code[i],
      precipitationProbability: forecast.hourly.precipitation_probability[i] ?? 0,
      windSpeed: Math.round(forecast.hourly.wind_speed_10m[i] ?? 0),
    }))
    .filter((h) => new Date(h.time).getTime() >= now - 3600000)
    .slice(0, 24)

  return {
    location,
    timezone: forecast.timezone,
    current: {
      time: forecast.current.time,
      temperature: Math.round(forecast.current.temperature_2m),
      apparentTemperature: Math.round(forecast.current.apparent_temperature),
      humidity: forecast.current.relative_humidity_2m,
      windSpeed: Math.round(forecast.current.wind_speed_10m),
      weatherCode: forecast.current.weather_code,
    },
    hourly,
  }
}

export function getWeatherLabel(code: number): string {
  if (code === 0) return "맑음"
  if (code <= 3) return "구름"
  if (code === 45 || code === 48) return "안개"
  if (code >= 51 && code <= 57) return "이슬비"
  if (code >= 61 && code <= 67) return "비"
  if (code >= 71 && code <= 77) return "눈"
  if (code >= 80 && code <= 82) return "소나기"
  if (code >= 85 && code <= 86) return "눈"
  if (code >= 95) return "뇌우"
  return "흐림"
}

export function formatHourLabel(isoTime: string): string {
  const date = new Date(isoTime)
  const now = new Date()
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  const time = date.toLocaleTimeString("ko-KR", {
    hour: "numeric",
    hour12: true,
  })

  if (
    isToday &&
    date.getHours() === now.getHours() &&
    Math.abs(date.getTime() - now.getTime()) < 3600000
  ) {
    return "지금"
  }

  return time
}

export function formatLocationLabel(location: WeatherLocation): string {
  if (location.admin1 && location.admin1 !== location.name) {
    return `${location.name} · ${location.admin1}`
  }
  return location.name
}
