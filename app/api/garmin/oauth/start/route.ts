import { NextResponse } from "next/server"
import {
  createGarminRequestToken,
  getGarminAuthorizeUrl,
  getGarminServerStatus,
} from "@/lib/garmin/server"
import { setGarminRequestTokenCookies } from "@/lib/garmin/cookies"
import { getAppBaseUrl } from "@/lib/garmin/config"

export async function GET() {
  const status = getGarminServerStatus()
  if (!status.configured) {
    const url = new URL("/", getAppBaseUrl())
    url.searchParams.set("garmin", "not-configured")
    return NextResponse.redirect(url)
  }

  try {
    const requestToken = await createGarminRequestToken()
    const response = NextResponse.redirect(getGarminAuthorizeUrl(requestToken.oauthToken))
    setGarminRequestTokenCookies(response, requestToken)
    return response
  } catch (error) {
    const url = new URL("/", getAppBaseUrl())
    url.searchParams.set(
      "garmin",
      error instanceof Error ? error.message : "oauth-start-failed"
    )
    return NextResponse.redirect(url)
  }
}
