import {
  buildOAuthHeader,
  buildSignedOAuthParams,
  GARMIN_OAUTH,
} from "@/lib/garmin/oauth"
import { getCurrentWeekRange, formatDistanceKm } from "@/lib/garmin/week"
import {
  getGarminConsumerKey,
  getGarminConsumerSecret,
  getGarminCallbackUrl,
  isGarminConfigured,
} from "@/lib/garmin/config"

export interface GarminOAuthTokens {
  oauthToken: string
  oauthTokenSecret: string
}

export interface GarminWeeklyDistanceResult {
  distanceKm: number
  distanceLabel: string
  activityCount: number
  weekKey: string
  weekLabel: string
  syncedAt: string
}

function parseOAuthResponse(body: string): Record<string, string> {
  return Object.fromEntries(
    body.split("&").map((part) => {
      const [key, value = ""] = part.split("=")
      return [decodeURIComponent(key), decodeURIComponent(value)]
    })
  )
}

async function signedGarminRequest(
  method: "GET" | "POST",
  url: string,
  tokens?: GarminOAuthTokens,
  extraParams?: Record<string, string>
): Promise<Response> {
  const consumerKey = getGarminConsumerKey()
  const consumerSecret = getGarminConsumerSecret()
  if (!consumerKey || !consumerSecret) {
    throw new Error("Garmin API credentials are not configured")
  }

  const oauthParams = buildSignedOAuthParams({
    method,
    url,
    consumerKey,
    consumerSecret,
    token: tokens?.oauthToken,
    tokenSecret: tokens?.oauthTokenSecret,
    extraParams,
  })

  const headers = {
    Authorization: buildOAuthHeader(oauthParams),
  }

  if (method === "GET" && extraParams) {
    const query = new URLSearchParams(extraParams).toString()
    return fetch(`${url}?${query}`, { headers, cache: "no-store" })
  }

  return fetch(url, { method, headers, cache: "no-store" })
}

export async function createGarminRequestToken(): Promise<GarminOAuthTokens> {
  const params = {
    oauth_callback: getGarminCallbackUrl(),
  }

  const response = await signedGarminRequest(
    "POST",
    GARMIN_OAUTH.requestTokenUrl,
    undefined,
    params
  )

  if (!response.ok) {
    throw new Error(`Garmin request token failed (${response.status})`)
  }

  const parsed = parseOAuthResponse(await response.text())
  if (!parsed.oauth_token || !parsed.oauth_token_secret) {
    throw new Error("Garmin request token response was invalid")
  }

  return {
    oauthToken: parsed.oauth_token,
    oauthTokenSecret: parsed.oauth_token_secret,
  }
}

export function getGarminAuthorizeUrl(requestToken: string): string {
  return `${GARMIN_OAUTH.authorizeUrl}?oauth_token=${encodeURIComponent(requestToken)}`
}

export async function exchangeGarminAccessToken(
  requestToken: string,
  requestTokenSecret: string,
  verifier: string
): Promise<GarminOAuthTokens> {
  const response = await signedGarminRequest(
    "POST",
    GARMIN_OAUTH.accessTokenUrl,
    {
      oauthToken: requestToken,
      oauthTokenSecret: requestTokenSecret,
    },
    { oauth_verifier: verifier }
  )

  if (!response.ok) {
    throw new Error(`Garmin access token failed (${response.status})`)
  }

  const parsed = parseOAuthResponse(await response.text())
  if (!parsed.oauth_token || !parsed.oauth_token_secret) {
    throw new Error("Garmin access token response was invalid")
  }

  return {
    oauthToken: parsed.oauth_token,
    oauthTokenSecret: parsed.oauth_token_secret,
  }
}

interface GarminActivitySummary {
  distanceInMeters?: number
  distance?: number
}

export async function fetchGarminWeeklyDistance(
  tokens: GarminOAuthTokens,
  now = new Date()
): Promise<GarminWeeklyDistanceResult> {
  const week = getCurrentWeekRange(now)
  const startSeconds = Math.floor(week.start.getTime() / 1000)
  const endSeconds = Math.floor(week.end.getTime() / 1000)

  const response = await signedGarminRequest(
    "GET",
    GARMIN_OAUTH.activitiesUrl,
    tokens,
    {
      uploadStartTimeInSeconds: String(startSeconds),
      uploadEndTimeInSeconds: String(endSeconds),
    }
  )

  if (!response.ok) {
    throw new Error(`Garmin activities fetch failed (${response.status})`)
  }

  const activities = (await response.json()) as GarminActivitySummary[]
  const distanceMeters = activities.reduce((sum, activity) => {
    const meters = activity.distanceInMeters ?? activity.distance ?? 0
    return sum + (Number.isFinite(meters) ? meters : 0)
  }, 0)

  const distanceKm = distanceMeters / 1000

  return {
    distanceKm,
    distanceLabel: formatDistanceKm(distanceKm),
    activityCount: activities.length,
    weekKey: week.weekKey,
    weekLabel: week.label,
    syncedAt: new Date().toISOString(),
  }
}

export function getGarminServerStatus() {
  return {
    configured: isGarminConfigured(),
  }
}
