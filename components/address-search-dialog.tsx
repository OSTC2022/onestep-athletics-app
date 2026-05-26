"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { MapPin, Search } from "lucide-react"
import { toast } from "sonner"
import { NaverAddressMapPicker } from "@/components/naver-address-map-picker"
import {
  NaverAddressSearchPanel,
  hitToAddressResult,
  type AddressSearchHit,
} from "@/components/address-search-panel"
import { POSTCODE_PANEL_HEIGHT } from "@/components/address-postcode-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FORM_INPUT_CLASS } from "@/lib/form-styles"
import type { AddressSearchResult } from "@/lib/kakao-postcode"
import {
  DEFAULT_MAP_CENTER,
  forwardGeocodeAddress,
  mergeAddressPreview,
  reverseGeocodeCoordinates,
  type MapCoordinates,
} from "@/lib/map-geocoding"
import { isNaverMapConfigured } from "@/lib/naver-maps"

export function AddressSearchDialog({
  open,
  onOpenChange,
  onSelect,
  initialPreview,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (result: AddressSearchResult) => void
  initialPreview?: Partial<AddressSearchResult> | null
}) {
  const onSelectRef = useRef(onSelect)
  const initialPreviewRef = useRef(initialPreview)

  const [mapLoading, setMapLoading] = useState(false)
  const [preview, setPreview] = useState<AddressSearchResult | null>(null)
  const [marker, setMarker] = useState<MapCoordinates | null>(null)
  const [hoverMarker, setHoverMarker] = useState<MapCoordinates | null>(null)
  const [mapCenter, setMapCenter] = useState<MapCoordinates>(DEFAULT_MAP_CENTER)
  const [mapFlyTo, setMapFlyTo] = useState<MapCoordinates | null>(null)
  const naverMapReady = isNaverMapConfigured()

  useEffect(() => {
    initialPreviewRef.current = initialPreview
  }, [initialPreview])

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  const updatePreview = useCallback(
    (patch: Partial<AddressSearchResult>) => {
      setPreview((prev) => mergeAddressPreview(prev, patch))
    },
    []
  )

  const syncMapFromAddress = useCallback(async (address: string) => {
    const coords = await forwardGeocodeAddress(address)
    if (!coords) return
    setMarker(coords)
    setMapCenter(coords)
    setPreview((prev) =>
      mergeAddressPreview(prev, { lat: coords.lat, lng: coords.lng })
    )
  }, [])

  const handleHoverHit = useCallback((hit: AddressSearchHit) => {
    setHoverMarker({ lat: hit.lat, lng: hit.lng })
  }, [])

  const handleLeaveHit = useCallback(() => {
    setHoverMarker(null)
  }, [])

  const handleSelectHit = useCallback(
    (hit: AddressSearchHit, queryHint: string) => {
      const result = hitToAddressResult(hit, queryHint)
      setPreview(result)
      setHoverMarker(null)

      if (Number.isFinite(hit.lat) && Number.isFinite(hit.lng)) {
        const coords = { lat: hit.lat, lng: hit.lng }
        setMarker(coords)
        setMapFlyTo(coords)
      } else {
        void syncMapFromAddress(result.address)
      }
    },
    [syncMapFromAddress]
  )

  const handleMapPick = useCallback(async (coords: MapCoordinates) => {
    setMarker(coords)
    setHoverMarker(null)
    setPreview({
      name: "",
      address: "",
      zonecode: "",
      lat: coords.lat,
      lng: coords.lng,
    })
    setMapLoading(true)
    try {
      const geo = await reverseGeocodeCoordinates(coords)
      const address = geo.roadAddress?.trim() || geo.address.trim()
      const name = geo.name?.trim() || address.split(" ").slice(-1)[0] || "훈련 장소"

      setPreview({
        name,
        address,
        zonecode: "",
        lat: coords.lat,
        lng: coords.lng,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "주소를 가져오지 못했습니다.")
    } finally {
      setMapLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return

    const init = initialPreviewRef.current

    setPreview(
      init?.address || init?.name
        ? mergeAddressPreview(null, {
            name: init.name ?? "",
            address: init.address ?? "",
            zonecode: init.zonecode ?? "",
            lat: init.lat,
            lng: init.lng,
          })
        : null
    )
    setMarker(
      init?.lat != null && init?.lng != null
        ? { lat: init.lat, lng: init.lng }
        : null
    )
    setHoverMarker(null)
    setMapCenter(
      init?.lat != null && init?.lng != null
        ? { lat: init.lat, lng: init.lng }
        : DEFAULT_MAP_CENTER
    )

    if (init?.address) {
      void syncMapFromAddress(init.address)
    }
  }, [open, syncMapFromAddress])

  const handleConfirm = () => {
    if (!preview?.address?.trim()) {
      toast.error("주소를 검색하거나 지도에서 위치를 선택해 주세요.")
      return
    }
    if (!preview.name?.trim()) {
      toast.error("장소명을 입력해 주세요.")
      return
    }
    onSelectRef.current({
      ...preview,
      name: preview.name.trim(),
      address: preview.address.trim(),
      lat: preview.lat,
      lng: preview.lng,
    })
    onOpenChange(false)
  }

  const mapPickLabel =
    marker && preview
      ? {
          name: preview.name,
          address: preview.address,
          loading: mapLoading,
        }
      : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-card border-border sm:max-w-3xl w-[calc(100vw-1rem)] p-0 gap-0 flex flex-col max-h-[95dvh] overflow-y-auto"
        showCloseButton
      >
        <DialogHeader className="px-4 pt-4 pb-2 border-b border-border/60 shrink-0 bg-card">
          <DialogTitle className="text-base">네이버 지도</DialogTitle>
          <p className="text-[12px] text-muted-foreground font-normal">
            장소·주소를 검색하고 지도에서 위치를 확인하세요
          </p>
        </DialogHeader>

        {!naverMapReady && (
          <div className="mx-4 mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200/90 leading-relaxed">
            .env.local에 NEXT_PUBLIC_NAVER_MAP_CLIENT_ID와 NAVER_MAP_API_KEY를
            설정하면 네이버 지도 검색이 작동합니다.
          </div>
        )}

        <div className="shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-start divide-y lg:divide-y-0 lg:divide-x divide-border/60">
            {open ? (
              <div className="w-full lg:w-1/2 shrink-0">
                <NaverAddressSearchPanel
                  height={POSTCODE_PANEL_HEIGHT}
                  autoFocus={open}
                  disabled={!naverMapReady}
                  searchCenter={mapCenter}
                  onSelectHit={handleSelectHit}
                  onHoverHit={handleHoverHit}
                  onLeaveHit={handleLeaveHit}
                />
              </div>
            ) : null}

            <div
              className="relative w-full lg:w-1/2 shrink-0"
              style={{ height: POSTCODE_PANEL_HEIGHT }}
            >
              {naverMapReady ? (
                <NaverAddressMapPicker
                  center={mapCenter}
                  pickedMarker={marker}
                  previewMarker={hoverMarker}
                  pickLabel={mapPickLabel}
                  flyTo={mapFlyTo}
                  onFlew={() => setMapFlyTo(null)}
                  onPick={handleMapPick}
                />
              ) : (
                <div className="h-full flex items-center justify-center px-4 text-center text-[12px] text-muted-foreground bg-[#eef0f3]">
                  .env.local에 NEXT_PUBLIC_NAVER_MAP_CLIENT_ID와 NAVER_MAP_API_KEY를
                  설정하면 네이버 지도 검색이 작동합니다.
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border/60 px-4 py-3 bg-[#111811] space-y-2.5">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-accent" />
              <p className="text-[11px] text-muted-foreground">선택된 장소 (수정 가능)</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">장소명</Label>
              <Input
                value={preview?.name ?? ""}
                onChange={(e) => updatePreview({ name: e.target.value })}
                placeholder="예: 잠실 보조경기장 트랙"
                className={FORM_INPUT_CLASS}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">주소</Label>
              <Input
                value={preview?.address ?? ""}
                onChange={(e) => updatePreview({ address: e.target.value })}
                placeholder="도로명 또는 지번 주소"
                className={FORM_INPUT_CLASS}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 px-4 py-3 border-t border-border/60 gap-2 sm:gap-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1 bg-[#1a1a1a] hover:bg-[#252525]"
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button
            type="button"
            className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={handleConfirm}
            disabled={!preview?.address?.trim() || !preview?.name?.trim() || mapLoading}
          >
            적용
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AddressSearchButton({
  onSelect,
  className,
  initialPreview,
}: {
  onSelect: (result: AddressSearchResult) => void
  className?: string
  initialPreview?: Partial<AddressSearchResult> | null
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className={className}
      >
        <Search className="h-4 w-4 mr-1.5" />
        네이버 지도 검색
      </Button>
      <AddressSearchDialog
        open={open}
        onOpenChange={setOpen}
        onSelect={onSelect}
        initialPreview={initialPreview}
      />
    </>
  )
}
