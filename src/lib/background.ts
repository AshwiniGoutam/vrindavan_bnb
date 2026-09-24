import { after } from "next/server";

/** Run work after the response is sent (Next's after()); falls back to fire-and-forget outside a request. */
export function background(fn: () => Promise<unknown>) {
  const run = () => fn().catch((e) => console.error("[background]", e));
  try { after(run); } catch { void run(); }
}
