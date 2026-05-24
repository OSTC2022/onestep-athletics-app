"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Dumbbell, Trophy, Users, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", icon: Home, label: "홈" },
  { href: "/training", icon: Dumbbell, label: "훈련" },
  { href: "/athletes", icon: Users, label: "선수" },
  { href: "/report", icon: BarChart3, label: "리포트" },
  { href: "/competitions", icon: Trophy, label: "대회" },
]

export function BottomNavigation() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-bottom">
      <div className="max-w-md mx-auto flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/" && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 min-w-0 h-full transition-colors",
                isActive 
                  ? "text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-accent")} />
              <span className="text-[9px] font-medium truncate w-full text-center">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
