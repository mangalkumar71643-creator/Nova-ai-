// Fixed one-minute windows per client, kept in memory. On Vercel every running
// instance keeps its own counts, so this is a speed bump against one client
// hammering the model (and your GPU bill), not an exact quota.
export function createRateLimiter(limit, windowMs = 60_000) {
  const hits = new Map();

  /** Returns true if this client may make another request now. */
  return (key, now = Date.now()) => {
    if (!limit) return true;
    const entry = hits.get(key);
    if (!entry || now - entry.start >= windowMs) {
      if (hits.size > 10_000) hits.clear(); // stop memory growing without bound
      hits.set(key, { start: now, count: 1 });
      return true;
    }
    entry.count += 1;
    return entry.count <= limit;
  };
}

/** Client IP as reported by the hosting proxy (Vercel sets these), else the socket address. */
export function clientIp(req) {
  const forwarded = req.headers['x-real-ip'] ?? req.headers['x-forwarded-for']?.split(',')[0];
  return (forwarded ?? req.socket?.remoteAddress ?? 'unknown').trim();
}
