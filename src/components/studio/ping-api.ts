/** A ping unanswered for this long counts as failed, so a blackholed address can't pile requests up. */
export const PING_TIMEOUT_MS = 5_000;

/**
 * How long `{base}/api` took to answer 200 (ms), or null when it didn't within the timeout or `signal` aborted.
 * The studio's own ping: `pingApiBase` in lib/data-api.ts is the kiosk's and takes neither.
 */
export async function pingApi(base: string, signal?: AbortSignal, timeoutMs: number = PING_TIMEOUT_MS): Promise<number | null> {
  const start = performance.now();
  const guard = new AbortController();
  const timer = setTimeout(() => guard.abort(), timeoutMs);
  const onAbort = () => guard.abort();
  signal?.addEventListener("abort", onAbort);
  try {
    const res = await fetch(`${base}/api`, { cache: "no-store", signal: guard.signal });
    return res.status === 200 ? Math.round(performance.now() - start) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}
