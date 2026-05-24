"use client"

import { Toaster } from "sonner"
import { BottomNavigation } from "./bottom-navigation"

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-black">
      <main className="max-w-md mx-auto pb-[calc(4.25rem+env(safe-area-inset-bottom,0px)+0.5rem)]">
        {children}
      </main>
      <BottomNavigation />
      <Toaster theme="dark" position="top-center" richColors closeButton />
    </div>
  )
}
