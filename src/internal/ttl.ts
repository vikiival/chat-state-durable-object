export function computeExpiry(ttlMs: number | null | undefined, now: number): number | null {
  if (ttlMs == null || ttlMs <= 0) {
    return null
  }

  return now + ttlMs
}

export function isExpired(expiresAt: number | null | undefined, now: number): boolean {
  return expiresAt != null && expiresAt <= now
}
