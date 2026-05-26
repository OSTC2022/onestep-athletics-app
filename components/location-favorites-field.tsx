"use client"

import { MapPin, Star, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  deleteLocationFavorite,
  locationFavoriteToTrainingLocation,
  saveLocationFavorite,
  type LocationFavorite,
} from "@/lib/location-favorites"
import { useLocationFavorites } from "@/hooks/use-location-favorites"
import { cn } from "@/lib/utils"

export function LocationFavoritesField({
  name,
  address,
  onSelect,
}: {
  name: string
  address: string
  onSelect: (location: { name: string; address?: string }) => void
}) {
  const favorites = useLocationFavorites()
  const canSave = name.trim().length > 0

  const handleSave = () => {
    if (!canSave) return
    try {
      saveLocationFavorite(name, address)
      toast.success("장소를 즐겨찾기에 저장했습니다")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장에 실패했습니다")
    }
  }

  const handleSelect = (favorite: LocationFavorite) => {
    onSelect(locationFavoriteToTrainingLocation(favorite))
    toast.success(`「${favorite.name}」 장소를 불러왔습니다`)
  }

  const isSaved = favorites.some(
    (f) =>
      f.name.trim() === name.trim() &&
      f.address.trim() === address.trim()
  )

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">장소 즐겨찾기</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!canSave}
          onClick={handleSave}
          className={cn(
            "h-7 px-2 text-[11px] gap-1",
            isSaved ? "text-accent" : "text-muted-foreground"
          )}
        >
          <Star className={cn("h-3.5 w-3.5", isSaved && "fill-accent")} />
          {isSaved ? "저장됨" : "즐겨찾기 저장"}
        </Button>
      </div>

      {favorites.length === 0 ? (
        <p className="text-[11px] text-muted-foreground/80 rounded-lg border border-dashed border-border/50 px-3 py-2.5">
          자주 쓰는 장소명·주소를 저장해 두면 다음에 빠르게 불러올 수 있습니다.
        </p>
      ) : (
        <ul className="space-y-1.5 max-h-[180px] overflow-y-auto">
          {favorites.map((favorite) => (
            <li key={favorite.id} className="flex items-stretch gap-1">
              <button
                type="button"
                onClick={() => handleSelect(favorite)}
                className="flex-1 min-w-0 flex items-start gap-2 rounded-xl border border-border/50 bg-black/40 px-3 py-2.5 text-left active:bg-accent/10 transition-colors"
              >
                <MapPin className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">{favorite.name}</p>
                  {favorite.address ? (
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {favorite.address}
                    </p>
                  ) : null}
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteLocationFavorite(favorite.id)
                  toast.success("즐겨찾기에서 삭제했습니다")
                }}
                className="shrink-0 w-10 rounded-xl border border-border/50 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                aria-label={`${favorite.name} 즐겨찾기 삭제`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
