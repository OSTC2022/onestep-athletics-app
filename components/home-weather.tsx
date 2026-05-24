"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Loader2,
  MapPin,
  Sun,
  Wind,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  fetchWeather,
  formatHourLabel,
  formatLocationLabel,
  getWeatherLabel,
  requestUserLocation,
  type WeatherData,
} from "@/lib/weather"

function WeatherIcon({
  code,
  className,
}: {
  code: number
  className?: string
}) {
  const props = { className: cn("shrink-0", className) }

  if (code === 0) return <Sun {...props} />
  if (code <= 3) return <CloudSun {...props} />
  if (code === 45 || code === 48) return <CloudFog {...props} />
  if (code >= 51 && code <= 57) return <CloudDrizzle {...props} />
  if (code >= 61 && code <= 67) return <CloudRain {...props} />
  if (code >= 71 && code <= 77) return <CloudSnow {...props} />
  if (code >= 80 && code <= 86) return <CloudRain {...props} />
  if (code >= 95) return <CloudLightning {...props} />
  return <Cloud {...props} />
}

function WeatherBadgeContent({
  weather,
  compact = false,
}: {
  weather: WeatherData
  compact?: boolean
}) {
  const label = getWeatherLabel(weather.current.weatherCode)

  return (
    <>
      <WeatherIcon
        code={weather.current.weatherCode}
        className={cn(
          "text-accent",
          compact ? "h-3.5 w-3.5" : "h-5 w-5"
        )}
      />
      <span className="font-semibold tabular-nums text-foreground">
        {weather.current.temperature}°
      </span>
      <span className="text-muted-foreground truncate max-w-[4.5rem] sm:max-w-none">
        {label}
      </span>
    </>
  )
}

export function HomeWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const loadWeather = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const coords = await requestUserLocation()
      const data = await fetchWeather(coords.latitude, coords.longitude)
      setWeather(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "날씨를 불러오지 못했습니다.")
      setWeather(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWeather()
  }, [loadWeather])

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        날씨
      </span>
    )
  }

  if (error || !weather) {
    return (
      <button
        type="button"
        onClick={loadWeather}
        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        title={error ?? undefined}
      >
        <MapPin className="h-3 w-3 shrink-0" />
        <span className="truncate max-w-[7rem]">{error ?? "날씨 불러오기"}</span>
      </button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 -mx-1.5 text-[11px] hover:bg-secondary/60 transition-colors min-w-0"
          aria-label="날씨 상세 보기"
        >
          <WeatherBadgeContent weather={weather} compact />
        </button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60">
          <DialogTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-accent shrink-0" />
            <span className="truncate">{formatLocationLabel(weather.location)}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">
          {/* Current */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-14 w-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                <WeatherIcon
                  code={weather.current.weatherCode}
                  className="h-7 w-7 text-accent"
                />
              </div>
              <div className="min-w-0">
                <p className="text-3xl font-bold tabular-nums leading-none">
                  {weather.current.temperature}
                  <span className="text-lg font-normal text-muted-foreground">°</span>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {getWeatherLabel(weather.current.weatherCode)}
                </p>
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground space-y-1 shrink-0">
              <p>체감 {weather.current.apparentTemperature}°</p>
              <p>습도 {weather.current.humidity}%</p>
              <p className="inline-flex items-center gap-1 justify-end">
                <Wind className="h-3 w-3" />
                {weather.current.windSpeed} km/h
              </p>
            </div>
          </div>

          {/* Hourly */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              시간대별 예보
            </p>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-2 pb-2 w-max">
                {weather.hourly.map((hour) => (
                  <div
                    key={hour.time}
                    className="shrink-0 w-[4.5rem] rounded-xl border border-border/60 bg-secondary/30 px-2 py-2.5 text-center"
                  >
                    <p className="text-[10px] text-muted-foreground mb-1.5">
                      {formatHourLabel(hour.time)}
                    </p>
                    <WeatherIcon
                      code={hour.weatherCode}
                      className="h-4 w-4 text-accent mx-auto mb-1.5"
                    />
                    <p className="text-sm font-semibold tabular-nums">
                      {hour.temperature}°
                    </p>
                    {hour.precipitationProbability > 0 && (
                      <p className="text-[9px] text-sky-400/90 mt-0.5 tabular-nums">
                        {hour.precipitationProbability}%
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

          <p className="text-[10px] text-muted-foreground/80 text-center">
            Open-Meteo · 내 위치 기준 · 탭하여 닫기
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
