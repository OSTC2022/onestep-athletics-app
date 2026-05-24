import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { exchangeGarminAccessToken } from "@/lib/garmin/server"
import {
  clearGarminCookies,
  readGarminRequestTokens,
  setGarminAccessTokenCookies,
} from "@/lib/garmin/cookies"
import { getAppBaseUrl } from "@/lib/garmin/config"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const verifier = url.searchParams.get("oauth_verifier")
  const oauthToken = url.searchParams.get("oauth_token")
  const homeUrl = new URL("/", getAppBaseUrl())

  if (!verifier || !oauthToken) {
    homeUrl.searchParams.set("garmin", "callback-missing-params")
    return NextResponse.redirect(homeUrl)
  }

  const cookieStore = await cookies()
  const requestTokens = readGarminRequestTokens(cookieStore)
  if (!requestTokens || requestTokens.oauthToken !== oauthToken) {
    homeUrl.searchParams.set("garmin", "callback-token-mismatch")
    return NextResponse.redirect(homeUrl)
  }

  try {
    const accessTokens = await exchangeGarminAccessToken(
      requestTokens.oauthToken,
      requestTokens.oauthTokenSecret,
      verifier
    )
    homeUrl.searchParams.set("garmin", "connected")
    const response = NextResponse.redirect(homeUrl)
    clearGarminCookies(response)
    setGarminAccessTokenCookies(response, accessTokens)
    return response
  } catch (error) {
    homeUrl.searchParams.set(
      "garmin",
      error instanceof Error ? error.message : "callback-failed"
    )
    const response = NextResponse.redirect(homeUrl)
    clearGarminCookies(response)
    return response
  }
}
