import { NextResponse } from "next/server"
import { clearGarminCookies } from "@/lib/garmin/cookies"

export async function POST() {
  const response = NextResponse.json({ ok: true })
  clearGarminCookies(response)
  return response
}
