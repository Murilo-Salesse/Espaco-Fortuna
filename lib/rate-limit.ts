import { supabaseAdmin } from './supabase'

type ConsumeRateLimitOptions = {
  namespace: string
  identifier: string
  limit: number
  windowSeconds: number
  blockSeconds?: number
}

type RateLimitRecord = {
  count: number
  windowStartedAt: number
  blockedUntil: number
}

type ConsumeRateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfter: number
}

const memoryFallback = new Map<string, RateLimitRecord>()

function consumeRateLimitInMemory({
  namespace,
  identifier,
  limit,
  windowSeconds,
  blockSeconds = windowSeconds,
}: ConsumeRateLimitOptions): ConsumeRateLimitResult {
  const key = `${namespace}:${identifier}`
  const now = Date.now()
  const current = memoryFallback.get(key)

  if (current?.blockedUntil && current.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((current.blockedUntil - now) / 1000),
    }
  }

  if (!current || current.windowStartedAt + windowSeconds * 1000 <= now) {
    memoryFallback.set(key, {
      count: 1,
      windowStartedAt: now,
      blockedUntil: 0,
    })

    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      retryAfter: 0,
    }
  }

  const nextCount = current.count + 1
  const nextBlockedUntil = nextCount > limit ? now + blockSeconds * 1000 : 0

  memoryFallback.set(key, {
    ...current,
    count: nextCount,
    blockedUntil: nextBlockedUntil,
  })

  return {
    allowed: nextCount <= limit,
    remaining: Math.max(0, limit - nextCount),
    retryAfter: nextBlockedUntil ? Math.ceil((nextBlockedUntil - now) / 1000) : 0,
  }
}

export async function consumeRateLimit(
  options: ConsumeRateLimitOptions
): Promise<ConsumeRateLimitResult> {
  const {
    namespace,
    identifier,
    limit,
    windowSeconds,
    blockSeconds = windowSeconds,
  } = options

  const key = `${namespace}:${identifier}`

  const { data, error } = await supabaseAdmin.rpc('consume_rate_limit', {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
    p_block_seconds: blockSeconds,
  })

  if (!error && data) {
    const row = Array.isArray(data) ? data[0] : data

    if (row) {
      return {
        allowed: Boolean(row.allowed),
        remaining: Number(row.remaining ?? 0),
        retryAfter: Number(row.retry_after ?? 0),
      }
    }
  }

  return consumeRateLimitInMemory(options)
}
