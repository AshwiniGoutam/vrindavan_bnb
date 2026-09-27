import "server-only";
import { createHmac } from "node:crypto";
import { ChannelManagerError } from "../channel-manager/types";
import { ezeeConfig, isEzeeConfigured } from "./config";

/**
 * Low-level HTTP client. Authentication scheme is a placeholder (API key + HMAC of the body)
 * and must be aligned with eZee's documentation before go-live. Every eZee call goes through here,
 * so timeouts, retries and logging live in one place.
 */
export async function ezeeRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
  if (!isEzeeConfigured()) throw new ChannelManagerError("eZee is not configured (EZEE_API_URL / EZEE_API_KEY / EZEE_HOTEL_CODE).", false);
  const cfg = ezeeConfig();
  const payload = JSON.stringify({ hotelCode: cfg.hotelCode, ...body });
  const signature = cfg.apiSecret ? createHmac("sha256", cfg.apiSecret).update(payload).digest("hex") : undefined;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const res = await fetch(`${cfg.baseUrl!.replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": cfg.apiKey!,
        ...(signature ? { "X-Signature": signature } : {}),
      },
      body: payload,
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) throw new ChannelManagerError(`eZee ${path} failed (${res.status}): ${text.slice(0, 300)}`, res.status >= 500 || res.status === 429);
    return (text ? JSON.parse(text) : {}) as T;
  } catch (e) {
    if (e instanceof ChannelManagerError) throw e;
    throw new ChannelManagerError(`eZee ${path} request error: ${(e as Error).message}`, true, e);
  } finally {
    clearTimeout(timer);
  }
}
