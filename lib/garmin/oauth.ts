import crypto from "crypto"

const OAUTH_VERSION = "1.0"
const OAUTH_SIGNATURE_METHOD = "HMAC-SHA1"

function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  )
}

function buildParameterString(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join("&")
}

export function createOAuthNonce(): string {
  return crypto.randomBytes(16).toString("hex")
}

export function createOAuthTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString()
}

export function signOAuthRequest(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret = ""
): string {
  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(buildParameterString(params)),
  ].join("&")

  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`
  return crypto.createHmac("sha1", signingKey).update(baseString).digest("base64")
}

export function buildOAuthHeader(
  params: Record<string, string>
): string {
  const entries = Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}="${percentEncode(params[key])}"`)
  return `OAuth ${entries.join(", ")}`
}

export function buildSignedOAuthParams(options: {
  method: string
  url: string
  consumerKey: string
  consumerSecret: string
  token?: string
  tokenSecret?: string
  extraParams?: Record<string, string>
}): Record<string, string> {
  const params: Record<string, string> = {
    oauth_consumer_key: options.consumerKey,
    oauth_nonce: createOAuthNonce(),
    oauth_signature_method: OAUTH_SIGNATURE_METHOD,
    oauth_timestamp: createOAuthTimestamp(),
    oauth_version: OAUTH_VERSION,
    ...options.extraParams,
  }

  if (options.token) {
    params.oauth_token = options.token
  }

  params.oauth_signature = signOAuthRequest(
    options.method,
    options.url,
    params,
    options.consumerSecret,
    options.tokenSecret ?? ""
  )

  return params
}

export const GARMIN_OAUTH = {
  requestTokenUrl:
    "https://connectapi.garmin.com/oauth-service/oauth/request_token",
  authorizeUrl: "https://connect.garmin.com/oauthConfirm",
  accessTokenUrl:
    "https://connectapi.garmin.com/oauth-service/oauth/access_token",
  activitiesUrl: "https://apis.garmin.com/wellness-api/rest/activities",
} as const
