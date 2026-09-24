// In-memory limiter: fine for one server instance. On serverless/multi-instance
// deployments swap this for Upstash Redis or similar.
const hits = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, max = 10, windowMs = 60_000) {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  h.count += 1;
  return h.count <= max;
}

export const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
