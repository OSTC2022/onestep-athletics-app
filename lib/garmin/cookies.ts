import type { NextResponse } from "next/server"

export const GARMIN_TOKEN_COOKIE = "garmin_oauth_token"
export const GARMIN_TOKEN_SECRET_COOKIE = "garmin_oauth_token_secret"
export const GARMIN_REQUEST_TOKEN_COOKIE = "garmin_request_token"
export const GARMIN_REQUEST_TOKEN_SECRET_COOKIE = "garmin_request_token_secret"

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export interface GarminCookieTokens {
  oauthToken: string
  oauthTokenSecret: string
}

export function setGarminAccessTokenCookies(
  response: NextResponse,
  tokens: GarminCookieTokens
): void {
  response.cookies.set(GARMIN_TOKEN_COOKIE, tokens.oauthToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  })
  response.cookies.set(GARMIN_TOKEN_SECRET_COOKIE, tokens.oauthTokenSecret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  })
}

export function setGarminRequestTokenCookies(
  response: NextResponse,
  tokens: GarminCookieTokens
): void {
  response.cookies.set(GARMIN_REQUEST_TOKEN_COOKIE, tokens.oauthToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  })
  response.cookies.set(
    GARMIN_REQUEST_TOKEN_SECRET_COOKIE,
    tokens.oauthTokenSecret,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    }
  )
}

export function clearGarminCookies(response: NextResponse): void {
  for (const name of [
    GARMIN_TOKEN_COOKIE,
    GARMIN_TOKEN_SECRET_COOKIE,
    GARMIN_REQUEST_TOKEN_COOKIE,
    GARMIN_REQUEST_TOKEN_SECRET_COOKIE,
  ]) {
    response.cookies.set(name, "", { path: "/", maxAge: 0 })
  }
}

export function readGarminAccessTokens(
  cookieStore: Awaited<ReturnType<typeof import("next/headers").cookies>>
): GarminCookieTokens | null {
  const oauthToken = cookieStore.get(GARMIN_TOKEN_COOKIE)?.value
  const oauthTokenSecret = cookieStore.get(GARMIN_TOKEN_SECRET_COOKIE)?.value
  if (!oauthToken || !oauthTokenSecret) return null
  return { oauthToken, oauthTokenSecret }
}

export function readGarminRequestTokens(
  cookieStore: Awaited<ReturnType<typeof import("next/headers").cookies>>
): GarminCookieTokens | null {
  const oauthToken = cookieStore.get(GARMIN_REQUEST_TOKEN_COOKIE)?.value
  const oauthTokenSecret = cookieStore.get(
    GARMIN_REQUEST_TOKEN_SECRET_COOKIE
  )?.value
  if (!oauthToken || !oauthTokenSecret) return null
  return { oauthToken, oauthTokenSecret }
}
