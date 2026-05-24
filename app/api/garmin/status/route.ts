import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import {
  fetchGarminWeeklyDistance,
  getGarminServerStatus,
} from "@/lib/garmin/server"
import { readGarminAccessTokens } from "@/lib/garmin/cookies"

export async function GET() {
  const status = getGarminServerStatus()
  const cookieStore = await cookies()
  const tokens = readGarminAccessTokens(cookieStore)
  const connected = Boolean(tokens)

  if (!connected) {
    return NextResponse.json({
      configured: status.configured,
      connected: false,
      weekly: null,
    })
  }

  try {
    const weekly = await fetchGarminWeeklyDistance(tokens!)
    return NextResponse.json({
      configured: status.configured,
      connected: true,
      weekly: {
        ...weekly,
        connected: true,
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Garmin 동기화에 실패했습니다"
    return NextResponse.json({
      configured: status.configured,
      connected: true,
      weekly: null,
      error: message,
    })
  }
}
