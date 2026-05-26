"use client"

import { useEffect, useRef } from "react"
import {
  createNaverMarkerIcon,
  createNaverPickMarkerIcon,
  loadNaverMapsScript,
} from "@/lib/naver-maps"
import type { MapCoordinates } from "@/lib/map-geocoding"

export interface MapPickLabel {
  name?: string
  address?: string
  loading?: boolean
}

function coordsKey(coords: MapCoordinates): string {
  return `${coords.lat.toFixed(6)}|${coords.lng.toFixed(6)}`
}

export function NaverAddressMapPicker({
  center,
  pickedMarker,
  previewMarker = null,
  pickLabel = null,
  flyTo = null,
  onFlew,
  onPick,
}: {
  center: MapCoordinates
  pickedMarker: MapCoordinates | null
  previewMarker?: MapCoordinates | null
  pickLabel?: MapPickLabel | null
  flyTo?: MapCoordinates | null
  onFlew?: () => void
  onPick: (coords: MapCoordinates) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<InstanceType<NonNullable<typeof window.naver>["maps"]["Map"]> | null>(
    null
  )
  const pickedMarkerRef = useRef<InstanceType<
    NonNullable<typeof window.naver>["maps"]["Marker"]
  > | null>(null)
  const previewMarkerRef = useRef<InstanceType<
    NonNullable<typeof window.naver>["maps"]["Marker"]
  > | null>(null)
  const onPickRef = useRef(onPick)
  const lastPickedKeyRef = useRef<string | null>(null)
  const lastPreviewKeyRef = useRef<string | null>(null)
  const initialCenterRef = useRef(center)
  const flyToRef = useRef(flyTo)
  const onFlewRef = useRef(onFlew)

  useEffect(() => {
    flyToRef.current = flyTo
  }, [flyTo])

  useEffect(() => {
    onFlewRef.current = onFlew
  }, [onFlew])

  useEffect(() => {
    onPickRef.current = onPick
  }, [onPick])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    let cancelled = false
    let resizeObserver: ResizeObserver | null = null

    loadNaverMapsScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.naver?.maps) return

        const { naver } = window
        const init = initialCenterRef.current
        const map = new naver.maps.Map(containerRef.current, {
          center: new naver.maps.LatLng(init.lat, init.lng),
          zoom: 16,
          zoomControl: true,
          zoomControlOptions: {
            position: naver.maps.Position.TOP_RIGHT,
          },
        })

        naver.maps.Event.addListener(map, "click", (e) => {
          onPickRef.current({ lat: e.coord.lat(), lng: e.coord.lng() })
        })

        mapRef.current = map

        resizeObserver = new ResizeObserver(() => {
          ;(map as unknown as { autoResize?: () => void }).autoResize?.()
        })
        resizeObserver.observe(containerRef.current)
      })
      .catch(() => {
        /* handled by parent */
      })

    return () => {
      cancelled = true
      resizeObserver?.disconnect()
      pickedMarkerRef.current?.setMap(null)
      pickedMarkerRef.current = null
      previewMarkerRef.current?.setMap(null)
      previewMarkerRef.current = null
      mapRef.current = null
      lastPickedKeyRef.current = null
      lastPreviewKeyRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const naver = window.naver
    if (!map || !naver?.maps) return

    if (!pickedMarker) {
      pickedMarkerRef.current?.setMap(null)
      pickedMarkerRef.current = null
      lastPickedKeyRef.current = null
      return
    }

    const pos = new naver.maps.LatLng(pickedMarker.lat, pickedMarker.lng)
    const icon = createNaverPickMarkerIcon({
      name: pickLabel?.name,
      address: pickLabel?.address,
      loading: pickLabel?.loading,
    })

    const key = coordsKey(pickedMarker)

    if (pickedMarkerRef.current) {
      pickedMarkerRef.current.setPosition(pos)
      pickedMarkerRef.current.setIcon?.(icon)
    } else {
      pickedMarkerRef.current = new naver.maps.Marker({
        position: pos,
        map,
        icon,
        zIndex: 200,
      })
    }

    lastPickedKeyRef.current = key
  }, [
    pickedMarker?.lat,
    pickedMarker?.lng,
    pickLabel?.name,
    pickLabel?.address,
    pickLabel?.loading,
  ])

  useEffect(() => {
    const map = mapRef.current
    const naver = window.naver
    const target = flyToRef.current
    if (!map || !naver?.maps || !target) return

    map.panTo(new naver.maps.LatLng(target.lat, target.lng))
    onFlewRef.current?.()
  }, [flyTo?.lat, flyTo?.lng])

  useEffect(() => {
    const map = mapRef.current
    const naver = window.naver
    if (!map || !naver?.maps) return

    if (!previewMarker) {
      previewMarkerRef.current?.setMap(null)
      previewMarkerRef.current = null
      lastPreviewKeyRef.current = null
      return
    }

    const pos = new naver.maps.LatLng(previewMarker.lat, previewMarker.lng)
    const icon = createNaverMarkerIcon(true)
    const key = coordsKey(previewMarker)

    if (previewMarkerRef.current) {
      previewMarkerRef.current.setPosition(pos)
      previewMarkerRef.current.setIcon?.(icon)
    } else {
      previewMarkerRef.current = new naver.maps.Marker({
        position: pos,
        map,
        icon,
        zIndex: 100,
      })
    }

    if (!pickedMarker && lastPreviewKeyRef.current !== key) {
      lastPreviewKeyRef.current = key
      map.panTo(pos)
    }
  }, [previewMarker?.lat, previewMarker?.lng, pickedMarker])

  return (
    <div className="relative h-full w-full bg-[#eef0f3]">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-[400] rounded-lg bg-white/90 px-2.5 py-1.5 text-[10px] text-[#333] text-center shadow-sm">
        네이버 지도 · 탭하면 해당 위치 주소를 가져옵니다
      </div>
    </div>
  )
}
