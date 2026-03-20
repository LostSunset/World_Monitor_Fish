// LIMITATION: This in-memory rate limiter is NOT effective on Vercel Edge Functions
// because each invocation may run in a different isolate with its own memory.
// For production rate limiting on sensitive endpoints, ALSO use the Upstash Redis-based
// rate limiter from './_rate-limit.js' (checkRateLimit) which persists state across isolates.
export function createIpRateLimiter({ limit, windowMs }) {
  const rateLimitMap = new Map();

  function getEntry(ip) {
    return rateLimitMap.get(ip) || null;
  }

  function isRateLimited(ip) {
    const now = Date.now();
    const entry = getEntry(ip);
    if (!entry || now - entry.windowStart > windowMs) {
      rateLimitMap.set(ip, { windowStart: now, count: 1 });
      return false;
    }
    entry.count += 1;
    return entry.count > limit;
  }

  return { isRateLimited, getEntry };
}
