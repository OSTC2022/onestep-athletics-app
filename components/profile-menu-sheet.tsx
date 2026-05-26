"use client"

import type { CSSProperties } from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Apple,
  LogOut,
  Settings,
  Target,
  User,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { logoutUser } from "@/lib/app-settings"
import {
  DEFAULT_USER_PROFILE,
  USER_PROFILE_EVENT,
  getProfileInitials,
  loadUserProfile,
} from "@/lib/user-profile"
import { cn } from "@/lib/utils"

const MENU_ITEMS = [
  {
    id: "profile",
    label: "내 정보",
    href: "/settings?section=profile",
    icon: User,
  },
  {
    id: "goals",
    label: "목표 설정",
    href: "/settings?section=goals",
    icon: Target,
  },
  {
    id: "nutrition",
    label: "영양 설정",
    href: "/settings?section=nutrition",
    icon: Apple,
  },
  {
    id: "app",
    label: "앱 설정",
    href: "/settings?section=app",
    icon: Settings,
  },
] as const

export function ProfileMenu({
  triggerClassName,
  triggerStyle,
}: {
  triggerClassName?: string
  triggerStyle?: CSSProperties
}) {
  const router = useRouter()
  const [profileName, setProfileName] = useState(DEFAULT_USER_PROFILE.name)

  useEffect(() => {
    const syncProfile = () => setProfileName(loadUserProfile().name)
    syncProfile()
    window.addEventListener(USER_PROFILE_EVENT, syncProfile)
    return () => window.removeEventListener(USER_PROFILE_EVENT, syncProfile)
  }, [])

  const initials = getProfileInitials(profileName)
  const displayName = profileName.trim() || DEFAULT_USER_PROFILE.name

  const handleLogout = () => {
    if (window.confirm("로그아웃 하시겠습니까?")) {
      logoutUser()
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center transition-opacity outline-none",
            "active:opacity-70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            triggerClassName
          )}
          style={triggerStyle}
          aria-label={`${displayName} 프로필 메뉴`}
        >
          <span
            className={cn(
              "font-semibold leading-none",
              initials.length > 2 ? "text-[10px]" : "text-[12px]"
            )}
          >
            {initials}
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="w-[168px] rounded-xl border-border bg-card p-1.5 shadow-lg"
      >
        <DropdownMenuLabel className="px-2.5 py-1.5 text-[13px] font-semibold">
          {displayName}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1" />

        {MENU_ITEMS.map((item) => (
          <DropdownMenuItem
            key={item.id}
            className="gap-2 rounded-lg px-2.5 py-2 text-[13px] cursor-pointer"
            onSelect={() => router.push(item.href)}
          >
            <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
            {item.label}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator className="my-1" />

        <DropdownMenuItem
          variant="destructive"
          className="gap-2 rounded-lg px-2.5 py-2 text-[13px] cursor-pointer"
          onSelect={handleLogout}
        >
          <LogOut className="h-3.5 w-3.5" />
          로그아웃
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1" />

        <DropdownMenuItem asChild className="p-0">
          <Link
            href="/settings"
            className="block w-full rounded-lg px-2.5 py-1.5 text-center text-[11px] text-muted-foreground hover:text-foreground"
          >
            전체 설정 보기
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
