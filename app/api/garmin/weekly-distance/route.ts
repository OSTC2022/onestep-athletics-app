import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { fetchGarminWeeklyDistance } from "@/lib/garmin/server"
import { readGarminAccessTokens } from "@/lib/garmin/cookies"

export async function GET() {
  const cookieStore = await cookies()
  const tokens = readGarminAccessTokens(cookieStore)

  if (!tokens) {
    return NextResponse.json(
      { error: "Garmin 계정이 연결되어 있지 않습니다" },
      { status: 401 }
    )
  }

  try {
    const weekly = await fetchGarminWeeklyDistance(tokens)
    return NextResponse.json({
      ...weekly,
      connected: true,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Garmin 주간 거리 동기화에 실패했습니다",
      },
      { status: 502 }
    )
  }
}
