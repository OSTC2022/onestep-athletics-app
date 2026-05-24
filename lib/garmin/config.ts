export function getGarminConsumerKey(): string | undefined {
  return process.env.GARMIN_CONSUMER_KEY?.trim() || undefined
}

export function getGarminConsumerSecret(): string | undefined {
  return process.env.GARMIN_CONSUMER_SECRET?.trim() || undefined
}

export function isGarminConfigured(): boolean {
  return Boolean(getGarminConsumerKey() && getGarminConsumerSecret())
}

export function getAppBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (configured) return configured.replace(/\/$/, "")
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return "http://localhost:3000"
}

export function getGarminCallbackUrl(): string {
  return `${getAppBaseUrl()}/api/garmin/oauth/callback`
}
