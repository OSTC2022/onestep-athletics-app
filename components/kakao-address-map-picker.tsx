"use client"

import { useEffect, useRef } from "react"
import {
  createKakaoMarkerHtml,
  KAKAO_MAP_LEVEL,
  loadKakaoMapsScript,
} from "@/lib/kakao-maps"
import type { MapCoordinates } from "@/lib/map-geocoding"

export function KakaoAddressMapPicker({
  center,
  marker,
  onPick,
}: {
  center: MapCoordinates
  marker: MapCoordinates | null
  onPick: (coords: MapCoordinates) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<InstanceType<NonNullable<typeof window.kakao>["maps"]["Map"]> | null>(
    null
  )
  const overlayRef = useRef<InstanceType<
    NonNullable<typeof window.kakao>["maps"]["CustomOverlay"]
  > | null>(null)
  const onPickRef = useRef(onPick)

  useEffect(() => {
    onPickRef.current = onPick
  }, [onPick])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    let cancelled = false
    let resizeObserver: ResizeObserver | null = null

    loadKakaoMapsScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.kakao?.maps) return

        const { kakao } = window
        const map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(center.lat, center.lng),
          level: KAKAO_MAP_LEVEL,
        })

        kakao.maps.event.addListener(map, "click", (e) => {
          onPickRef.current({
            lat: e.latLng.getLat(),
            lng: e.latLng.getLng(),
          })
        })

        mapRef.current = map

        resizeObserver = new ResizeObserver(() => {
          map.relayout()
        })
        resizeObserver.observe(containerRef.current)
      })
      .catch(() => {
        /* handled by parent */
      })

    return () => {
      cancelled = true
      resizeObserver?.disconnect()
      overlayRef.current?.setMap(null)
      overlayRef.current = null
      mapRef.current = null
    }
  }, [center.lat, center.lng])

  useEffect(() => {
    const map = mapRef.current
    const kakao = window.kakao
    if (!map || !kakao?.maps) return

    if (!marker) {
      overlayRef.current?.setMap(null)
      overlayRef.current = null
      return
    }

    const pos = new kakao.maps.LatLng(marker.lat, marker.lng)
    if (overlayRef.current) {
      overlayRef.current.setPosition(pos)
    } else {
      overlayRef.current = new kakao.maps.CustomOverlay({
        position: pos,
        content: createKakaoMarkerHtml(),
        yAnchor: 0.5,
        xAnchor: 0.5,
      })
      overlayRef.current.setMap(map)
    }
    map.setCenter(pos)
  }, [marker])

  useEffect(() => {
    const map = mapRef.current
    const kakao = window.kakao
    if (!map || !kakao?.maps || marker) return
    map.setCenter(new kakao.maps.LatLng(center.lat, center.lng))
  }, [center, marker])

  return (
    <div className="relative h-full w-full bg-[#0a0a0a]">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-[400] rounded-lg bg-black/75 px-2.5 py-1.5 text-[10px] text-muted-foreground text-center">
        카카오맵 · 탭하면 해당 위치 주소를 가져옵니다
      </div>
    </div>
  )
}
