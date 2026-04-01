const INTERNAL_PATH_RE = /^\/(?!\/)/
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const ISO_MONTH_RE = /^\d{4}-\d{2}$/

export function sanitizeInternalRedirect(
  redirect: string | null | undefined,
  fallback = '/admin'
): string {
  if (!redirect) return fallback

  let candidate = redirect.trim()
  if (!candidate) return fallback

  try {
    candidate = decodeURIComponent(candidate)
  } catch {
    return fallback
  }

  if (!INTERNAL_PATH_RE.test(candidate)) return fallback

  return candidate
}

export function getClientIp(headers: Headers): string {
  const candidates = [
    headers.get('cf-connecting-ip'),
    headers.get('x-real-ip'),
    headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
  ]

  for (const candidate of candidates) {
    if (candidate) return candidate
  }

  return 'unknown'
}

export function isIsoDateString(value: string): boolean {
  return ISO_DATE_RE.test(value)
}

export function isIsoMonthString(value: string): boolean {
  return ISO_MONTH_RE.test(value)
}
