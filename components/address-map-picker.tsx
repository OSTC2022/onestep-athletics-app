"use client"

import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { MapCoordinates } from "@/lib/map-geocoding"

const ACCENT = "#64b869"

/** 밝은 일반 도로 지도 (공원·도로·건물 표시) */
const ROADMAP_TILES =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"

function createMarkerIcon(dimmed: boolean) {
  const opacity = dimmed ? 0.55 : 1
  const size = dimmed ? 14 : 18
  const anchor = size / 2
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${ACCENT};border:2px solid #fff;box-shadow:0 0 12px ${ACCENT};opacity:${opacity}"></div>`,
    iconSize: [size, size],
    iconAnchor: [anchor, anchor],
  })
}

export function AddressMapPicker({
  center,
  marker,
  onPick,
  markerDimmed = false,
}: {
  center: MapCoordinates
  marker: MapCoordinates | null
  onPick: (coords: MapCoordinates) => void
  /** hover 미리보기 마커일 때 약하게 표시 */
  markerDimmed?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const onPickRef = useRef(onPick)

  useEffect(() => {
    onPickRef.current = onPick
  }, [onPick])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom: 16,
      zoomControl: true,
    })

    L.tileLayer(ROADMAP_TILES, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map)

    map.on("click", (e) => {
      onPickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng })
    })

    mapRef.current = map

    const ro = new ResizeObserver(() => {
      map.invalidateSize()
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      markerRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [center.lat, center.lng])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (!marker) {
      markerRef.current?.remove()
      markerRef.current = null
      return
    }

    const pos: L.LatLngExpression = [marker.lat, marker.lng]
    if (markerRef.current) {
      markerRef.current.setLatLng(pos)
      markerRef.current.setIcon(createMarkerIcon(markerDimmed))
    } else {
      markerRef.current = L.marker(pos, {
        icon: createMarkerIcon(markerDimmed),
      }).addTo(map)
    }
    map.setView(pos, map.getZoom(), { animate: true })
  }, [marker, markerDimmed])

  useEffect(() => {
    const map = mapRef.current
    if (!map || marker) return
    map.setView([center.lat, center.lng], map.getZoom(), { animate: true })
  }, [center, marker])

  return (
    <div className="relative h-full w-full bg-[#eef0f3]">
      <div ref={containerRef} className="h-full w-full z-0" />
      <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-[400] rounded-lg bg-white/90 px-2.5 py-1.5 text-[10px] text-[#333] text-center shadow-sm">
        탭하면 해당 위치 주소를 가져옵니다
      </div>
    </div>
  )
}
